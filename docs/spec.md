# Shop Management App — Feature Spec

A daily-operations app for a snacks outlet running two channels: walk-in counter and aggregator (Zomato/Swiggy), with one helper on the floor.

---

## 1. Design rules (decide these before any code)

| Rule | Why it matters |
|---|---|
| **Offline-first** | The shop cannot stop billing because mobile data dropped. Write to local DB, sync later. |
| **A sale must take under 5 seconds** | If entry is slow, the helper stops using it by week two and the data becomes useless. Big tap targets, item grid, no typing. |
| **Two roles: Owner and Helper** | Helper can add sales, expenses, stock-in. Only Owner sees profit, margins, and can edit or delete past entries. |
| **Nothing is deleted, only reversed** | Deletions hide theft and errors. Use a reversal entry with a reason. |
| **Day-book model** | Every transaction belongs to a day that gets opened and locked. This is what makes cash reconciliation possible. |
| **Bilingual labels** | English + Marathi/Hindi toggle so the helper is never guessing. |

---

## 2. Core modules

### A. Day Book
- Start Day: opening cash, opening stock auto-carried from yesterday's close
- Close Day: expected vs counted cash, mandatory note on any mismatch, day locked after close
- Handles the weekly holiday (shop closed Mondays) — no false "missing day" alerts

### B. Sales
- Menu grid with photos/large buttons, quantity stepper
- Payment modes: Cash / UPI / Card / Udhaar
- Aggregator entry: order ID, gross value, platform, commission %, packaging charge → app computes expected net payout
- Quick "repeat last order" button for regulars
- Optional: thermal printer or WhatsApp bill

### C. Item & Recipe Master
This is the module that generic apps get wrong and is the strongest reason to build your own.
- Item master: name, selling price, category, active/inactive
- **Recipe (BOM) mapping**: 1 vada pav = 1 pav + 1 batata vada + 15g chutney + 1 tissue
- Separate price lists for counter vs aggregator (aggregator prices are usually marked up to absorb commission)

### D. Inventory
- Stock In: item, quantity, rate, supplier → updates weighted average cost
- Auto-deduction on every sale via the recipe map
- **Wastage log**: spoiled / spilled / unsold at close / staff meal — a perishables business lives or dies on this number
- Reorder level per item → low-stock alerts and an auto-built purchase list
- Physical stock audit screen: enter counted qty, system records the variance (this is your shrinkage number)

### E. Purchases & Expenses
- Categories: raw material, gas cylinder, rent, salary, electricity, packaging, repairs, misc
- Supplier ledger with outstanding balance and payment history
- Recurring expense templates (rent, salary) so they are never forgotten
- Photo of the bill attached to the entry

### F. Cash & Bank
- Cash drawer balance, live
- UPI/bank collections tracked separately
- Cash deposit entry (drawer → bank)
- Owner drawings logged separately from business expenses

### G. Udhaar / Credit
- Customer ledger, outstanding amount, ageing (0–7, 8–15, 15+ days)
- WhatsApp reminder with one tap

### H. Reports & Dashboard
- Today: sales, cash in hand, top item, low-stock count
- Sales trend: day / week / month, with day-of-week pattern
- Best sellers and slow movers by quantity **and** by contribution to profit (these are different lists)
- Channel mix: counter vs aggregator, and margin on each after commission
- Wastage as % of production
- P&L: revenue − COGS − expenses, with gross and net margin %
- **Payout reconciliation**: aggregator settles net, roughly weekly. Track expected payout vs amount actually credited and flag gaps — this alone catches money most owners never notice is missing.

### I. Settings & Data
- Masters: items, recipes, suppliers, expense categories, units
- Cloud backup + restore, CSV/Excel export
- Audit log of every edit with user and timestamp

---

## 3. Data model (tables)

```
shops            id, name, address, weekly_off
users            id, name, role, pin
day_book         id, date, opening_cash, closing_cash_expected,
                 closing_cash_counted, variance, note, status
items            id, name, category, sell_price_counter,
                 sell_price_online, is_active
raw_materials    id, name, unit, avg_cost, current_qty, reorder_level
recipes          id, item_id, raw_material_id, qty_per_unit
sales            id, day_id, channel, order_ref, gross_amount,
                 commission_amt, net_amount, payment_mode,
                 customer_id, created_by, created_at
sale_lines       id, sale_id, item_id, qty, rate, amount
stock_moves      id, day_id, raw_material_id, type, qty, rate, reason
purchases        id, day_id, supplier_id, amount, payment_mode, bill_photo
expenses         id, day_id, category, amount, payment_mode, note
customers        id, name, phone, outstanding
suppliers        id, name, phone, outstanding
payouts          id, platform, period_from, period_to,
                 expected_amount, received_amount, variance
```

The `stock_moves` table should be the single source of truth for inventory — sales, purchases, wastage and audits all write into it as different `type` values. Never let two tables both claim to hold "current stock".

---

## 4. Build in phases

**Phase 1 — the day book (target: 2 weeks).** Start Day, sales entry (cash/UPI only), expenses, Close Day with cash reconciliation, basic day summary. Ship this and run the actual shop on it for two weeks. If it survives real use, continue. If the helper avoids it, fix the entry speed before adding anything.

**Phase 2 — inventory.** Item master, recipes, stock-in, auto-deduction, wastage, low-stock alerts.

**Phase 3 — the money layer.** Aggregator orders, commission, payout reconciliation, supplier and customer ledgers, full P&L.

**Phase 4 — intelligence.** Sales forecasting by weekday, suggested purchase quantities, festival/season adjustments.

---

## 5. Suggested stack

Same stack as CashQuest, so there is no learning curve:

- **React 18 + TypeScript + Vite**, Tailwind, Zustand for state
- **Dexie.js over IndexedDB** for the local offline database — this is the key addition; it is what makes the app work with no network
- **Recharts** for reports
- **Capacitor Android** to ship it as an installable APK
- **Supabase** (free tier) for cloud sync and backup when online

---

## 6. One honest caution

Vyapar, myBillBook and Khatabook already cover Phases 1 and 3 for a few hundred rupees a month. What they do **not** do well is recipe-level raw material deduction for a made-to-order snacks kitchen, or aggregator payout reconciliation — so those two features are the real justification for building your own. Build it if you want the operational control and a portfolio project that maps directly onto retail operations coursework. Do not build it expecting it to be cheaper than the off-the-shelf option; it will not be.
