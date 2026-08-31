import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { db } from '../db/schema';
import { getSupabase } from '../lib/supabase';
import { getDeviceNo, getDeviceLabel, setDeviceNo, isDeviceChosen, DEVICE_BLOCK } from '../db/ids';
import {
  PUSH_ORDER, SYNC_TABLES, rowsToPush, advanceHighWater, planMerge,
  nextPullCursor, normalizeBatch, updateSentMap, type SentMap, type Row,
} from '../lib/syncPlan';

const EPOCH = '1970-01-01T00:00:00.000Z';
const PAGE = 500;

const highWaterKey = (t: string) => `sync:high:${t}`;
const cursorKey = (t: string) => `sync:cursor:${t}`;
const sentKey = (t: string) => `sync:sent:${t}`;
const LAST_SYNC_KEY = 'sync:lastAt';

export type SyncPhase = 'idle' | 'syncing' | 'error' | 'signed-out';

interface SyncState {
  phase: SyncPhase;
  message: string;
  lastSyncAt: string | null;
  email: string | null;
  deviceNo: number;
  deviceLabel: string;
  /** False until this phone has been told which device it is. */
  deviceChosen: boolean;

  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  chooseDevice: (deviceNo: number, label: string) => Promise<void>;
  syncNow: () => Promise<void>;
  startLive: () => Promise<void>;
  stopLive: () => void;
}

async function meta(key: string, fallback: string): Promise<string> {
  const row = await db.meta.get(key);
  return row?.value ?? fallback;
}

async function readSentMap(table: string): Promise<SentMap> {
  const raw = await meta(sentKey(table), '');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SentMap;
  } catch {
    // A corrupt map only costs one redundant push, so recovering beats failing.
    return {};
  }
}

let channel: RealtimeChannel | null = null;
let syncing = false;

