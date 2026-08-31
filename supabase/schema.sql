-- ShopBook — cloud schema for two-device sync.
--
-- Run this once in the Supabase SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run).
--
-- Two deliberate choices worth knowing about:
--
-- 1. Columns are quoted camelCase so they match the app's field names exactly.
--    The usual Postgres style is snake_case, but that would need a translation
--    layer on every read and write, and a single mistyped mapping there would
--    silently move money between the wrong columns.
--
-- 2. Every table has row level security ON and every policy requires a signed-in
--    user. The publishable key ships inside the APK and sits in a public repo,
--    so it has to be worthless on its own — the password is what protects the
--    books.

-- ─────────────────────────── tables ───────────────────────────
-- `id` is globally unique across devices: each phone allocates from its own
-- numeric range, so two phones can both create sales offline and the rows
-- never collide when they meet.
-- `updatedAt` drives last-write-wins for the few records that get edited.

create table if not exists shops (
  id          bigint primary key,
  name        text not null,
  address     text,
  "weeklyOff" text,
  "updatedAt" timestamptz not null default now()
);

create table if not exists "dayBook" (
  id                    bigint primary key,
  date                  text not null,
  "openingCash"         bigint not null default 0,
  "closingCashExpected" bigint not null default 0,
  "closingCashCounted"  bigint not null default 0,
  variance              bigint not null default 0,
  note                  text,
  status                text not null,
  "closedAt"            text,
  "grossSales"          bigint,
  "totalCogs"           bigint,
  "totalExpenses"       bigint,
  "updatedAt"           timestamptz not null default now()
);

create table if not exists items (
  id                 bigint primary key,
  name               text not null,
  category           text,
  "sellPriceCounter" bigint not null default 0,
  "sellPriceOnline"  bigint not null default 0,
  "sortOrder"        integer not null default 0,
  "isActive"         boolean not null default true,
  "isArchived"       boolean not null default false,
  "updatedAt"        timestamptz not null default now()
);

create table if not exists "rawMaterials" (
  id             bigint primary key,
  name           text not null,
  unit           text not null,
  category       text,
  "avgCost"      bigint not null default 0,
  "reorderLevel" double precision not null default 0,
  "isArchived"   boolean not null default false,
  "updatedAt"    timestamptz not null default now()
);

create table if not exists recipes (
  id              bigint primary key,
  "itemId"        bigint not null,
  "rawMaterialId" bigint not null,
  "qtyPerUnit"    double precision not null,
  "updatedAt"     timestamptz not null default now()
);

create table if not exists sales (
  id               bigint primary key,
  "dayId"          bigint not null,
  channel          text not null,
  "orderRef"       text,
  "grossAmount"    bigint not null default 0,
  "commissionAmt"  bigint not null default 0,
  "netAmount"      bigint not null default 0,
  cogs             bigint not null default 0,
  "paymentMode"    text not null,
  "customerId"     bigint,
  "createdBy"      text,
  "createdAt"      text not null,
  "reversesSaleId" bigint,
  "reversalReason" text,
  "updatedAt"      timestamptz not null default now()
);

create table if not exists "saleLines" (
  id          bigint primary key,
  "saleId"    bigint not null,
  "itemId"    bigint not null,
  qty         double precision not null,
  rate        bigint not null,
  amount      bigint not null,
  "updatedAt" timestamptz not null default now()
);

create table if not exists "stockMoves" (
  id          bigint primary key,
  "dayId"     bigint,
  "rmId"      bigint not null,
  type        text not null,
  qty         double precision not null,
  rate        bigint,
  reason      text,
  "createdAt" text not null,
  "updatedAt" timestamptz not null default now()
);

create table if not exists expenses (
  id            bigint primary key,
  "dayId"       bigint not null,
  category      text not null,
  amount        bigint not null default 0,
  "paymentMode" text not null,
  note          text,
  "isDeleted"   boolean not null default false,
  "updatedAt"   timestamptz not null default now()
);

create table if not exists customers (
  id          bigint primary key,
  name        text not null,
  phone       text,
  "updatedAt" timestamptz not null default now()
);

create table if not exists payments (
  id            bigint primary key,
  "dayId"       bigint not null,
  "customerId"  bigint not null,
  amount        bigint not null default 0,
  "paymentMode" text not null,
  note          text,
  "createdAt"   text not null,
  "updatedAt"   timestamptz not null default now()
);

