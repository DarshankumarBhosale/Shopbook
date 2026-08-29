export type Role = 'owner' | 'helper';

/** Thrown when a role attempts something it is not allowed to do. */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Operations only the owner may perform.
 *
 * AGENTS.md rule 5: roles are enforced in the data layer, not just the UI —
 * "hiding a button is not enforcement". Every one of these throws before it
 * writes, so a helper cannot reach them by any route.
 */
export const OWNER_ONLY = {
  closeDay: 'Closing the day',
  reopenDay: 'Reopening a day',
  reverseSale: 'Reversing a sale',
  editMenu: 'Editing the menu',
} as const;

export type OwnerOnlyAction = keyof typeof OWNER_ONLY;

/** Throws unless the current role is the owner. */
export function assertOwner(role: Role | null, action: OwnerOnlyAction): void {
  if (role !== 'owner') {
    throw new PermissionError(`${OWNER_ONLY[action]} is owner-only`);
  }
}

/** Whether a role may see cost, margin and profit figures. */
export function canSeeProfit(role: Role | null): boolean {
  return role === 'owner';
}
