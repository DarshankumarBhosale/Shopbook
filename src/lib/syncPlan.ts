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
 * corrected. All are small — a few hundred rows at most — so they are pushed
 * whole rather than tracked with an outbox, which is one less thing to get
 * wrong.
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
  highWaterMark: number
): Row[] {
  if (!isAppendOnly(table)) return rows;

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
  remote: { updatedAt?: string }
): MergeDecision {
  if (!local) return 'take-remote';
  if (isAppendOnly(table)) return 'keep-local';

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
  localById: Map<number, { updatedAt?: string }>
): { toWrite: Row[]; skipped: number } {
  const toWrite: Row[] = [];
  let skipped = 0;

  for (const remote of remoteRows) {
    if (typeof remote.id !== 'number') { skipped++; continue; }

    const decision = mergeDecision(table, localById.get(remote.id), remote);
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
 * The cursor for the next pull.
 *
 * Rewound by a second so a row written in the same second as the last one
 * pulled is not skipped. Re-fetching a row is harmless; missing one is not.
 */
export function nextPullCursor(rows: { updatedAt?: string }[], previous: string): string {
  let newest = previous;
  for (const r of rows) {
    if (r.updatedAt && r.updatedAt > newest) newest = r.updatedAt;
  }
  if (newest === previous) return previous;

  const t = new Date(newest).getTime();
  return Number.isFinite(t) ? new Date(t - 1000).toISOString() : previous;
}
