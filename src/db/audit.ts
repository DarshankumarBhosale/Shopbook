import { db } from './schema';
import type { AuditLogEntry } from './types';
import type { Role } from '../lib/permissions';

/** Owner is user 1, helper is user 2, matching the seeded users table. */
function userIdForRole(role: Role | null): number | undefined {
  if (role === 'owner') return 1;
  if (role === 'helper') return 2;
  return undefined;
}

/**
 * Appends an entry to the audit log.
 *
 * AGENTS.md rule 3: the audit log is append-only, and every edit is recorded
 * with a user and a timestamp. Called from inside the same transaction as the
 * action it describes, so a write and its log entry either both land or
 * neither does — a log that can drift from the books is worse than none.
 */
export async function recordAudit(entry: {
  action: string;
  detail: string;
  role?: Role | null;
  dayId?: number | null;
}): Promise<void> {
  const row: Omit<AuditLogEntry, 'id'> = {
    action: entry.action,
    detail: entry.detail,
    userId: userIdForRole(entry.role ?? null),
    dayId: entry.dayId ?? undefined,
    createdAt: new Date().toISOString(),
  };

  await db.auditLog.add(row as AuditLogEntry);
}
