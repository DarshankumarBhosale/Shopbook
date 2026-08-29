import Dexie, { type Table } from 'dexie';
import type {
  Shop, User, DayBook, Item, RawMaterial, Recipe,
  Sale, SaleLine, StockMove, Purchase, Expense,
  Customer, Supplier, Payout, AuditLogEntry, Payment,
} from './types';

export class ShopBookDB extends Dexie {
  shops!: Table<Shop, number>;
  users!: Table<User, number>;
  dayBook!: Table<DayBook, number>;
  items!: Table<Item, number>;
  rawMaterials!: Table<RawMaterial, number>;
  recipes!: Table<Recipe, number>;
  sales!: Table<Sale, number>;
  saleLines!: Table<SaleLine, number>;
  stockMoves!: Table<StockMove, number>;
  purchases!: Table<Purchase, number>;
  expenses!: Table<Expense, number>;
  customers!: Table<Customer, number>;
  suppliers!: Table<Supplier, number>;
  payouts!: Table<Payout, number>;
  auditLog!: Table<AuditLogEntry, number>;
  payments!: Table<Payment, number>;

  constructor() {
    super('shopbook');

    this.version(1).stores({
      shops:        '++id, name',
      users:        '++id, name, role',
      dayBook:      '++id, date, status',
      items:        '++id, name, category, sortOrder',
      rawMaterials: '++id, name, unit',
      recipes:      '++id, itemId, rawMaterialId',
      sales:        '++id, dayId, channel, paymentMode, createdAt',
      saleLines:    '++id, saleId, itemId',
      stockMoves:   '++id, dayId, rmId, type',
      purchases:    '++id, dayId, supplierId',
      expenses:     '++id, dayId, category',
      customers:    '++id, name, phone',
      suppliers:    '++id, name, phone',
      payouts:      '++id, platform',
      auditLog:     '++id, dayId, userId, action, createdAt',
    });

    // v2 replaces the demo menu that shipped with v1 with the real
    // Aaisaheb Snacks Center menu. Item and raw-material IDs are different
    // between the two, so every row that references them (recipes, stock
    // moves, sale lines) would point at the wrong record if kept. The v1
    // data was demo data only, so the upgrade clears it and lets the seeder
    // repopulate from scratch on next open.
    this.version(2).stores({}).upgrade(async (tx) => {
      await Promise.all([
        tx.table('shops').clear(),
        tx.table('dayBook').clear(),
        tx.table('items').clear(),
        tx.table('rawMaterials').clear(),
        tx.table('recipes').clear(),
        tx.table('sales').clear(),
        tx.table('saleLines').clear(),
        tx.table('stockMoves').clear(),
        tx.table('purchases').clear(),
        tx.table('expenses').clear(),
        tx.table('customers').clear(),
      ]);
    });

    // v3 rebuilds the raw material master and recipes from the shop's
    // standardized recipe book. Raw-material IDs are reassigned, so recipes
    // and stockMoves (which key on rmId) must be rebuilt rather than kept.
    // Items keep their IDs, so trading history — dayBook, sales, saleLines
    // and expenses — is preserved and still resolves.
    this.version(3).stores({}).upgrade(async (tx) => {
      await Promise.all([
        tx.table('items').clear(),
        tx.table('rawMaterials').clear(),
        tx.table('recipes').clear(),
        tx.table('stockMoves').clear(),
      ]);
    });

    // v4 drops Misal Pav and Sheera from the menu and corrects the chicken
    // rate. Only items and recipes are cleared so the seeder rebuilds them;
    // raw materials upsert in place and stockMoves are left alone, so stock
    // counts on hand survive this upgrade.
    this.version(4).stores({}).upgrade(async (tx) => {
      await Promise.all([
        tx.table('items').clear(),
        tx.table('recipes').clear(),
      ]);
    });

    // v5 adds khata: Udhaar sales post against a customer, and money received
    // is recorded in its own table so what a customer owes stays computed
    // rather than stored. Raw materials also gain a category, so the buy list
    // groups by where you actually shop. Only the raw material master is
    // cleared and re-seeded; stock, sales and khata history are untouched.
    this.version(5).stores({
      payments: '++id, dayId, customerId, createdAt',
    }).upgrade(async (tx) => {
      // Seeding is gated on `items` being empty, so the item master has to be
      // cleared for the reseed to run at all; recipes go with it because they
      // are re-added rather than upserted. Stock moves, sales, expenses and
      // the day book are all left intact.
      await Promise.all([
        tx.table('items').clear(),
        tx.table('recipes').clear(),
        tx.table('rawMaterials').clear(),
      ]);
    });
  }
}

export const db = new ShopBookDB();