create table if not exists "auditLog" (
  id          bigint primary key,
  "dayId"     bigint,
  "userId"    bigint,
  action      text not null,
  detail      text,
  "createdAt" text not null,
  "updatedAt" timestamptz not null default now()
);

-- Pulling only what changed since the last sync keeps a day's catch-up small.
create index if not exists sales_updated_idx       on sales ("updatedAt");
create index if not exists sale_lines_updated_idx  on "saleLines" ("updatedAt");
create index if not exists stock_moves_updated_idx on "stockMoves" ("updatedAt");
create index if not exists expenses_updated_idx    on expenses ("updatedAt");
create index if not exists payments_updated_idx    on payments ("updatedAt");
create index if not exists day_book_updated_idx    on "dayBook" ("updatedAt");
create index if not exists items_updated_idx       on items ("updatedAt");
create index if not exists raw_materials_updated_idx on "rawMaterials" ("updatedAt");
create index if not exists recipes_updated_idx     on recipes ("updatedAt");
create index if not exists customers_updated_idx   on customers ("updatedAt");
create index if not exists audit_log_updated_idx   on "auditLog" ("updatedAt");

-- `updatedAt` has to be set by the database, not the client: two phones with
-- clocks a few minutes apart would otherwise resolve conflicts by whose clock
-- was fastest rather than by what actually happened last.
-- `search_path` is pinned. Without it the function resolves names against
-- whatever search path the caller happens to have, which is the standard
-- warning Supabase's own linter raises against a function like this.
create or replace function touch_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new."updatedAt" = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'shops','dayBook','items','rawMaterials','recipes','sales',
    'saleLines','stockMoves','expenses','customers','payments','auditLog'
  ] loop
    -- The trigger name is built first and quoted as a whole. Writing
    -- `touch_%I` instead glues a bare prefix onto a quoted identifier —
    -- touch_"dayBook" — which Postgres rejects outright.
    execute format('drop trigger if exists %I on %I', 'touch_' || t, t);
    execute format(
      'create trigger %I before insert or update on %I
       for each row execute function touch_updated_at()', 'touch_' || t, t);
  end loop;
end $$;

-- ──────────────────── who is allowed in ────────────────────
-- Being signed in is not enough on its own.
--
-- Supabase projects allow public sign-up by default, and this project's URL
-- sits in a public repository alongside the publishable key. "Any signed-in
-- user" would therefore mean: anyone at all who signs up and confirms their
-- own email gets full read and write over the shop's books.
--
-- So access is an explicit list of enrolled devices. A stranger who signs up
-- gets an account and nothing else.
create table if not exists "appUsers" (
  id          uuid primary key,   -- matches auth.users.id
  label       text not null,
  "updatedAt" timestamptz not null default now()
);

alter table "appUsers" enable row level security;

-- Readable so a phone can tell whether it is enrolled; there is deliberately
-- no insert, update or delete policy, so it cannot be changed through the API
-- at all — only from the dashboard or a migration.
drop policy if exists "enrolled can read the list" on "appUsers";
create policy "enrolled can read the list" on "appUsers"
  for select to authenticated using (true);

-- ──────────────────── row level security ────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'shops','dayBook','items','rawMaterials','recipes','sales',
    'saleLines','stockMoves','expenses','customers','payments','auditLog'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "signed in full access" on %I', t);
    execute format('drop policy if exists "enrolled devices only" on %I', t);
    execute format(
      'create policy "enrolled devices only" on %I
       for all to authenticated
       using      (exists (select 1 from "appUsers" u where u.id = (select auth.uid())))
       with check (exists (select 1 from "appUsers" u where u.id = (select auth.uid())))', t);
  end loop;
end $$;

-- Live updates: the other phone's sales appear without waiting for a poll.
--
-- Supabase creates the `supabase_realtime` publication itself, but if it is
-- ever missing this would fail at the very last step and take the whole script
-- with it — after the tables were already right. Create it rather than die.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array[
    'dayBook','items','rawMaterials','recipes','sales','saleLines',
    'stockMoves','expenses','customers','payments'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    -- Already published: re-running the script must stay harmless.
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
