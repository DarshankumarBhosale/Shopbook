import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { db } from '../db/schema';

/**
 * The shop's cloud project. Both values are public by design: the publishable
 * key is meant to ship inside the app, and row level security means it is
 * worthless without a signed-in session. The password is what protects the
 * books, not this key.
 *
 * Overridable by env vars so a different shop, or a test project, needs no
 * code change.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://qjxxtifgqpqvmgaxpyfw.supabase.co';

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_Dj-jrBbdoEyUP0Ry8XYxAQ_qHpgVKkz';

/**
 * Session storage backed by Dexie rather than localStorage.
 *
 * AGENTS.md forbids localStorage, and there is a practical reason here too: a
 * WebView can have its local storage cleared out from under the app, which
 * would sign the counter out mid-service. The meta table is the same store
 * everything else already survives in.
 */
const dexieAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const row = await db.meta.get(`auth:${key}`);
    return row?.value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await db.meta.put({ key: `auth:${key}`, value });
  },
  async removeItem(key: string): Promise<void> {
    await db.meta.delete(`auth:${key}`);
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: dexieAuthStorage,
        storageKey: 'shopbook',
        persistSession: true,
        autoRefreshToken: true,
        // No redirects in a WebView — sign-in is email and password only.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** True once the shop has a project configured at all. */
export function isSyncConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
