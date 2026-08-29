import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/schema';
import { seedDatabaseIfEmpty } from '../../db/seed';
import { useDayStore } from '../../store/dayStore';
import { useSaleStore } from '../../store/saleStore';
import { computeCurrentStock } from '../stockMoves';
import { PermissionError } from '../permissions';

const VADA_PAV = 11;
const PAV = 1;

describe('reversing a sale', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDatabaseIfEmpty();
    useDayStore.setState({ openDay: null, isLoading: false });
    useSaleStore.setState({ cart: {} });
  });

  async function sellTwoVadaPav() {
    const day = await useDayStore.getState().openNewDay(1000);
    useSaleStore.getState().addToCart(VADA_PAV);
    useSaleStore.getState().addToCart(VADA_PAV);
    await useSaleStore.getState().commitSale({
      dayId: day.id!,
      paymentMode: 'Cash',
      createdBy: 'owner',
    });
    const sale = await db.sales.orderBy('id').last();
    return { day, sale: sale! };
  }

  it('nets the sale to zero without deleting it', async () => {
    const { sale } = await sellTwoVadaPav();

    await useSaleStore.getState().reverseSale({
      saleId: sale.id!,
      reason: 'Rang up the wrong item',
      role: 'owner',
    });

    const all = await db.sales.toArray();
    // Nothing deleted: the mistake and the correction both stay on record.
    expect(all).toHaveLength(2);
    expect(all.reduce((sum, s) => sum + s.grossAmount, 0)).toBe(0);
    expect(all.reduce((sum, s) => sum + s.cogs, 0)).toBe(0);

    const reversal = all.find((s) => s.reversesSaleId === sale.id);
    expect(reversal).toBeDefined();
    expect(reversal!.reversalReason).toBe('Rang up the wrong item');
  });

  it('puts the ingredients back on the shelf', async () => {
    const { sale } = await sellTwoVadaPav();

    const afterSale = computeCurrentStock(await db.stockMoves.toArray(), PAV);
    expect(afterSale).toBe(158); // 160 opening - 2 pav

    await useSaleStore.getState().reverseSale({
      saleId: sale.id!,
      reason: 'Customer changed their mind',
      role: 'owner',
    });

    const afterReversal = computeCurrentStock(await db.stockMoves.toArray(), PAV);
    expect(afterReversal).toBe(160);
  });

  it('mirrors the sale lines so item reports net out', async () => {
    const { sale } = await sellTwoVadaPav();

    await useSaleStore.getState().reverseSale({
      saleId: sale.id!,
      reason: 'Wrong item',
      role: 'owner',
    });

    const lines = await db.saleLines.toArray();
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(0);
    expect(lines.reduce((sum, l) => sum + l.qty, 0)).toBe(0);
  });

  it('records who reversed what, and why', async () => {
    const { sale } = await sellTwoVadaPav();

    await useSaleStore.getState().reverseSale({
      saleId: sale.id!,
      reason: 'Double tapped',
      role: 'owner',
    });

    const entry = await db.auditLog.filter((e) => e.action === 'sale.reverse').first();
    expect(entry).toBeDefined();
    expect(entry!.detail).toContain('Double tapped');
    expect(entry!.userId).toBe(1); // owner
  });

  it('refuses a helper', async () => {
    const { sale } = await sellTwoVadaPav();

    await expect(
      useSaleStore.getState().reverseSale({
        saleId: sale.id!,
        reason: 'Nope',
        role: 'helper',
      })
    ).rejects.toThrow(PermissionError);

    expect(await db.sales.count()).toBe(1);
  });

  it('refuses a reason-less reversal', async () => {
    const { sale } = await sellTwoVadaPav();

    await expect(
      useSaleStore.getState().reverseSale({ saleId: sale.id!, reason: '   ', role: 'owner' })
    ).rejects.toThrow(/reason/);
  });

  it('refuses to reverse the same sale twice', async () => {
    const { sale } = await sellTwoVadaPav();

    await useSaleStore.getState().reverseSale({
      saleId: sale.id!,
      reason: 'First',
      role: 'owner',
    });

    await expect(
      useSaleStore.getState().reverseSale({
        saleId: sale.id!,
        reason: 'Second',
        role: 'owner',
      })
    ).rejects.toThrow(/already reversed/);
  });

  it('refuses to touch a locked day', async () => {
    const { day, sale } = await sellTwoVadaPav();

    await db.dayBook.update(day.id!, { status: 'closed' });

    await expect(
      useSaleStore.getState().reverseSale({
        saleId: sale.id!,
        reason: 'Too late',
        role: 'owner',
      })
    ).rejects.toThrow(/locked/);
  });
});
