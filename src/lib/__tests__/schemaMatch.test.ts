import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SYNC_TABLES } from '../syncPlan';

/**
 * Keeps the cloud schema honest against the app's own types.
 *
 * A field added to an interface but not to `schema.sql` does not fail the
 * build, the typecheck, or any other test — it fails at push time, on the
 * counter, mid-service, with a PostgREST message about an unknown column, and
 * the day's takings sit unsynced until someone reads it. Cheap to catch here.
 */

const root = resolve(__dirname, '../../..');
const sql = readFileSync(resolve(root, 'supabase/schema.sql'), 'utf8');
const types = readFileSync(resolve(root, 'src/db/types.ts'), 'utf8');

/** The TypeScript interface backing each synced table. */
const INTERFACE_FOR: Record<string, string> = {
  shops: 'Shop',
  dayBook: 'DayBook',
  items: 'Item',
  rawMaterials: 'RawMaterial',
  recipes: 'Recipe',
  sales: 'Sale',
  saleLines: 'SaleLine',
  stockMoves: 'StockMove',
  expenses: 'Expense',
  customers: 'Customer',
  payments: 'Payment',
  auditLog: 'AuditLogEntry',
};

function columnsOf(table: string): Set<string> {
  const pattern = new RegExp(
    `create table if not exists "?${table}"?\\s*\\(([\\s\\S]*?)\\n\\);`,
    'i'
  );
  const body = sql.match(pattern)?.[1];
  if (!body) return new Set();

  const columns = new Set<string>();
  for (const line of body.split('\n')) {
    const name = line.trim().match(/^"([A-Za-z0-9_]+)"|^([a-z][A-Za-z0-9_]*)\s+\w/);
    const found = name?.[1] ?? name?.[2];
    // Skip table-level constraints, which are not columns.
    if (found && !['primary', 'foreign', 'unique', 'check', 'constraint'].includes(found)) {
      columns.add(found);
    }
  }
  return columns;
}

function fieldsOf(interfaceName: string): string[] {
  const body = types.match(
    new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`)
  )?.[1];
  if (!body) return [];

  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'))
    .map((line) => line.match(/^([A-Za-z0-9_]+)\??\s*:/)?.[1])
    .filter((name): name is string => Boolean(name));
}

/**
 * The table names in the `foreach t in array array[…]` block whose body
 * contains `marker`. The schema applies triggers, RLS and realtime by looping
 * over these lists rather than naming each table, so the list is the thing
 * worth checking.
 */
function loopArray(marker: string): string[] {
  for (const block of sql.split('do $$')) {
    if (!block.includes(marker)) continue;
    const list = block.match(/array\[([\s\S]*?)\]/)?.[1];
    if (list) return [...list.matchAll(/'([A-Za-z0-9_]+)'/g)].map((m) => m[1]);
  }
  return [];
}

describe('the cloud schema matches the app types', () => {
  it('names an interface for every synced table', () => {
    for (const table of SYNC_TABLES) {
      expect(INTERFACE_FOR[table], `no interface mapped for ${table}`).toBeDefined();
    }
  });

  it.each(SYNC_TABLES)('%s has a column for every field', (table) => {
    const columns = columnsOf(table);
    expect(columns.size, `no create table found for ${table}`).toBeGreaterThan(0);

    const missing = fieldsOf(INTERFACE_FOR[table]).filter((f) => !columns.has(f));
    expect(missing, `${table} is missing columns for: ${missing.join(', ')}`).toEqual([]);
  });

  it.each(SYNC_TABLES)('%s carries the server timestamp conflicts are judged by', (table) => {
    expect(columnsOf(table).has('updatedAt')).toBe(true);
  });

  it('sets updatedAt from the database on every synced table', () => {
    // A phone with a wrong clock must not win an argument it should lose, so
    // the timestamp is written server-side — by a trigger applied from a list.
    // A table added to the schema but left off that list would silently keep
    // whatever timestamp it was created with and never lose a merge again.
    const applied = loopArray('create trigger');
    for (const table of SYNC_TABLES) {
      expect(applied, `${table} gets no updatedAt trigger`).toContain(table);
    }
  });

  it('turns on row level security for every synced table', () => {
    // Missed off this list, a table is readable and writable by anyone holding
    // the publishable key — which ships inside the app.
    const secured = loopArray('enable row level security');
    for (const table of SYNC_TABLES) {
      expect(secured, `${table} is left without row level security`).toContain(table);
    }
  });

  it('publishes the tables that need to appear on the other phone at once', () => {
    const live = loopArray('supabase_realtime add table');
    for (const table of ['sales', 'saleLines', 'expenses', 'stockMoves', 'payments', 'dayBook']) {
      expect(live, `${table} will not arrive live`).toContain(table);
    }
  });

  it('never glues text onto a quoted identifier placeholder', () => {
    // `format('... touch_%I ...', t)` expands to touch_"dayBook" — a bare
    // prefix against a quoted identifier, which Postgres rejects. Nothing
    // catches it until the whole script fails on the first table, so the
    // identifier has to be built before it is quoted: format('%I', 'touch_' || t).
    // Comments explain the trap and contain the bad form on purpose.
    const code = sql.replace(/--[^\n]*/g, '');

    const glued = [...code.matchAll(/(\S)%I|%I(\w)/g)]
      .filter((m) => {
        const before = m[1];
        // A placeholder may legitimately follow a quote or an opening bracket.
        return before ? !["'", '(', '"'].includes(before) : true;
      })
      .map((m) => m[0]);

    expect(glued, `identifier placeholders glued to text: ${glued.join(', ')}`).toEqual([]);
  });

  it('leaves the meta table out — it is this phone identity, not the shop books', () => {
    expect(sql).not.toMatch(/create table if not exists "?meta"?/i);
    expect(SYNC_TABLES).not.toContain('meta' as never);
  });
});