export const useSyncStore = create<SyncState>((set, get) => ({
  phase: 'signed-out',
  message: '',
  lastSyncAt: null,
  email: null,
  deviceNo: 1,
  deviceLabel: 'owner',
  deviceChosen: false,

  init: async () => {
    const [deviceNo, deviceLabel, chosen, lastSyncAt] = await Promise.all([
      getDeviceNo(), getDeviceLabel(), isDeviceChosen(), meta(LAST_SYNC_KEY, ''),
    ]);

    const { data } = await getSupabase().auth.getSession();
    set({
      deviceNo,
      deviceLabel,
      deviceChosen: chosen,
      lastSyncAt: lastSyncAt || null,
      email: data.session?.user.email ?? null,
      phase: data.session ? 'idle' : 'signed-out',
    });
  },

  signIn: async (email, password) => {
    set({ phase: 'syncing', message: 'Signing in…' });
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      set({ phase: 'signed-out', message: error.message });
      throw new Error(error.message);
    }

    set({ phase: 'idle', message: '', email: data.user?.email ?? null });
    await get().syncNow();
    await get().startLive();
  },

  signOut: async () => {
    get().stopLive();
    await getSupabase().auth.signOut();
    set({ phase: 'signed-out', email: null, message: '' });
  },

  chooseDevice: async (deviceNo, label) => {
    await setDeviceNo(deviceNo, label);
    set({ deviceNo, deviceLabel: label, deviceChosen: true });
  },

  /**
   * Push first, then pull.
   *
   * The order matters for edits: this device's changes reach the server and get
   * a fresh server timestamp before anything comes back, so a pull can never
   * overwrite a local edit that has not been sent yet.
   */
  syncNow: async () => {
    if (syncing) return;
    const supabase = getSupabase();

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      set({ phase: 'signed-out', message: 'Sign in to sync' });
      return;
    }

    syncing = true;
    set({ phase: 'syncing', message: 'Syncing…' });

    try {
      const deviceNo = await getDeviceNo();
      let pushed = 0;
      let pulled = 0;

      // ── push ──
      for (const table of PUSH_ORDER) {
        const local = (await db.table(table).toArray()) as Row[];
        const high = Number(await meta(highWaterKey(table), '0'));
        const sent = await readSentMap(table);
        const outgoing = rowsToPush(table, local, deviceNo, DEVICE_BLOCK, high, sent);
        if (outgoing.length === 0) continue;

        // Each page is confirmed before the next is sent, and progress is
        // recorded per page, so a connection dropping mid-push costs a retry of
        // one page rather than the whole table.
        for (let i = 0; i < outgoing.length; i += PAGE) {
          const batch = outgoing.slice(i, i + PAGE);
          const { error } = await supabase
            .from(table)
            .upsert(normalizeBatch(batch), { onConflict: 'id' });
          if (error) throw new Error(`${table}: ${error.message}`);
          pushed += batch.length;

          await db.meta.put({
            key: sentKey(table),
            value: JSON.stringify(updateSentMap(await readSentMap(table), batch)),
          });
        }

        await db.meta.put({
          key: highWaterKey(table),
          value: String(advanceHighWater(high, outgoing)),
        });
      }

      // ── pull ──
      for (const table of SYNC_TABLES) {
        let cursor = await meta(cursorKey(table), EPOCH);

        // Keep paging while pages come back full. `now()` is the transaction's
        // start time, so a whole batch shares one timestamp; stopping at a full
        // page could leave part of that group behind the cursor forever.
        for (;;) {
          const { data: remote, error } = await supabase
            .from(table)
            .select('*')
            .gt('updatedAt', cursor)
            .order('updatedAt', { ascending: true })
            .limit(PAGE);

          if (error) throw new Error(`${table}: ${error.message}`);
          if (!remote || remote.length === 0) break;

          const localRows = (await db.table(table).toArray()) as Row[];
          const localById = new Map<number, { updatedAt?: string }>(
            localRows.map((r) => [r.id as number, r as { updatedAt?: string }])
          );

          const sent = await readSentMap(table);
          const { toWrite } = planMerge(
            table,
            remote as (Row & { updatedAt?: string })[],
            localById,
            sent
          );

          if (toWrite.length > 0) {
            await db.table(table).bulkPut(toWrite);
            pulled += toWrite.length;

            // A row that arrived from the server already matches it, so record
            // it as sent. This is what stops this device pushing its copy back
            // and reverting an edit the other phone has since made.
            await db.meta.put({
              key: sentKey(table),
              value: JSON.stringify(updateSentMap(sent, toWrite)),
            });
          }

          const advanced = nextPullCursor(remote as { updatedAt?: string }[], cursor);
          await db.meta.put({ key: cursorKey(table), value: advanced });

          // A full page that did not move the cursor means one timestamp group
          // is larger than a page. Reading it again would spin, so stop and let
          // the next sync try — the merge rules make a re-read harmless.
          if (remote.length < PAGE || advanced === cursor) break;
          cursor = advanced;
        }
      }

      const now = new Date().toISOString();
      await db.meta.put({ key: LAST_SYNC_KEY, value: now });

      set({
        phase: 'idle',
        lastSyncAt: now,
        message:
          pushed === 0 && pulled === 0
            ? 'Already up to date'
            : `Sent ${pushed}, received ${pulled}`,
      });
    } catch (err) {
      console.error('Sync failed:', err);
      set({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      syncing = false;
    }
  },

  /**
   * Live updates. A change on the other phone triggers a pull rather than being
   * applied directly — the merge rules are the only path data takes into the
   * local books, so there is one place where a conflict can be got wrong.
   */
  startLive: async () => {
    const supabase = getSupabase();
    if (channel) return;

    channel = supabase.channel('shopbook-live');
    for (const table of ['sales', 'saleLines', 'expenses', 'stockMoves', 'payments', 'dayBook']) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => { void get().syncNow(); }
      );
    }
    channel.subscribe();
  },

  stopLive: () => {
    if (channel) {
      void getSupabase().removeChannel(channel);
      channel = null;
    }
  },
}));
