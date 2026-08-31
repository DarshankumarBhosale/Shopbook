/**
 * What to send, what to keep, and who wins — the decisions sync makes.
 *
 * Kept pure and separate from the network so the rules that can quietly lose a
 * sale are testable without a server.
 */

/** Tables that only ever gain rows. Once written, a row never changes. */
export const APPEND_ONLY_TABLES = [
  'sales', 'saleLines', 'stockMoves', 'payments', 'auditLog',
] as const;

/**
 * Tables whose rows get edited: prices change, a day closes, an expense is
 * corrected. Which of them to send is decided by comparing contents against
 * what this device last agreed with the server, rather than by an outbox that
 * every write site would have to remember to update.
 */
export const MUTABLE_TABLES = [
  'shops', 'dayBook', 'items', 'rawMaterials', 'recipes', 'expenses', 'customers',
] as const;

export type SyncTable =
  | (typeof APPEND_ONLY_TABLES)[number]
  | (typeof MUTABLE_TABLES)[number];

export const SYNC_TABLES: SyncTable[] = [...MUTABLE_TABLES, ...APPEND_ONLY_TABLES];

export function isAppendOnly(table: SyncTable): boolean {
  return (APPEND_ONLY_TABLES as readonly string[]).includes(table);
}

/** Push order matters: a sale line is meaningless until its sale exists. */
export const PUSH_ORDER: SyncTable[] = [
  'shops', 'dayBook', 'customers', 'items', 'rawMaterials', 'recipes',
  'sales', 'saleLines', 'stockMoves', 'expenses', 'payments', 'auditLog',
];

export interface Row {
  id?: number;
  [key: string]: unknown;
}

/**
 * Which of this device's rows still need sending.
 *
 * Append-only tables are filtered by ID: this device's IDs climb within its own
 * block, so anything above the high-water mark is new. Rows minted by the other
 * device are never pushed back — they came from the server already, and
 * echoing them would fight whatever it has since done to them.
 */
export function rowsToPush(
  table: SyncTable,
  rows: Row[],
  deviceNo: number,
  deviceBlock: number,
  highWaterMark: number,
  sent?: SentMap
): Row[] {
  // Mutable rows are sent when their contents differ from what this device last
  // agreed with the server, which is the only way to tell an edit made here
  // from a copy that merely arrived here.
  if (!isAppendOnly(table)) return sent ? changedRows(rows, sent) : rows;

  const from = deviceNo * deviceBlock;
  const to = from + deviceBlock - 1;

  return rows.filter((r) => {
    const id = r.id;
    if (typeof id !== 'number') return false;
    // Seeded rows sit below every device block and are identical on both
    // phones, so they only need sending once.
    if (id < deviceBlock) return id > highWaterMark;
    if (id < from || id > to) return false;
    return id > highWaterMark;
  });
}

/** The new high-water mark after a successful push. */
export function advanceHighWater(previous: number, pushed: Row[]): number {
  return pushed.reduce(
    (max, r) => (typeof r.id === 'number' && r.id > max ? r.id : max),
    previous
  );
}

export type MergeDecision = 'take-remote' | 'keep-local';

/**
 * Whether an incoming row should replace the local one.
 *
 * Append-only rows are immutable, so a local copy is already correct and is
 * kept — re-writing it would only churn. For everything else the newer
 * `updatedAt` wins, and that timestamp is set by the database rather than the
 * phone, so a device with a wrong clock cannot win an argument it should lose.
 * Ties keep the local row: doing nothing is the safer half of a coin flip.
 */
export function mergeDecision(
  table: SyncTable,
  local: { updatedAt?: string } | undefined,
  remote: { updatedAt?: string },
  localHasUnsentEdit = false
): MergeDecision {
  if (!local) return 'take-remote';
  if (isAppendOnly(table)) return 'keep-local';

  // A local row carries no `updatedAt` — it is stripped before storing — so
  // there is nothing to compare and remote would otherwise always win. An edit
  // this device has not managed to send yet has to survive: push runs before
  // pull, so the only way to be here is that the push failed, and reverting the
  // shopkeeper's correction because the signal dropped is not acceptable. It
  // goes up on the next sync.
  if (localHasUnsentEdit) return 'keep-local';

  const localAt = local.updatedAt ?? '';
  const remoteAt = remote.updatedAt ?? '';
  return remoteAt > localAt ? 'take-remote' : 'keep-local';
}

