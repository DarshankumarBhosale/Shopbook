import { create } from 'zustand';
import { db } from '../db/schema';
import type { Payment, PaymentMode, Customer } from '../db/types';
import { toPaise, formatRupees } from '../lib/format';
import { recordAudit } from '../db/audit';

interface KhataState {
  addCustomer: (name: string, phone?: string) => Promise<number>;
  setPhone: (customerId: number, phone: string) => Promise<void>;
  receivePayment: (params: {
    dayId: number;
    customerId: number;
    amountRupees: number | string;
    paymentMode: PaymentMode;
    note?: string;
  }) => Promise<number>;
}

export const useKhataStore = create<KhataState>(() => ({
  addCustomer: async (name, phone = '') => {
    const trimmed = name.trim();
    if (trimmed === '') throw new Error('Customer needs a name');
    return await db.customers.add({ name: trimmed, phone: phone.trim() } as Customer);
  },

  setPhone: async (customerId, phone) => {
    await db.customers.update(customerId, { phone: phone.trim() });
  },

  receivePayment: async ({ dayId, customerId, amountRupees, paymentMode, note }) => {
    const amount = toPaise(amountRupees);
    if (amount <= 0) throw new Error('Payment must be greater than zero');

    const record: Omit<Payment, 'id'> = {
      dayId,
      customerId,
      amount,
      paymentMode,
      note: (note || '').trim(),
      createdAt: new Date().toISOString(),
    };

    let id = 0;
    await db.transaction('rw', [db.payments, db.customers, db.auditLog], async () => {
      const who = await db.customers.get(customerId);
      id = await db.payments.add(record as Payment);
      await recordAudit({
        action: 'khata.receive',
        detail: `${formatRupees(amount)} from ${who?.name ?? `#${customerId}`} · ${paymentMode}`,
        dayId,
      });
    });

    return id;
  },
}));
