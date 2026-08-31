import { db } from './schema';

/**
 * Refuses a write against a day that has already been closed.
 *
 * Closing is a reconciliation the owner signs off: cash counted against cash
 * expected, with the day's sales, cost and expenses stored alongside it. A sale
 * or expense added afterwards silently invalidates that — the totals stop
 * matching the snapshot, the variance the owner approved becomes wrong, and the
 * discrepancy surfaces the next morning with nothing to explain it.
 *
 * The rule existed but had only been applied to reversals and expense edits,
 * so a late sale, a khata payment or a stock entry could still land on a closed
 * day. It lives here now so there is one copy for every write to share.
 *
 * Call it INSIDE the same transaction as the write it guards, with `dayBook`
 * among that transaction's tables — otherwise a day can close between the check
 * and the write.
 */
export async function assertDayOpen(dayId: number): Promise<void> {
  const day = await db.dayBook.get(dayId);
  if (!day) throw new Error('That day is no longer in the book');
  if (day.status !== 'open') {
    throw new Error('That day is locked — reopen it first');
  }
}

/**
 * The same guard for writes whose day is optional — opening stock is recorded
 * against no day at all, and must stay allowed.
 */
export async function assertDayOpenIfGiven(dayId: number | undefined | null): Promise<void> {
  if (dayId === undefined || dayId === null) return;
  await assertDayOpen(dayId);
}
