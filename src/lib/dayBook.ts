import type { DayBook } from '../db/types';

/**
 * Pure function: the cash a new day should open with.
 *
 * Spec §A — "opening cash [...] auto-carried from yesterday's close". The
 * drawer is not emptied overnight, so today opens with whatever was physically
 * counted at the last close, not with what was expected.
 *
 * Returns 0 when no day has been closed yet.
 */
export function getCarryForwardCash(days: DayBook[]): number {
  const closed = days.filter((d) => d.status === 'closed' && d.closedAt);

  if (closed.length === 0) {
    return 0;
  }

  const latest = closed.reduce((newest, day) =>
    (day.closedAt ?? '') > (newest.closedAt ?? '') ? day : newest
  );

  return latest.closingCashCounted;
}
