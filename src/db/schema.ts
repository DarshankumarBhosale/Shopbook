import Dexie, { type Table } from 'dexie';
import type {
  Shop, User, DayBook, Item, RawMaterial, Recipe,
  Sale, SaleLine, StockMove, Purchase, Expense,
  Customer, Supplier, Payout, AuditLogEntry,
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
  }
}

export const db = new ShopBookDB();
