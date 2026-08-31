import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { useUIStore } from '../../store/uiStore';
import { useBackupStore } from '../../store/backupStore';
import { Label } from '../common/Label';
import { checkBackup, describeBackup } from '../../lib/backup';

export const BackupView: React.FC = () => {
  const role = useUIStore((state) => state.role);
  const showToast = useUIStore((state) => state.showToast);
  const { exportBackup, exportCsv, restoreBackup } = useBackupStore();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ json: string; summary: string } | null>(null);

  const counts = useLiveQuery(async () => {
    const [sales, expenses, days, payments] = await Promise.all([
      db.sales.count(), db.expenses.count(), db.dayBook.count(), db.payments.count(),
    ]);
    return { sales, expenses, days, payments };
  }, []);

  const lastBackup = useLiveQuery(
    () => db.auditLog.filter((a) => a.action === 'backup.export').last(),
    []
  );

  const deviceLabel = role === 'helper' ? 'helper' : 'owner';

  const run = async (key: string, fn: () => Promise<{ name: string; shared: boolean }>) => {
    try {
      setBusy(key);
      const { name, shared } = await fn();
      showToast(shared ? 'Backup ready to send' : `Saved ${name}`);
    } catch (err) {
      console.error('Backup failed:', err);
      showToast(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBusy(null);
    }
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const json = await file.text();
      const check = checkBackup(JSON.parse(json), db.verno);
      if (!check.ok) {
        showToast(check.error);
        return;
      }
      // Confirm before overwriting: restoring replaces everything on this phone.
      setPending({ json, summary: describeBackup(check.file) });
    } catch {
      showToast('That file is not readable — it may be damaged');
    }
  };

  const confirmRestore = async () => {
    if (!pending) return;
    try {
      setBusy('restore');
      const { restored } = await restoreBackup(pending.json, role);
      showToast(`Restored ${restored.sales} sales, ${restored.expenses} expenses`);
      setPending(null);
    } catch (err) {
      console.error('Restore failed:', err);
      showToast(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px] overflow-y-auto noscroll">
      <div className="mb-4">
        <Label>Backup</Label>
        <p className="text-body-s text-tx2 mt-1">
          Everything lives on this phone only. A backup is the single copy that
          survives a lost or wiped device.
        </p>
        {counts && (
          <p className="text-body-s text-tx3 mt-1 font-mono">
            {counts.days} days · {counts.sales} sales · {counts.expenses} expenses ·{' '}
            {counts.payments} khata payments
          </p>
        )}
        <p className="text-body-s text-tx3 mt-1">
          {lastBackup
            ? `Last backup ${new Date(lastBackup.createdAt).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
              })}`
            : 'Never backed up yet.'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => run('json', () => exportBackup(deviceLabel))}
          disabled={busy !== null}
          className="tap min-h-[52px] rounded-md font-display text-[16px] tracking-[0.05em] uppercase disabled:opacity-40"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-tx-on-accent)',
          }}
        >
          {busy === 'json' ? 'Saving…' : 'Back up everything'}
        </button>

        <button
          type="button"
          onClick={() => run('csv', () => exportCsv(deviceLabel))}
          disabled={busy !== null}
          className="tap min-h-[48px] rounded-md border border-line-strong bg-surface text-body-m font-semibold text-tx1 disabled:opacity-40"
        >
          {busy === 'csv' ? 'Saving…' : 'Export sales & expenses (CSV)'}
        </button>

        <p className="text-body-s text-tx3">
          The backup is a single file. Send it to yourself on WhatsApp or save it
          to Drive — the share sheet opens once it's written. The CSV opens in any
          spreadsheet and is what your accountant will want.
        </p>
      </div>

      {role === 'owner' && (
        <div className="mt-6">
          <Label>Restore</Label>
          <p className="text-body-s text-tx2 mt-1 mb-2">
            Loads a backup file and <strong>replaces everything</strong> on this
            phone with it. Use it on a new device, or to pull the helper's day
            onto your own.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFilePicked}
            className="hidden"
            aria-label="Choose a backup file"
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="tap w-full min-h-[48px] rounded-md border border-line-strong bg-surface text-body-m font-semibold text-tx1 disabled:opacity-40"
          >
            Choose a backup file…
          </button>

          {pending && (
            <div className="mt-3 bg-surface border border-danger rounded-md p-4 flex flex-col gap-2">
              <span className="font-display text-[16px] tracking-[0.04em] uppercase text-danger-text">
                Replace everything?
              </span>
              <p className="text-body-s text-tx2">{pending.summary}</p>
              <p className="text-body-s text-tx2">
                Every sale, expense and stock count currently on this phone will be
                replaced. This cannot be undone — back up first if you're unsure.
              </p>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={confirmRestore}
                  disabled={busy !== null}
                  className="tap flex-1 min-h-[48px] rounded-md font-display text-[15px] tracking-[0.05em] uppercase disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--color-danger-text)',
                    color: 'var(--color-tx-inverse)',
                  }}
                >
                  {busy === 'restore' ? 'Restoring…' : 'Replace'}
                </button>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="tap min-h-[48px] px-4 rounded-md border border-line-strong bg-base text-body-m font-semibold text-tx1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 bg-raised border border-line-strong rounded-md p-4">
        <span className="font-display text-[15px] tracking-[0.05em] uppercase text-tx1">
          Running two devices
        </span>
        <p className="text-body-s text-tx2 mt-1">
          The two phones do not talk to each other — each keeps its own books. So
          pick one as the real till, usually the counter phone the helper uses, and
          bill everything there. At the 9pm close, back up from that phone and
          restore onto yours to see the day's figures.
        </p>
        <p className="text-body-s text-tx3 mt-1">
          Billing on both at once would give you two half-days that can't be added
          together. Live sync needs a cloud account — worth doing next if you want
          both tills running at the same time.
        </p>
      </div>
    </div>
  );
};
