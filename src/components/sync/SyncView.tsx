import React, { useEffect, useState } from 'react';
import { RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useSyncStore } from '../../store/syncStore';
import { Label } from '../common/Label';
import { MAX_DEVICE_NO } from '../../db/ids';

const DEVICES: { no: number; label: string; who: string }[] = [
  { no: 1, label: 'owner', who: "Owner's phone" },
  { no: 2, label: 'helper', who: "Helper's phone" },
];

export const SyncView: React.FC = () => {
  const showToast = useUIStore((state) => state.showToast);
  const {
    phase, message, lastSyncAt, email, deviceNo, deviceLabel, deviceChosen,
    init, signIn, signOut, chooseDevice, syncNow, startLive,
  } = useSyncStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void init().then(() => {
      // Resume live updates on a phone that was already signed in.
      if (useSyncStore.getState().phase !== 'signed-out') void startLive();
    });
  }, [init, startLive]);

  const signedIn = phase !== 'signed-out';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return;
    try {
      setBusy(true);
      await signIn(form.email, form.password);
      setForm({ email: '', password: '' });
      showToast('Signed in — both phones now share the books');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  const handleDevice = async (no: number, label: string) => {
    try {
      await chooseDevice(no, label);
      showToast(`This is now the ${label}'s phone`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not set the device');
    }
  };

  const lastSyncText = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      })
    : 'Not yet';

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[100px] overflow-y-auto noscroll">
      {/* Status */}
      <div className="mb-4">
        <Label>Live sync</Label>
        <div className="flex items-center gap-2 mt-1">
          {signedIn ? (
            <Cloud size={18} style={{ color: 'var(--color-accent-text)' }} />
          ) : (
            <CloudOff size={18} style={{ color: 'var(--color-tx3)' }} />
          )}
          <span
            className="font-display text-[15px] tracking-[0.04em] uppercase"
            style={{
              color: phase === 'error'
                ? 'var(--color-danger-text)'
                : signedIn ? 'var(--color-accent-text)' : 'var(--color-tx3)',
            }}
          >
            {phase === 'syncing' ? 'Syncing…'
              : phase === 'error' ? 'Sync problem'
              : signedIn ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {message && (
          <p
            className="text-body-s mt-1"
            style={{
              color: phase === 'error' ? 'var(--color-danger-text)' : 'var(--color-tx2)',
            }}
          >
            {message}
          </p>
        )}

        <p className="text-body-s text-tx3 mt-1 font-mono">
          Last sync: {lastSyncText}
        </p>
      </div>

      {/* Which phone is this */}
      <div className="mb-4">
        <Label>This device</Label>
        <p className="text-body-s text-tx2 mt-1 mb-2">
          Each phone needs its own number so two sales rung up at the same moment
          can never overwrite each other. Set this <strong>once</strong>, before
          you start billing — and never give both phones the same one.
        </p>

        <div className="flex gap-2">
          {DEVICES.map((d) => {
            // Nothing is shown as selected until it has actually been stored.
            // A default that merely looks chosen is how both phones end up
            // being device 1.
            const selected = deviceChosen && deviceNo === d.no;
            return (
              <button
                key={d.no}
                type="button"
                onClick={() => handleDevice(d.no, d.label)}
                aria-pressed={selected}
                className="tap flex-1 min-h-[52px] rounded-md border text-body-m font-semibold"
                style={{
                  backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-surface)',
                  borderColor: selected
                    ? 'var(--color-primary)'
                    : deviceChosen ? 'var(--color-line-strong)' : 'var(--color-danger)',
                  color: selected ? 'var(--color-tx-inverse)' : 'var(--color-tx1)',
                }}
              >
                {d.who}
              </button>
            );
          })}
        </div>

        {deviceChosen ? (
          <p className="text-body-s text-tx3 mt-1 font-mono">
            Device {deviceNo} of {MAX_DEVICE_NO} · {deviceLabel}
          </p>
        ) : (
          <p
            className="text-body-s mt-2 font-semibold"
            style={{ color: 'var(--color-danger-text)' }}
          >
            Not set yet. Choose one before connecting — if both phones skip this,
            they number their sales the same way and one phone's sale will
            overwrite the other's.
          </p>
        )}
      </div>

      {/* Sign in, or the signed-in controls */}
      {signedIn ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={phase === 'syncing'}
            className="tap min-h-[52px] rounded-md font-display text-[16px] tracking-[0.05em] uppercase flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-tx-on-accent)',
            }}
          >
            <RefreshCw size={18} className={phase === 'syncing' ? 'animate-spin' : ''} />
            {phase === 'syncing' ? 'Syncing…' : 'Sync now'}
          </button>

          <p className="text-body-s text-tx3">
            Signed in as {email}. Sales, expenses and khata sync on their own the
            moment the other phone records something — this button is only for
            when you want to be sure.
          </p>

          <button
            type="button"
            onClick={() => void signOut()}
            className="tap min-h-[48px] mt-2 rounded-md border border-line-strong bg-surface text-body-m font-semibold text-tx1"
          >
            Sign out
          </button>
        </div>
      ) : (
        <form onSubmit={handleSignIn} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-label text-tx3 uppercase" style={{ letterSpacing: '0.12em' }}>
              Email
            </span>
            <input
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              aria-label="Sync account email"
              className="min-h-[48px] rounded-sm px-3 text-body-m bg-base border border-line text-tx1 placeholder:text-tx3 focus:border-line-strong focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label text-tx3 uppercase" style={{ letterSpacing: '0.12em' }}>
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-label="Sync account password"
              className="min-h-[48px] rounded-sm px-3 text-body-m bg-base border border-line text-tx1 focus:border-line-strong focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={busy || !deviceChosen || !form.email.trim() || !form.password}
            className="tap min-h-[52px] rounded-md font-display text-[16px] tracking-[0.05em] uppercase disabled:opacity-40"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-tx-on-accent)',
            }}
          >
            {busy ? 'Signing in…' : deviceChosen ? 'Connect this phone' : 'Choose this device first'}
          </button>

          <p className="text-body-s text-tx3">
            Both phones sign in with the same account. Sign in once and it stays
            signed in — you will not be asked again unless you sign out.
          </p>
        </form>
      )}

      <div className="mt-6 bg-raised border border-line-strong rounded-md p-4">
        <span className="font-display text-[15px] tracking-[0.05em] uppercase text-tx1">
          What happens with no signal
        </span>
        <p className="text-body-s text-tx2 mt-1">
          Nothing stops. Every sale, expense and udhaar is written to the phone
          first and sent up afterwards, so the counter keeps working through a
          dead patch and catches up on its own once the signal returns. Sync is
          how the two phones agree — not how they record.
        </p>
        <p className="text-body-s text-tx2 mt-2">
          A sale, once rung up, is never changed by the other phone. Prices,
          expense corrections and the day book take whichever edit was made last.
          Keep taking a backup anyway — sync is not a backup.
        </p>
      </div>
    </div>
  );
};
