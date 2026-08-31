import type { Table } from 'dexie';
import { db } from './schema';

/**
 * Globally unique IDs across devices, without changing the ID type.
 *
 * Two phones billing offline both used to allocate sale 1, 2, 3… so the moment
 * their books met, the helper's first sale and the owner's first sale claimed
 * the same row. Instead of rewriting every foreign key to a UUID — which would
 * mean touching every reference in the app and risking a silent mis-link — each
 * phone allocates from its own block of numbers:
 *
 *   device 1 → 1_000_000_000_000 and up
 *   device 2 → 2_000_000_000_000 and up
 *
 * IDs stay plain integers, every existing `saleId` / `itemId` / `dayId`
 * reference keeps working untouched, and merging is a straight union because
 * no two devices can ever mint the same number.
 *
 * Seeded rows keep their small IDs (1–120). Both phones seed identically from
 * the same file, so those rows are the same record on both and merge cleanly.
 */
export const DEVICE_BLOCK = 1_000_000_000_000;

/** Highest device number that still leaves IDs inside JS's safe integer range. */
export const MAX_DEVICE_NO = 8;

const DEVICE_KEY = 'deviceNo';
const LABEL_KEY = 'deviceLabel';

let cachedDeviceNo: number | null = null;

/** Which phone this is. Defaults to 1 until sync setup assigns one. */
export async function getDeviceNo(): Promise<number> {
  if (cachedDeviceNo !== null) return cachedDeviceNo;
  const row = await db.meta.get(DEVICE_KEY);
  cachedDeviceNo = row ? Number(row.value) : 1;
  return cachedDeviceNo;
}

export async function setDeviceNo(deviceNo: number, label: string): Promise<void> {
  if (!Number.isInteger(deviceNo) || deviceNo < 1 || deviceNo > MAX_DEVICE_NO) {
    throw new Error(`Device number must be between 1 and ${MAX_DEVICE_NO}`);
  }
  await db.meta.bulkPut([
    { key: DEVICE_KEY, value: String(deviceNo) },
    { key: LABEL_KEY, value: label },
  ]);
  cachedDeviceNo = deviceNo;
}

/**
 * Whether this phone has actually been told which device it is.
 *
 * The default of 1 is only a fallback for a single-phone shop. If the helper's
 * phone never chooses, both phones mint IDs from the same block and the first
 * sale each rings up claims the same row — so the UI has to show this as unset
 * rather than quietly looking configured.
 */
export async function isDeviceChosen(): Promise<boolean> {
  return (await db.meta.get(DEVICE_KEY)) !== undefined;
}

export async function getDeviceLabel(): Promise<string> {
  const row = await db.meta.get(LABEL_KEY);
  return row?.value ?? 'owner';
}

/** Only for tests — clears the in-process cache. */
export function resetDeviceCache(): void {
  cachedDeviceNo = null;
}

/** Pure: the block of IDs a device owns. */
export function deviceRange(deviceNo: number): { from: number; to: number } {
  return { from: deviceNo * DEVICE_BLOCK, to: (deviceNo + 1) * DEVICE_BLOCK - 1 };
}

/** Pure: which device minted an ID, or null for a seeded row. */
export function deviceOfId(id: number): number | null {
  if (id < DEVICE_BLOCK) return null;
  return Math.floor(id / DEVICE_BLOCK);
}

/**
 * The next free ID in this device's block for a table.
 *
 * Derived from the highest ID already in the block rather than a stored
 * counter, so a restored backup or a half-finished write can never hand out an
 * ID that is already taken. Must be called inside the same transaction as the
 * insert it is for.
 */
export async function nextId<T, K>(table: Table<T, K>): Promise<number> {
  const deviceNo = await getDeviceNo();
  const { from, to } = deviceRange(deviceNo);

  const highest = await table
    .where(':id')
    .between(from, to, true, true)
    .last();

  const lastId = highest ? Number((highest as { id?: number }).id ?? from) : from;
  return Math.max(lastId + 1, from + 1);
}

/**
 * A run of consecutive free IDs, for inserting several rows at once.
 * Allocated in one go so a bulk insert can't interleave with itself.
 */
export async function nextIds<T, K>(table: Table<T, K>, count: number): Promise<number[]> {
  if (count <= 0) return [];
  const start = await nextId(table);
  return Array.from({ length: count }, (_, i) => start + i);
}

/** Attaches freshly allocated IDs to a batch of rows. */
export async function withIds<T, K>(table: Table<T, K>, rows: T[]): Promise<T[]> {
  const ids = await nextIds(table, rows.length);
  return rows.map((row, i) => ({ ...row, id: ids[i] }));
}
