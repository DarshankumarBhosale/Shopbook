import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import { useDayStore } from '../../store/dayStore';
import { useSaleStore } from '../../store/saleStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useBackupStore } from '../../store/backupStore';
import { buildBackup, checkBackup, BACKUP_TABLE_NAMES, expensesToCsv, salesToCsv } from '../backup';
import { PermissionError } from '../permissions';
import type { BackupTables } from '../backup';

const EMPTY: BackupTables = {
  shops: [], users: [], dayBook: [], items: [], rawMaterials: [], recipes: [],
  sales: [], saleLines: [], stockMoves: [], expenses: [], customers: [],
  payments: [], auditLog: [],
};

describe('checkBackup', () => {
  it('accepts a file it just built', () => {
    const file = buildBackup(EMPTY, 6, 'owner');
    const result = checkBackup(file);
    expect(result.ok).toBe(true);
  });

  it('rejects anything that is not a ShopBook backup', () => {
    expect(checkBackup(null).ok).toBe(false);
    expect(checkBackup({ hello: 'world' }).ok).toBe(false);
    expect(checkBackup({ app: 'somethingelse', tables: {} }).ok).toBe(false);
  });

  it('rejects a backup from a newer app', () => {
    const file = { ...buildBackup(EMPTY, 6, 'owner'), format: 999 };
    const result = checkBackup(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/newer version/);
  });

  it('catches a truncated file by checking counts against the data', () => {
    // The whole point of writing counts: a file that lost rows in transit is
    // otherwise indistinguishable from a small shop, and restoring it would
    // quietly drop sales.
    const file = buildBackup(
      { ...EMPTY, sales: [{ id: 1 }, { id: 2 }, { id: 3 }] as never },
      6,
      'owner'
    );
    file.tables.sales = [{ id: 1 }] as never;

    const result = checkBackup(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/incomplete/);
  });

  it('rejects a section that is not a list', () => {
    const file = buildBackup(EMPTY, 6, 'owner');
    (file.tables as unknown as Record<string, unknown>).sales = 'not a list';
    delete file.counts.sales;
    expect(checkBackup(file).ok).toBe(false);
  });
});

describe('backup round trip', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
    useDayStore.setState({ openDay: null, isLoading: false });
    useSaleStore.setState({ cart: {} });
  });

  it('restores a day of trading onto an emptied database', async () => {
    const day = await useDayStore.getState().openNewDay(900);
    useSaleStore.getState().addToCart(11); // Vada Pav
    await useSaleStore.getState().commitSale({
      dayId: day.id!, paymentMode: 'Cash', createdBy: 'owner',
    });
    await useExpenseStore.getState().addExpense({
      dayId: day.id!, category: 'Gas cylinder', amountRupees: 1000, paymentMode: 'Cash',
    });

    const tables = await useBackupStore.getState().readAll();
    const file = buildBackup(tables, 6, 'owner');
    const json = JSON.stringify(file);

    // Wipe the phone.
    for (const name of BACKUP_TABLE_NAMES) await db.table(name).clear();
    expect(await db.sales.count()).toBe(0);
    expect(await db.items.count()).toBe(0);

    const { restored } = await useBackupStore.getState().restoreBackup(json, 'owner');

    expect(restored.sales).toBe(1);
    expect(restored.expenses).toBe(1);
    expect(await db.items.count()).toBe(38);
    expect(await db.rawMaterials.count()).toBe(44);

    const sale = (await db.sales.toArray())[0];
    expect(sale.grossAmount).toBe(1500);

    const expense = (await db.expenses.toArray())[0];
    expect(expense.amount).toBe(100000);
    expect(expense.category).toBe('Gas cylinder');

    // Stock moves come back, so quantities on hand survive the restore.
    const pav = (await db.stockMoves.where('rmId').equals(1).toArray())
      .reduce((s, m) => s + m.qty, 0);
    expect(pav).toBe(159);
  });

  it('refuses to restore for a helper', async () => {
    const file = JSON.stringify(buildBackup(EMPTY, 6, 'owner'));
    await expect(
      useBackupStore.getState().restoreBackup(file, 'helper')
    ).rejects.toThrow(PermissionError);
  });

  it('refuses an unreadable file without touching the data', async () => {
    const before = await db.items.count();
    await expect(
      useBackupStore.getState().restoreBackup('{ not json', 'owner')
    ).rejects.toThrow(/not readable/);
    expect(await db.items.count()).toBe(before);
  });
});

describe('CSV export', () => {
  it('writes one row per sale with rupee amounts', () => {
    const csv = salesToCsv(
      [{
        id: 1, dayId: 1, channel: 'counter', grossAmount: 1500, commissionAmt: 0,
        netAmount: 1500, cogs: 1075, paymentMode: 'Cash',
        createdAt: '2026-08-29T04:00:00.000Z',
      }],
      [{ id: 1, saleId: 1, itemId: 11, qty: 1, rate: 1500, amount: 1500 }],
      [{ id: 11, name: 'Vada Pav', category: 'Breakfast', sellPriceCounter: 1500, sellPriceOnline: 2000, sortOrder: 9, isActive: true }]
    );

    expect(csv).toContain('1 x Vada Pav');
    expect(csv).toContain('15.00');
    expect(csv).toContain('10.75');
  });

  it('marks deleted expenses rather than dropping them', () => {
    const csv = expensesToCsv(
      [
        { id: 1, dayId: 1, category: 'Rent', amount: 5000, paymentMode: 'Cash', note: '' },
        { id: 2, dayId: 1, category: 'Misc', amount: 200, paymentMode: 'UPI', note: 'x', isDeleted: true },
      ],
      [{
        id: 1, date: '2026-08-29T04:00:00.000Z', openingCash: 0, closingCashExpected: 0,
        closingCashCounted: 0, variance: 0, note: '', status: 'closed',
      }]
    );

    expect(csv).toContain('Rent');
    expect(csv).toMatch(/Misc.*yes/);
  });

  it('escapes a note containing a comma', () => {
    const csv = expensesToCsv(
      [{ id: 1, dayId: 1, category: 'Misc', amount: 100, paymentMode: 'Cash', note: 'onions, oil' }],
      []
    );
    expect(csv).toContain('"onions, oil"');
  });
});