/**
 * Splits incoming rows into those to write and those to ignore.
 * `updatedAt` is a server column and is stripped before the row is stored, so
 * it never leaks into the app's own types.
 */
export function planMerge<T extends Row & { updatedAt?: string }>(
  table: SyncTable,
  remoteRows: T[],
  localById: Map<number, Row & { updatedAt?: string }>,
  /** What this device last agreed with the server, to spot unsent local edits. */
  sent: SentMap = {}
): { toWrite: Row[]; skipped: number } {
  const toWrite: Row[] = [];
  let skipped = 0;

  for (const remote of remoteRows) {
    if (typeof remote.id !== 'number') { skipped++; continue; }

    const local = localById.get(remote.id);
    const unsent =
      local !== undefined &&
      Object.keys(sent).length > 0 &&
      sent[String(remote.id)] !== rowFingerprint(local as Row);

    const decision = mergeDecision(table, local, remote, unsent);
    if (decision === 'take-remote') {
      const { updatedAt: _ignored, ...rest } = remote;
      void _ignored;
      toWrite.push(rest as Row);
    } else {
      skipped++;
    }
  }

  return { toWrite, skipped };
}

/**
 * The cursor for the next pull: the newest timestamp seen, exactly.
 *
 * This used to rewind a second, meaning to guard against a row written in the
 * same instant as the last one pulled being skipped. It did that by
 * re-downloading the most recent second of rows on every single sync, forever —
 * the counter never once read "up to date", and a phone on a weak connection
 * paid for the same rows again and again.
 *
 * The real hazard it was reaching for is narrower: `now()` is the transaction's
 * start time, so every row written in one statement shares an identical
 * timestamp, and a page boundary landing inside that group would skip the rest.
 * That is handled by paging until a page comes back short, which is where it
 * belongs — see the pull loop.
 */
export function nextPullCursor(rows: { updatedAt?: string }[], previous: string): string {
  let newest = previous;
  for (const r of rows) {
    if (r.updatedAt && r.updatedAt > newest) newest = r.updatedAt;
  }
  return newest;
}

/**
 * A short, stable fingerprint of a row's contents.
 *
 * Keys are sorted so two equal rows hash the same whatever order Dexie happens
 * to return their properties in.
 */
export function rowFingerprint(row: Row): string {
  const keys = Object.keys(row).filter((k) => k !== 'updatedAt').sort();
  const canonical = keys.map((k) => `${k}=${JSON.stringify(row[k])}`).join('');

  // djb2, base36. A collision only costs a missed push of a same-shaped edit,
  // and the next edit re-sends it, so 32 bits is enough here.
  let hash = 5381;
  for (let i = 0; i < canonical.length; i++) {
    hash = (hash * 33 + canonical.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export type SentMap = Record<string, string>;

/**
 * Which mutable rows this device actually needs to send.
 *
 * A row is sent only when its contents differ from what this device last put on
 * the server — whether by pushing it, or by receiving it in a pull. Without
 * this, a device would push back its stale copy of a row the other phone had
 * since edited, stamping it newer and silently reverting that phone's work.
 * That is a real way to lose an expense correction, so the fingerprint earns
 * its keep.
 */
export function changedRows(rows: Row[], sent: SentMap): Row[] {
  return rows.filter((row) => {
    if (typeof row.id !== 'number') return false;
    return sent[String(row.id)] !== rowFingerprint(row);
  });
}

/** Records rows as now matching the server. */
export function updateSentMap(sent: SentMap, rows: Row[]): SentMap {
  const next: SentMap = { ...sent };
  for (const row of rows) {
    if (typeof row.id === 'number') next[String(row.id)] = rowFingerprint(row);
  }
  return next;
}

/**
 * Makes every row in a batch carry the same keys.
 *
 * PostgREST rejects a bulk upsert outright when the objects differ in shape —
 * "all object keys must match" — and our rows legitimately differ: a sale may
 * or may not have a note, an expense may or may not name a customer. Left
 * alone, one optional field would fail a whole batch of sales, and the day's
 * takings would sit unsynced behind a cryptic message.
 *
 * Missing keys become null rather than being dropped, so clearing a field on
 * one device actually clears it on the other instead of silently keeping the
 * old value.
 */
export function normalizeBatch(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (v !== undefined) keys.add(k);
    }
  }

  return rows.map((row) => {
    const out: Row = {};
    for (const key of keys) {
      const value = row[key];
      out[key] = value === undefined ? null : value;
    }
    return out;
  });
}
