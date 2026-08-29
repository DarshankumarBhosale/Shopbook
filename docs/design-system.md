# ShopBook — Figma Design Specification

Everything needed to rebuild the interface in Figma, or to feed an AI design tool. Section 9 is the copy-paste prompt.

---

## 1. What was wrong with the first pass

Worth stating, because the fixes below only make sense against these problems.

| Problem | Fix |
|---|---|
| Base, cards and borders were all similar dark greens — the screen read flat | A three-step surface ladder with real contrast between each level |
| One accent carried buttons, prices, headings, chips and selected states at once — so it stopped meaning anything | Two accents with one job each: navy for what you press, mint for money coming in. |
| Font sizes ran 10, 11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32, 40, 52 — no system | An eight-step named scale |
| Spacing mixed 10/12/14/16/24px arbitrarily | 4pt base grid, six approved steps |
| All-text navigation, slow to scan for a helper reading a second language | Icon + label on every tab |
| No pressed, disabled, focus or empty states defined | Four states specified per interactive component |

---

## 2. Colour

Single light theme. A dark UI washes out in a stall facing the street at midday,
which is exactly when the counter is busiest, so the app is built for daylight
and stays legible under a bulb at 9pm.

| Token | Hex | Use |
|---|---|---|
| `bg/base` | `#F9FAFB` | Screen background |
| `bg/surface` | `#FFFFFF` | Cards, tiles, sheets, tab bar |
| `bg/raised` | `#F3F4F6` | Grouped and inset blocks |
| `line/subtle` | `#E5E7EB` | Dividers, card borders |
| `line/strong` | `#CBD5E1` | Input underlines, focus borders |
| `text/1` | `#111827` | Item names, data, tables — 16:1 |
| `text/2` | `#4B5563` | Supporting copy — 7.5:1 |
| `text/3` | `#6B7280` | Labels, meta, disabled — 4.6:1 |
| `text/inverse` | `#FFFFFF` | Text on navy — 10:1 |
| `text/onAccent` | `#06281F` | Text on mint |
| `brand/primary` | `#1E3A8A` | Headers, nav, anything you press |
| `brand/primaryPressed` | `#172E6B` | Pressed primary |
| `accent` | `#10B981` | Save/Checkout fills, positive chips |
| `accent/text` | `#047857` | Sales and profit figures — 5.5:1 |
| `success` | `#047857` | Positive variance, healthy margin |
| `danger` | `#EF4444` | Alert fills and borders |
| `danger/text` | `#DC2626` | Alert text — 4.5:1 |
| `platform` | `#7C3AED` | Aggregator context |
| `zomato` | `#E23744` | Zomato chip only |
| `swiggy` | `#FC8019` | Swiggy chip only |

**Rules.**

- Navy is anything you press. Never body text, never a decorative rule.
- Mint is money coming in — sales, profit, and the button that commits a sale.
  Never on a negative number: a loss rendered in mint reads as a gain.
- Mint at full strength is only ~2.4:1 on this ground, so it fills shapes and
  never carries small text. `accent` fills, `accent/text` writes. Coral splits
  the same way.
- Text on a mint fill is `text/onAccent`, not white — white on mint is 2.4:1.
- Coral only where the owner must act: shortfall, low stock, wastage, reversals.
- Platform brand colours never leave their chip.
- All body text clears 4.5:1; large display text 3:1.

---

## 3. Typography

Two families. Anton for display, Inter for everything else, JetBrains Mono for numbers.

