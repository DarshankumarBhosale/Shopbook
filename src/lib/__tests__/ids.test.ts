import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import {
  setDeviceNo, getDeviceNo, resetDeviceCache, nextId, nextIds,
  deviceRange, deviceOfId, DEVICE_BLOCK,
} from '../../db/ids';
import { useDayStore } from '../../store/dayStore';
import { useSaleStore } from '../../store/saleStore';

describe('device ID blocks', () => {
  it('gives each device a range that cannot overlap', () => {
    const a = deviceRange(1);
    const b = deviceRange(2);
    expect(a.to).toBeLessThan(b.from);
    expect(b.from - a.from).toBe(DEVICE_BLOCK);
  });

  it('stays inside JS safe integers at the highest device number', () => {
    expect(deviceRange(8).to).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });

  it('tells which device minted an ID, and leaves seeded rows unowned', () => {
    expect(deviceOfId(11)).toBeNull();          // seeded Vada Pav
    expect(deviceOfId(1 * DEVICE_BLOCK + 5)).toBe(1);
    expect(deviceOfId(2 * DEVICE_BLOCK + 5)).toBe(2);
  });
});

describe('allocating IDs', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    resetDeviceCache();
    await seedDatabaseIfEmpty();
  });

  it('defaults to device 1 before setup', async () => {
    expect(await getDeviceNo()).toBe(1);
  });

  it('allocates inside the device own block', async () => {
    await setDeviceNo(2, 'helper');
    const id = await nextId(db.sales);
    expect(deviceOfId(id)).toBe(2);
  });

  it('hands out consecutive IDs for a batch', async () => {
    await setDeviceNo(1, 'owner');
    const ids = await nextIds(db.saleLines, 3);
    expect(ids).toHaveLength(3);
    expect(ids[1]).toBe(ids[0] + 1);
    expect(ids[2]).toBe(ids[1] + 1);
  });

  it('never reuses an ID already present, even after a restore', async () => {
    await setDeviceNo(1, 'owner');
    // Simulate rows arriving from a backup rather than being created here.
    await db.sales.put({
      id: 1 * DEVICE_BLOCK + 500, dayId: 1, channel: 'counter', grossAmount: 0,
      commissionAmt: 0, netAmount: 0, cogs: 0, paymentMode: 'Cash',
      createdAt: new Date().toISOString(),
    });
    const id = await nextId(db.sales);
    expect(id).toBe(1 * DEVICE_BLOCK + 501);
  });

  it('ignores the other device rows when picking the next ID', async () => {
    await setDeviceNo(1, 'owner');
    await db.sales.put({
      id: 2 * DEVICE_BLOCK + 900, dayId: 1, channel: 'counter', grossAmount: 0,
      commissionAmt: 0, netAmount: 0, cogs: 0, paymentMode: 'Cash',
      createdAt: new Date().toISOString(),
    });
    const id = await nextId(db.sales);
    expect(deviceOfId(id)).toBe(1);
  });
});

describe('two phones billing the same day', () => {
  async function sellOn(deviceNo: number, label: string) {
    await db.delete();
    await db.open();
    resetDeviceCache();
    await seedDatabaseIfEmpty();
    await setDeviceNo(deviceNo, label);
    useDayStore.setState({ openDay: null, isLoading: false });
    useSaleStore.setState({ cart: {} });

    const day = await useDayStore.getState().openNewDay(500);
    useSaleStore.getState().addToCart(11); // Vada Pav
    await useSaleStore.getState().commitSale({
      dayId: day.id!, paymentMode: 'Cash', createdBy: label,
    });

    return {
      sales: await db.sales.toArray(),
      lines: await db.saleLines.toArray(),
      moves: await db.stockMoves.filter((m) => m.type === 'sale').toArray(),
      days: await db.dayBook.toArray(),
    };
  }

  it('produces rows that merge without a single collision', async () => {
    // This is the whole reason the ID scheme exists: before it, both phones
    // minted sale 1, and the helper's first sale would overwrite the owner's.
    const owner = await sellOn(1, 'owner');
    const helper = await sellOn(2, 'helper');

    expect(owner.sales[0].id).not.toBe(helper.sales[0].id);
    expect(owner.days[0].id).not.toBe(helper.days[0].id);
    expect(deviceOfId(owner.sales[0].id!)).toBe(1);
    expect(deviceOfId(helper.sales[0].id!)).toBe(2);

    // Uniqueness is per table — a day book and a sale may share a number
    // harmlessly, since nothing ever looks one up in the other's table.
    const perTable: [string, number[]][] = [
      ['sales', [...owner.sales, ...helper.sales].map((r) => r.id!)],
      ['saleLines', [...owner.lines, ...helper.lines].map((r) => r.id!)],
      ['dayBook', [...owner.days, ...helper.days].map((r) => r.id!)],
      ['stockMoves', [...owner.moves, ...helper.moves].map((r) => r.id!)],
    ];

    for (const [table, ids] of perTable) {
      const minted = ids.filter((id) => id >= DEVICE_BLOCK);
      expect(minted.length, `${table} produced no device-minted rows`).toBeGreaterThan(0);
      expect(new Set(minted).size, `${table} has colliding IDs`).toBe(minted.length);
    }
  });

  it('keeps each sale line pointing at its own sale after a merge', async () => {
    const owner = await sellOn(1, 'owner');
    const helper = await sellOn(2, 'helper');

    // Union both phones' rows, as a sync would.
    const sales = [...owner.sales, ...helper.sales];
    const lines = [...owner.lines, ...helper.lines];

    for (const line of lines) {
      const parents = sales.filter((s) => s.id === line.saleId);
      expect(parents).toHaveLength(1);
    }

    // And stock moves still belong to exactly one day book.
    const days = [...owner.days, ...helper.days];
    for (const move of [...owner.moves, ...helper.moves]) {
      expect(days.filter((d) => d.id === move.dayId)).toHaveLength(1);
    }
  });
});
