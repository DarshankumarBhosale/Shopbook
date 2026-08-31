import { create } from 'zustand';
import { db } from '../db/schema';
import { nextId } from '../db/ids';
import { recordAudit } from '../db/audit';
import type { DayBook } from '../db/types';
import { toPaise, formatRupees } from '../lib/format';
import { computeVariance } from '../lib/cashRecon';
import { assertOwner, type Role } from '../lib/permissions';

interface DayState {
  openDay: DayBook | null;
  isLoading: boolean;
  loadOpenDay: () => Promise<void>;
  openNewDay: (openingCashRupees: number | string) => Promise<DayBook>;
  closeCurrentDay: (
    countedRupees: number | string,
    expectedPaise: number,
    note: string,
    snapshot: { grossSalesPaise: number; cogsPaise: number; expensesPaise: number },
    role: Role | null
  ) => Promise<void>;
  reopenDay: (dayId: number, role: Role | null) => Promise<void>;
}

export const useDayStore = create<DayState>((set, get) => ({
  openDay: null,
  isLoading: true,

  loadOpenDay: async () => {
    try {
      set({ isLoading: true });
      const open = await db.dayBook.filter((d) => d.status === 'open').first();
      set({ openDay: open || null, isLoading: false });
    } catch (err) {
      console.error('Failed to load open day:', err);
      set({ openDay: null, isLoading: false });
    }
  },

  /**
   * Opens the day, or joins the one already open.
   *
   * Two open day books split a single day's trade in half: sales land on
   * whichever one happens to be found first, the other is orphaned still open,
   * and neither closing count reconciles. It used to be possible two ways — a
   * double-tap on Open Day Book, and, once two phones are in use, the helper
   * opening a day because their phone has not yet synced the owner's.
   *
   * Joining the existing day is deliberate rather than refusing: on a helper's
   * phone that is briefly behind, an error would leave them unable to sell at
   * all. The check and the insert share a transaction so a double-tap cannot
   * slip between them.
   */
  openNewDay: async (openingCashRupees: number | string) => {
    const openingCashPaise = toPaise(openingCashRupees);
    let result: DayBook | undefined;

    await db.transaction('rw', [db.dayBook, db.auditLog, db.meta], async () => {
      const alreadyOpen = await db.dayBook.filter((d) => d.status === 'open').first();
      if (alreadyOpen) {
        result = alreadyOpen;
        return;
      }

      const newDay: Omit<DayBook, 'id'> = {
        date: new Date().toISOString(),
        openingCash: openingCashPaise,
        closingCashExpected: 0,
        closingCashCounted: 0,
        variance: 0,
        note: '',
        status: 'open',
      };

      const id = await db.dayBook.add({ ...newDay, id: await nextId(db.dayBook) } as DayBook);
      result = await db.dayBook.get(id);

      await recordAudit({
        action: 'day.open',
        detail: `Opened with ${formatRupees(openingCashPaise)} in the drawer`,
        dayId: id,
      });
    });

    if (!result) throw new Error('Failed to retrieve created day book');

    set({ openDay: result });
    return result;
  },

  closeCurrentDay: async (
    countedRupees: number | string,
    expectedPaise: number,
    note: string,
    snapshot: { grossSalesPaise: number; cogsPaise: number; expensesPaise: number },
    role: Role | null
  ) => {
    assertOwner(role, 'closeDay');

    const current = get().openDay;
    if (!current || !current.id) throw new Error('No open day to close');

    const countedPaise = toPaise(countedRupees);
    const variancePaise = computeVariance(expectedPaise, countedPaise);
    const closedAt = new Date().toISOString();

    const updatePayload: Partial<DayBook> = {
      status: 'closed',
      closingCashExpected: expectedPaise,
      closingCashCounted: countedPaise,
      variance: variancePaise,
      note: note.trim(),
      closedAt,
      grossSales: snapshot.grossSalesPaise,
      totalCogs: snapshot.cogsPaise,
      totalExpenses: snapshot.expensesPaise,
    };

    await db.transaction('rw', [db.dayBook, db.auditLog, db.meta], async () => {
      await db.dayBook.update(current.id!, updatePayload);
      await recordAudit({
        action: 'day.close',
        detail:
          `Counted ${formatRupees(countedPaise)} against ${formatRupees(expectedPaise)}` +
          (variancePaise === 0
            ? ' · matched'
            : ` · ${variancePaise > 0 ? 'excess' : 'short'} ${formatRupees(Math.abs(variancePaise))} · ${note.trim()}`),
        role,
        dayId: current.id,
      });
    });

    set({ openDay: null });
  },

  /**
   * Reopens a locked day so a mistake found after closing can be corrected.
   *
   * Rule 4: a closed day is immutable and only the owner may reopen it, with
   * the reopening itself logged. Reopening the existing book also stops a
   * second day book being created for the same date.
   */
  reopenDay: async (dayId: number, role: Role | null) => {
    assertOwner(role, 'reopenDay');

    await db.transaction('rw', [db.dayBook, db.auditLog, db.meta], async () => {
      const day = await db.dayBook.get(dayId);
      if (!day) throw new Error('That day book no longer exists');
      if (day.status === 'open') return;

      const alreadyOpen = await db.dayBook.filter((d) => d.status === 'open').first();
      if (alreadyOpen) throw new Error('Close the open day first');

      await db.dayBook.update(dayId, { status: 'open' });
      await recordAudit({
        action: 'day.reopen',
        detail: `Reopened after closing at ${formatRupees(day.closingCashCounted)}`,
        role,
        dayId,
      });
    });

    const reopened = await db.dayBook.get(dayId);
    set({ openDay: reopened ?? null });
  },
}));