| Style | Font | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display-xl` | Mono | 42 / 42 | 700 | −2% | The money hero |
| `display-l` | Anton | 30 / 32 | — | +2% | Screen titles |
| `display-m` | Anton | 19 / 22 | — | +6% | Button labels, panel headers |
| `display-s` | Anton | 13 / 14 | — | +1% | Item tile names |
| `body-l` | Inter | 16 / 24 | 400 | 0 | Reading text |
| `body-m` | Inter | 14 / 20 | 400 | 0 | Rows, list items |
| `body-s` | Inter | 12 / 16 | 400 | 0 | Meta, captions |
| `label` | Inter | 10 / 12 | 600 | +12% caps | Eyebrows above values |
| `mono-l` | Mono | 21 / 26 | 700 | 0 | Section totals |
| `mono-m` | Mono | 15 / 20 | 700 | 0 | Row values, stock qty |

Anton appears in exactly four places: screen titles, tile names, button labels, panel headers. Everywhere else it is Inter. **Every number uses tabular figures** so digits don't shift columns as they change.

---

## 4. Spacing, radius, elevation

**Grid:** 4pt base. Approved steps: `4, 8, 12, 16, 24, 32`. Nothing else.

- Screen side margin: `16`
- Card padding: `14`
- Gap between cards: `8`
- Gap between sections: `24`
- Board tile gap: `7`

**Radius:** `sm 6` inputs and chips · `md 10` cards, tiles, buttons · `lg 14` sheets · `full 999` pills and badges.

**Elevation** comes from the surface ladder plus a 1px hairline border. Shadows are optional and must stay subtle; the border does the work.

**Touch targets:** minimum 44×44 everywhere. Primary payment buttons 52 tall. Board tiles minimum 74 tall. Tab bar 60 plus safe area.

---

## 5. Components

Build each as a Figma component set with the variants listed. Use auto-layout throughout.

| Component | Variants | Notes |
|---|---|---|
| **Button** | `type`: primary / secondary / ghost / platform · `state`: default / pressed / disabled / focus | Height 52 (42 for the compact row). Auto-layout, fill container. |
| **ItemTile** | `state`: default / selected / out-of-stock | 3-col grid. Selected inverts to navy fill with inverse text. Qty badge overlaps top-right by 6px. Out-of-stock is 38% opacity. |
| **Chip** | `state`: default / selected · `brand`: none / zomato / swiggy | Pill, 7×11 padding. |
| **StatCard** | `tone`: neutral / good / bad / brand | Eyebrow label above mono value. |
| **LedgerRow** | `emphasis`: normal / total | Total gets a top divider and a 21px mint value. |
| **ListRow** | `state`: normal / alert | Title + meta on the left, mono value right. Alert turns the value red. |
| **AmountField** | `state`: empty / filled / error | 34px mono on a 2px underline. Never a boxed input. |
| **BottomSheet** | `content`: cart / stock / payment | 2px navy top border, `lg` radius top corners. |
| **AlertBanner** | `tone`: danger / info | Icon + Anton heading + body. |
| **TabBar** | `active`: sell / stock / money / reports / more | Icon 20px above 9.5px caps label. Active gets a 2px navy top border. Badge is a red pill. |
| **Toast** | — | Navy fill, white text, floats 92 above the bottom. |
| **EmptyState** | — | Anton line in `text/2`, one sentence in `text/3`, pointing at the next action. |

**Icons:** Lucide, 24px canvas, 1.8 stroke, round caps. Needed set — bag, box, banknote, bar-chart, ellipsis, alert-triangle, plus, minus, x, arrow-left, check, bike.

---

## 6. Screens to draw

Fourteen frames at 390×844, in flow order.

1. Role select
2. Start day
3. Sell — counter (board)
4. Sell — counter with cart sheet
5. Sell — aggregator
6. Khata picker in sheet
7. Stock list with low-stock alert
8. Stock in sheet
9. Wastage sheet
10. Expense entry
11. Khata ledger
12. Payout reconciliation
13. Close day, with variance state
14. Reports

---

## 7. Motion

| Interaction | Spec |
|---|---|
| Button / tile press | `scale .97`, 80ms ease-out |
| Sheet in | slide up 240ms, cubic-bezier(.2,.8,.2,1) |
| Tab change | crossfade 120ms, no slide |
| Toast | fade + 8px rise, 180ms in, hold 2.2s |
| Stock deduction | the affected row flashes mint at 20% for 400ms |

Everything wrapped in `prefers-reduced-motion`.

---

## 8. Figma file setup

**Pages:** `00 Cover` · `01 Foundations` · `02 Components` · `05 Prototype` · `06 Handoff`

**Variables:** one collection `theme` with modes `Night` and `Daylight`; one collection `primitives` for spacing and radius. Screens reference variables only, never raw hex — this is what lets you flip the whole file to Daylight in one click.

**Naming:** `Component/Variant/State`, for example `Button/Primary/Pressed`. Screens as `03 · Sell — Counter`.

**Styles:** the ten text styles in Section 3, named exactly as listed.

---

## 9. Prompt for an AI design tool

Paste this whole block into Figma Make, v0, or similar.

> Design a mobile app interface for **ShopBook**, a billing and stock app used at the counter of a Maharashtrian snacks shop in Pune. Two users: the owner, and a helper who works the floor and may read English as a second language. The interface must be usable one-handed, at speed, with oily fingers.
>
> **Visual concept:** a crisp daylight point-of-sale — off-white surfaces, heavy condensed uppercase lettering, deep navy for anything you press and mint green for money coming in. It should feel like a working tool, not a startup dashboard.
>
> **Colours.** Background `#F9FAFB`, cards `#FFFFFF`, raised surfaces `#F3F4F6`, borders `#E5E7EB`. Text `#111827` primary, `#4B5563` secondary, `#6B7280` labels. Navy `#1E3A8A` for headers, navigation and primary buttons. Mint `#10B981` for sales figures, profit and the Save/Checkout button, written as `#047857` wherever it is small text. Coral `#EF4444` strictly for low stock, shortfall, wastage and reversals. No gradients, no glassmorphism.
>
> **Type.** Anton uppercase for screen titles, menu tile names, button labels and panel headers. Inter for all body text and labels. JetBrains Mono with tabular figures for every number. Eyebrow labels are 10px Inter 600, uppercase, +12% letter-spacing.
>
> **Layout.** 4pt grid, 16px screen margins, 10px card radius, 1px borders instead of shadows. Minimum 44px touch targets; payment buttons 52px tall.
>
> **Screens to produce:** (1) start-of-day cash count, a single large number entry; (2) the sell screen — a 3-column grid of menu tiles showing item name and price, where selected tiles invert to navy and carry a quantity badge, above a bottom sheet with the running total and three payment buttons Cash / UPI / Khata; (3) a stock list with a red "buy today" alert banner and rows showing quantity in hand; (4) end-of-day cash reconciliation showing expected versus counted with a shortfall highlighted in red; (5) a reports screen with four stat cards, a seven-day bar chart, and horizontal margin bars per item.
>
> **Content — use these exact strings:** Vada Pav ₹20, Misal Pav ₹70, Batata Vada ₹15, Samosa ₹20, Kanda Bhaji ₹50, Poha ₹30, Upma ₹30, Chai ₹15. Sales today ₹2,340, 47 orders. Low stock: Pav, Chutney, Coffee powder. Drawer should hold ₹3,550, counted ₹3,470, short ₹80.
>
> **Navigation:** a five-item bottom tab bar — Sell, Stock, Money, Reports, More — each with a 20px Lucide outline icon above a 9.5px uppercase label, the active tab marked by a navy top border.

---

## 10. Handoff back to code

The CSS custom properties at the top of `shopbook-design-board.html` are the same tokens as Section 2. Once the Figma file exists, the port into the React app is a find-and-replace of the `C` colour object plus adopting the type scale — the component structure already matches this spec.
