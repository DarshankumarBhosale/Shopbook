import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { db } from '../db/schema';
import { recordAudit } from '../db/audit';
import {
  buildBackup, checkBackup, BACKUP_TABLE_NAMES,
  salesToCsv, expensesToCsv,
  type BackupTables, type BackupFile,
} from '../lib/backup';
import { assertOwner, type Role } from '../lib/permissions';

/**
 * The schema version stamped into a backup, taken from the open database
 * rather than kept by hand.
 *
 * It was a hand-maintained constant and had drifted: it still said 6 after the
 * database moved to 7. Nothing read it, so nothing broke — but a stale version
 * stamp is exactly the sort of thing that is only wrong once it starts being
 * trusted, and restore now checks it.
 */
function currentSchemaVersion(): number {
  return db.verno;
}

export interface RestoreSummary {
  file: BackupFile;
  restored: Record<string, number>;
}

interface BackupState {
  readAll: () => Promise<BackupTables>;
  exportBackup: (deviceLabel: string) => Promise<{ name: string; shared: boolean }>;
  exportCsv: (deviceLabel: string) => Promise<{ name: string; shared: boolean }>;
  restoreBackup: (json: string, role: Role | null) => Promise<RestoreSummary>;
}

async function readAllTables(): Promise<BackupTables> {
  const [
    shops, users, dayBook, items, rawMaterials, recipes,
    sales, saleLines, stockMoves, expenses, customers, payments, auditLog,
  ] = await Promise.all([
    db.shops.toArray(), db.users.toArray(), db.dayBook.toArray(),
    db.items.toArray(), db.rawMaterials.toArray(), db.recipes.toArray(),
    db.sales.toArray(), db.saleLines.toArray(), db.stockMoves.toArray(),
    db.expenses.toArray(), db.customers.toArray(), db.payments.toArray(),
    db.auditLog.toArray(),
  ]);

  return {
    shops, users, dayBook, items, rawMaterials, recipes,
    sales, saleLines, stockMoves, expenses, customers, payments, auditLog,
  };
}

/**
 * Writes a file the owner can actually get off the phone.
 *
 * A browser download is unreliable inside the Android WebView, so on device the
 * file goes to Documents and then straight into the share sheet — WhatsApp,
 * Drive, wherever. On the web it falls back to an ordinary download.
 */
async function saveAndShare(
  name: string,
  data: string,
  mimeType: string,
  title: string
): Promise<{ name: string; shared: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { name, shared: false };
  }

  await Filesystem.writeFile({
    path: name,
    data,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path: name,
    directory: Directory.Documents,
  });

  try {
    await Share.share({ title, url: uri, dialogTitle: title });
    return { name, shared: true };
  } catch {
    // Share cancelled or unavailable — the file is still written to Documents.
    return { name, shared: false };
  }
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export const useBackupStore = create<BackupState>(() => ({
  readAll: readAllTables,

  exportBackup: async (deviceLabel) => {
    const tables = await readAllTables();
    const file = buildBackup(tables, currentSchemaVersion(), deviceLabel);
    const name = `shopbook-backup-${deviceLabel}-${stamp()}.json`;

    const result = await saveAndShare(
      name,
      JSON.stringify(file),
      'application/json',
      'ShopBook backup'
    );

    await recordAudit({
      action: 'backup.export',
      detail: `${file.counts.sales} sales, ${file.counts.expenses} expenses → ${name}`,
    });

    return result;
  },

  exportCsv: async (deviceLabel) => {
    const tables = await readAllTables();
    const csv =
      'SALES\n' +
      salesToCsv(tables.sales, tables.saleLines, tables.items) +
      '\n\nEXPENSES\n' +
      expensesToCsv(tables.expenses, tables.dayBook);

    const name = `shopbook-${deviceLabel}-${stamp()}.csv`;
    const result = await saveAndShare(name, csv, 'text/csv', 'ShopBook sales & expenses');

    await recordAudit({
      action: 'backup.csv',
      detail: `Exported ${tables.sales.length} sales and ${tables.expenses.length} expenses`,
    });

    return result;
  },

  /**
   * Replaces the whole database with the contents of a backup.
   *
   * Validated before a single row is written — a half-applied restore would
   * leave the books in a state that is neither the backup nor what was there.
   */
  restoreBackup: async (json, role) => {
    assertOwner(role, 'restoreBackup');

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('That file is not readable — it may be damaged');
    }

    const check = checkBackup(parsed, currentSchemaVersion());
    if (!check.ok) throw new Error(check.error);

    const { file } = check;
    const restored: Record<string, number> = {};

    await db.transaction(
      'rw',
      [
        db.shops, db.users, db.dayBook, db.items, db.rawMaterials, db.recipes,
        db.sales, db.saleLines, db.stockMoves, db.expenses, db.customers,
        // `meta` is listed because the audit entry allocates an ID, which reads
        // this phone's device number. Its own rows are never restored — the
        // device identity belongs to the phone, not to the backup.
        db.payments, db.auditLog, db.meta,
      ],
      async () => {
        for (const name of BACKUP_TABLE_NAMES) {
          const table = db.table(name);
          const rows = file.tables[name] ?? [];
          await table.clear();
          if (rows.length > 0) await table.bulkPut(rows);
          restored[name] = rows.length;
        }

        await recordAudit({
          action: 'backup.restore',
          detail:
            `Restored ${restored.sales} sales and ${restored.expenses} expenses ` +
            `from a ${new Date(file.exportedAt).toLocaleDateString('en-IN')} backup (${file.deviceLabel})`,
          role,
        });
      }
    );

    return { file, restored };
  },
}));
