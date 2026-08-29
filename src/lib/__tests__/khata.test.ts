import { describe, it, expect } from 'vitest';
import { computeKhataBalances, computeTotalOutstanding } from '../khata';
import type { Sale, Payment, Customer } from '../../db/types';

const customers: Customer[] = [
  { id: 1, name: 'Auto stand bhaiya', phone: '' },
  { id: 2, name: 'Salon next door', phone: '' },
];

function sale(over: Partial<Sale>): Sale {
  return {
    id: 1, dayId: 1, channel: 'counter', grossAmount: 0, commissionAmt: 0,
    netAmount: 0, cogs: 0, paymentMode: 'Udhaar',
    createdAt: '2026-08-29T04:00:00.000Z', ...over,
  };
}

function payment(over: Partial<Payment>): Payment {
  return {
    id: 1, dayId: 1, customerId: 1, amount: 0, paymentMode: 'Cash',
    createdAt: '2026-08-29T10:00:00.000Z', ...over,
  };
}

describe('computeKhataBalances', () => {
  const now = new Date('2026-08-31T04:00:00.000Z');

  it('nets Udhaar sales against payments received', () => {
    const sales = [
      sale({ id: 1, customerId: 1, grossAmount: 5000 }),
      sale({ id: 2, customerId: 1, grossAmount: 3000 }),
    ];
    const payments = [payment({ customerId: 1, amount: 2000 })];

    const [auto] = computeKhataBalances(customers, sales, payments, now);

    expect(auto.chargedPaise).toBe(8000);
    expect(auto.paidPaise).toBe(2000);
    expect(auto.outstandingPaise).toBe(6000);
  });

  it('ignores cash and UPI sales — only khata is owed', () => {
    const sales = [
      sale({ id: 1, customerId: 1, grossAmount: 5000, paymentMode: 'Cash' }),
      sale({ id: 2, customerId: 1, grossAmount: 1500, paymentMode: 'UPI' }),
      sale({ id: 3, customerId: 1, grossAmount: 2000, paymentMode: 'Udhaar' }),
    ];

    const [auto] = computeKhataBalances(customers, sales, [], now);

    expect(auto.outstandingPaise).toBe(2000);
  });

  it('clamps an overpayment to zero rather than showing negative debt', () => {
    const sales = [sale({ customerId: 1, grossAmount: 1000 })];
    const payments = [payment({ customerId: 1, amount: 2500 })];

    const [auto] = computeKhataBalances(customers, sales, payments, now);

    expect(auto.outstandingPaise).toBe(0);
    expect(auto.daysOutstanding).toBeNull();
  });

  it('ages from the oldest unpaid sale', () => {
    const sales = [
      sale({ id: 1, customerId: 1, grossAmount: 1000, createdAt: '2026-08-29T04:00:00.000Z' }),
      sale({ id: 2, customerId: 1, grossAmount: 1000, createdAt: '2026-08-30T04:00:00.000Z' }),
    ];

    const [auto] = computeKhataBalances(customers, sales, [], now);

    expect(auto.daysOutstanding).toBe(2);
  });

  it('keeps each customer separate and sorts by who owes most', () => {
    const sales = [
      sale({ id: 1, customerId: 1, grossAmount: 1000 }),
      sale({ id: 2, customerId: 2, grossAmount: 9000 }),
    ];

    const balances = computeKhataBalances(customers, sales, [], now);

    expect(balances[0].name).toBe('Salon next door');
    expect(balances[0].outstandingPaise).toBe(9000);
    expect(balances[1].outstandingPaise).toBe(1000);
  });

  it('reports zero for a customer who has never taken khata', () => {
    const balances = computeKhataBalances(customers, [], [], now);
    expect(balances.every((b) => b.outstandingPaise === 0)).toBe(true);
    expect(balances.every((b) => b.daysOutstanding === null)).toBe(true);
  });
});

describe('computeTotalOutstanding', () => {
  it('sums what the whole khata is owed', () => {
    const sales = [
      sale({ id: 1, customerId: 1, grossAmount: 1000 }),
      sale({ id: 2, customerId: 2, grossAmount: 9000 }),
    ];
    const balances = computeKhataBalances(customers, sales, [], new Date());
    expect(computeTotalOutstanding(balances)).toBe(10000);
  });

  it('is zero when nothing is owed', () => {
    expect(computeTotalOutstanding([])).toBe(0);
  });
});
