# AGENTS.md

Project rules. Read this before making any change. These constraints are not suggestions — a change that violates one is wrong even if it works.

---

## What this is

**ShopBook** — a billing, stock and day-book app for a Maharashtrian snacks outlet in Pune. Two channels: a walk-in counter and aggregators (Zomato, Swiggy). Two users: the **owner**, and a **helper** who works the floor and may read English as a second language.

The app is used standing up, one-handed, at a counter, sometimes with oily fingers, sometimes in direct sunlight, often with no mobile data. Every design and architecture decision follows from that sentence.

---

## Stack — locked, do not substitute

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Local database | **Dexie.js over IndexedDB** |
| Charts | Recharts |
| Mobile | Capacitor (Android) |
| Cloud sync | Supabase — **backup only, never in the write path** |

Do not add a UI component library, a CSS-in-JS runtime, a form library, an ORM, or a state manager other than Zustand. If a dependency seems necessary, say why and wait for approval.

---

## Hard architecture rules

1. **Offline-first, always.** Every write goes to Dexie first and returns immediately. Sync is a background job that can fail silently and retry. No user-facing action may ever await a network call. The counter must keep billing with the router unplugged.

2. **`stockMoves` is the only source of truth for stock.** Current quantity of any raw material is the *sum of its moves*, computed on read. Never store a `currentQty` column anywhere. Sales, purchases, wastage and physical counts all append signed rows to the same table with different `type` values. This is what makes a wrong number traceable to the row that caused it.

3. **Nothing is deleted, only reversed.** Deletion hides theft and mistakes. A correction appends a reversing entry with a reason and an author. The audit log is append-only.

4. **A day is opened, then locked.** Every transaction carries a `dayId`. Once a day is closed it is immutable; only the owner may reopen it, and reopening is itself logged.

5. **Roles are enforced in the data layer, not just the UI.** Helper may create sales, expenses and stock-in. Helper may not see profit, margin or cost, may not edit or reverse anything, and may not close a day. Hiding a button is not enforcement.

6. **Money is integers.** Store paise as integers. Never use floats for currency.

---

## Data model

Full schema in `docs/spec.md` §3. Dexie tables:

```
shops · users · dayBook · items · rawMaterials · recipes
sales · saleLines · stockMoves · purchases · expenses
customers · suppliers · payouts · auditLog
```

Index at minimum: `sales.dayId`, `stockMoves.rmId`, `stockMoves.dayId`, `saleLines.saleId`, `dayBook.date`.

---

## Design system

Full spec in `docs/design-system.md`. The essentials, as Tailwind theme extensions:

```js
colors: {
  base:'#0A1A14', surface:'#12291F', raised:'#1A3A2C',
  line:'#1F4534', lineStrong:'#2D6349',
  tx1:'#F5F2E8', tx2:'#9CB0A5', tx3:'#66817A',
  marigold:'#F5A623', marigoldPress:'#D68F17',
  success:'#3FBF7F', danger:'#E04B36', platform:'#A970C9',
}
```

- **Marigold is only ever a primary action or a rupee value.** Never a heading, never a border, never decoration. This rule gets broken first — watch for it.
- **Red only where the owner must act** — shortfall, low stock, wastage.
- Anton uppercase for screen titles, tile names, button labels, panel headers. Inter for body. JetBrains Mono with `tabular-nums` for **every** number.
- 4pt grid. Approved spacing: 4, 8, 12, 16, 24, 32. Nothing else.
- Radius: 6 inputs/chips · 10 cards/tiles/buttons · 14 sheets · full for pills.
- Borders, not shadows. Shadows are invisible on this palette.
- Minimum touch target 44px. Payment buttons 52px tall.
- Every interactive component ships with default, pressed, disabled and focus states.

> ⚠️ **`reference/ShopBook.jsx` uses an older, superseded palette.** Copy its *logic and component structure*, never its colour values or font sizes. The tokens above win.

---

## Code conventions

- TypeScript strict. No `any`.
- One component per file, named export, PascalCase filename.
- Business logic lives in `src/lib/`, never inside components. Stock deduction, COGS, cash reconciliation and payout matching are pure functions with unit tests.
- Zustand stores in `src/store/`, one slice per domain.
- Dexie schema and migrations in `src/db/`, versioned.
- All user-facing strings through `src/i18n/` from day one — Marathi is coming.

---

## Definition of done

A change is not finished until:

1. It builds with no TypeScript errors.
2. It works with DevTools set to offline.
3. Any new business logic has a unit test.
4. The browser agent has clicked through the affected flow and confirmed it behaves.
5. It respects every rule above.

---

## Do not

- Do not put a network call in a user-facing write path.
- Do not add a `currentQty` field to `rawMaterials`.
- Do not use `localStorage` or `sessionStorage` — Dexie only.
- Do not add authentication providers. Role selection is a local PIN.
- Do not redesign screens that were not part of the request.
- Do not "improve" the palette or type scale. They are decided.
- Do not add animations beyond those in the design spec.
- Do not scaffold a backend. Supabase is a sync target, not an API.

---

## Commands

```bash
npm run dev            # Vite dev server
npm run build          # production build
npm run test           # unit tests
npx cap sync android   # push web build into the Android project
npx cap open android   # open Android Studio to produce the APK
```

---

## Build order

Ship each phase and run the real shop on it before starting the next.

1. **Phase 1** — day open, counter sales, expenses, day close with cash reconciliation.
2. **Phase 2** — item and recipe master, stock-in, auto-deduction, wastage, low-stock alerts.
3. **Phase 3** — aggregator orders, commission, payout reconciliation, khata, P&L.
4. **Phase 4** — forecasting, suggested purchase quantities, Marathi.

Do not build ahead of the current phase.
