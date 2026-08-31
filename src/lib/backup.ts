import type {
  Shop, User, DayBook, Item, RawMaterial, Recipe,
  Sale, SaleLine, StockMove, Expense, Customer, Payment, AuditLogEntry,
} from '../db/types';

/** Bumped only when the file layout changes in a way older readers can't handle. */
export const BACKUP_FORMAT = 1;

/** Every table that carries shop data. Masters are included so a restore onto a
 *  blank phone rebuilds the menu and recipes too, not just the transactions. */
export interface BackupTables {
  shops: Shop[];
  users: User[];
  dayBook: DayBook[];
  items: Item[];
  rawMaterials: RawMaterial[];
  recipes: Recipe[];
  sales: Sale[];
  saleLines: SaleLine[];
  stockMoves: StockMove[];
  expenses: Expense[];
  customers: Customer[];
  payments: Payment[];
  auditLog: AuditLogEntry[];
}

export interface BackupFile {
  app: 'shopbook';
  format: number;
  schemaVersion: number;
  exportedAt: string;
  deviceLabel: string;
  counts: Record<string, number>;
  tables: BackupTables;
}

export const BACKUP_TABLE_NAMES: (keyof BackupTables)[] = [
  'shops', 'users', 'dayBook', 'items', 'rawMaterials', 'recipes',
  'sales', 'saleLines', 'stockMoves', 'expenses', 'customers',
  'payments', 'auditLog',
];

/**
 * Pure function: wraps the tables in a self-describing envelope.
 *
 * The counts are written alongside the data so a restore can be checked against
 * what the export claimed — a truncated file is otherwise indistinguishable
 * from a small shop.
 */
export function buildBackup(
  tables: BackupTables,
  schemaVersion: number,
  deviceLabel: string,
  now: Date = new Date()
): BackupFile {
  const counts: Record<string, number> = {};
  for (const name of BACKUP_TABLE_NAMES) {
    counts[name] = tables[name]?.length ?? 0;
  }

  return {
    app: 'shopbook',
    format: BACKUP_FORMAT,
    schemaVersion,
    exportedAt: now.toISOString(),
    deviceLabel,
    counts,
    tables,
  };
}

export type BackupCheck =
  | { ok: true; file: BackupFile }
  | { ok: false; error: string };

/**
 * Pure function: is this actually a ShopBook backup, and is it intact?
 *
 * Restoring replaces the whole database, so a wrong or damaged file has to be
 * rejected before anything is written — not discovered halfway through.
 */
export function checkBackup(raw: unknown, appSchemaVersion?: number): BackupCheck {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'That file is not a ShopBook backup' };
  }

  const f = raw as Partial<BackupFile>;

  if (f.app !== 'shopbook') {
    return { ok: false, error: 'That file is not a ShopBook backup' };
  }
  if (typeof f.format !== 'number' || f.format > BACKUP_FORMAT) {
    return {
      ok: false,
      error: 'That backup was made by a newer version of ShopBook',
    };
  }
  // `format` above covers the file's own layout. This covers the shape of the
  // rows inside it, which is set by the database version — the two move
  // independently. Restoring rows from a newer database into an older app
  // writes fields it does not understand and skips migrations it never ran,
  // and the damage is silent. It is a realistic case, too: the handbook tells
  // you to restore onto a new phone, and the other phone may not be updated.
  if (
    appSchemaVersion !== undefined &&
    typeof f.schemaVersion === 'number' &&
    f.schemaVersion > appSchemaVersion
  ) {
    return {
      ok: false,
      error: 'That backup is from a newer ShopBook — update this phone first',
    };
  }

  if (typeof f.tables !== 'object' || f.tables === null) {
    return { ok: false, error: 'That backup has no data in it' };
  }

  for (const name of BACKUP_TABLE_NAMES) {
    const rows = (f.tables as unknown as Record<string, unknown>)[name];
    if (rows !== undefined && !Array.isArray(rows)) {
      return { ok: false, error: `The ${name} section of that backup is damaged` };
    }

    const claimed = f.counts?.[name];
    const actual = Array.isArray(rows) ? rows.length : 0;
    if (typeof claimed === 'number' && claimed !== actual) {
      return {
        ok: false,
        error: `That backup looks incomplete — ${name} should have ${claimed} rows but has ${actual}`,
      };
    }
  }

  return { ok: true, file: f as BackupFile };
}

/** A short human summary for the restore confirmation. */
export function describeBackup(file: BackupFile): string {
  const when = new Date(file.exportedAt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
  const sales = file.counts.sales ?? 0;
  const expenses = file.counts.expenses ?? 0;
  const days = file.counts.dayBook ?? 0;
  return `${when} from ${file.deviceLabel} · ${days} days, ${sales} sales, ${expenses} expenses`;
}

function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

/** Sales as a spreadsheet, one row per sale, amounts in rupees. */
export function salesToCsv(sales: Sale[], lines: SaleLine[], items: Item[]): string {
  const nameById = new Map(items.map((i) => [i.id, i.name]));

  return toCsv(
    ['Date', 'Time', 'Items', 'Payment', 'Gross', 'Cost', 'Profit', 'Reversed'],
    [...sales]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((s) => {
        const d = new Date(s.createdAt);
        const its = lines
          .filter((l) => l.saleId === s.id)
          .map((l) => `${l.qty} x ${nameById.get(l.itemId) ?? `#${l.itemId}`}`)
          .join('; ');
        return [
          d.toLocaleDateString('en-IN'),
          d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          its,
          s.paymentMode,
          (s.grossAmount / 100).toFixed(2),
          (s.cogs / 100).toFixed(2),
          ((s.grossAmount - s.cogs) / 100).toFixed(2),
          s.reversesSaleId !== undefined ? 'reversal' : '',
        ];
      })
  );
}

/** Expenses as a spreadsheet. Deleted rows are marked, not dropped. */
export function expensesToCsv(expenses: Expense[], days: DayBook[]): string {
  const dateByDay = new Map(days.map((d) => [d.id, d.date]));

  return toCsv(
    ['Date', 'Category', 'Amount', 'Paid by', 'Note', 'Deleted'],
    expenses.map((e) => {
      const iso = dateByDay.get(e.dayId);
      return [
        iso ? new Date(iso).toLocaleDateString('en-IN') : '',
        e.category,
        (e.amount / 100).toFixed(2),
        e.paymentMode,
        e.note,
        e.isDeleted ? 'yes' : '',
      ];
    })
  );
}
