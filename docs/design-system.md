# ShopBook — Figma Design Specification

Everything needed to rebuild the interface in Figma, or to feed an AI design tool. Section 9 is the copy-paste prompt.

---

## 1. What was wrong with the first pass

Worth stating, because the fixes below only make sense against these problems.

| Problem | Fix |
|---|---|
| Base, cards and borders were all similar dark greens — the screen read flat | A three-step surface ladder with real contrast between each level |
| Marigold was on buttons, prices, headings, chips and selected states at once — so it stopped meaning anything | Marigold restricted to **actions and money**. Nothing else may use it. |
| Font sizes ran 10, 11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32, 40, 52 — no system | An eight-step named scale |
| Spacing mixed 10/12/14/16/24px arbitrarily | 4pt base grid, six approved steps |
| All-text navigation, slow to scan for a helper reading a second language | Icon + label on every tab |
| No pressed, disabled, focus or empty states defined | Four states specified per interactive component |

---

## 2. Colour

Two modes as Figma variable modes on one collection called `theme`.

### Night (default — indoor and evening)

| Token | Hex | Use |
|---|---|---|
| `bg/base` | `#0A1A14` | Screen background |
| `bg/surface` | `#12291F` | Cards, tiles, tab bar |
| `bg/raised` | `#1A3A2C` | Bottom sheet, pressed tiles |
| `line/subtle` | `#1F4534` | Dividers, card borders |
| `line/strong` | `#2D6349` | Input underlines, focus borders |
| `text/1` | `#F5F2E8` | Primary text |
| `text/2` | `#9CB0A5` | Secondary text |
| `text/3` | `#66817A` | Labels, disabled |
| `text/inverse` | `#0A1A14` | Text on marigold |
| `brand/marigold` | `#F5A623` | Primary action, money |
| `brand/pressed` | `#D68F17` | Pressed primary |
| `success` | `#3FBF7F` | Positive variance, healthy margin |
| `danger` | `#E04B36` | Shortfall, low stock, wastage |
| `platform` | `#A970C9` | Aggregator context |
| `zomato` | `#E23744` | Zomato chip only |
| `swiggy` | `#FC8019` | Swiggy chip only |

### Daylight (bright hours)

A dark UI washes out badly in a stall facing the street at midday, which is exactly when the counter is busiest. Build this mode second, but do build it.

| Token | Hex |
|---|---|
| `bg/base` | `#F5F2E8` |
| `bg/surface` | `#FFFFFF` |
| `bg/raised` | `#FFFFFF` + shadow `0 2px 8px rgba(10,26,20,.10)` |
| `line/subtle` | `#E3DDCE` |
| `text/1` | `#0A1A14` |
| `text/2` | `#4A5C54` |
| `brand/marigold` | `#B87709` (darkened for contrast on light) |

**Rules.** Marigold is only ever an action or a rupee value. Red only appears where the owner must do something. Platform brand colours never leave their chip. All body text must clear 4.5:1; large display text 3:1.

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

**Elevation on Night** comes from the surface ladder plus a 1px border, never shadows — shadows are invisible on dark. On Daylight, use real shadows instead.

**Touch targets:** minimum 44×44 everywhere. Primary payment buttons 52 tall. Board tiles minimum 74 tall. Tab bar 60 plus safe area.

---

## 5. Components

Build each as a Figma component set with the variants listed. Use auto-layout throughout.

| Component | Variants | Notes |
|---|---|---|
| **Button** | `type`: primary / secondary / ghost / platform · `state`: default / pressed / disabled / focus | Height 52 (42 for the compact row). Auto-layout, fill container. |
| **ItemTile** | `state`: default / selected / out-of-stock | 3-col grid. Selected inverts to marigold fill. Qty badge overlaps top-right by 6px. Out-of-stock is 38% opacity. |
| **Chip** | `state`: default / selected · `brand`: none / zomato / swiggy | Pill, 7×11 padding. |
| **StatCard** | `tone`: neutral / good / bad / brand | Eyebrow label above mono value. |
| **LedgerRow** | `emphasis`: normal / total | Total gets a top divider and 21px marigold value. |
| **ListRow** | `state`: normal / alert | Title + meta on the left, mono value right. Alert turns the value red. |
| **AmountField** | `state`: empty / filled / error | 34px mono on a 2px underline. Never a boxed input. |
| **BottomSheet** | `content`: cart / stock / payment | 2px marigold top border, `lg` radius top corners. |
| **AlertBanner** | `tone`: danger / info | Icon + Anton heading + body. |
| **TabBar** | `active`: sell / stock / money / reports / more | Icon 20px above 9.5px caps label. Active gets a 2px marigold top border. Badge is a red pill. |
| **Toast** | — | Marigold fill, dark text, floats 92 above the bottom. |
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
| Stock deduction | the affected row flashes marigold at 20% for 400ms |

Everything wrapped in `prefers-reduced-motion`.

---

## 8. Figma file setup

**Pages:** `00 Cover` · `01 Foundations` · `02 Components` · `03 Screens — Night` · `04 Screens — Daylight` · `05 Prototype` · `06 Handoff`

**Variables:** one collection `theme` with modes `Night` and `Daylight`; one collection `primitives` for spacing and radius. Screens reference variables only, never raw hex — this is what lets you flip the whole file to Daylight in one click.

**Naming:** `Component/Variant/State`, for example `Button/Primary/Pressed`. Screens as `03 · Sell — Counter`.

**Styles:** the ten text styles in Section 3, named exactly as listed.

---

## 9. Prompt for an AI design tool

Paste this whole block into Figma Make, v0, or similar.

> Design a mobile app interface for **ShopBook**, a billing and stock app used at the counter of a Maharashtrian snacks shop in Pune. Two users: the owner, and a helper who works the floor and may read English as a second language. The interface must be usable one-handed, at speed, with oily fingers.
>
> **Visual concept:** the app looks like the painted menu board hanging above the counter — deep spinach-green surfaces, heavy condensed uppercase lettering, prices in marigold. It should feel like a working tool, not a startup dashboard.
>
> **Colours.** Background `#0A1A14`, cards `#12291F`, raised surfaces `#1A3A2C`, borders `#1F4534`. Text `#F5F2E8` primary, `#9CB0A5` secondary, `#66817A` labels. Accent marigold `#F5A623` used *only* for primary actions and rupee values. Success `#3FBF7F`, danger `#E04B36`, aggregator purple `#A970C9`. No gradients, no glassmorphism, no drop shadows.
>
> **Type.** Anton uppercase for screen titles, menu tile names, button labels and panel headers. Inter for all body text and labels. JetBrains Mono with tabular figures for every number. Eyebrow labels are 10px Inter 600, uppercase, +12% letter-spacing.
>
> **Layout.** 4pt grid, 16px screen margins, 10px card radius, 1px borders instead of shadows. Minimum 44px touch targets; payment buttons 52px tall.
>
> **Screens to produce:** (1) start-of-day cash count, a single large number entry; (2) the sell screen — a 3-column grid of menu tiles showing item name and price, where selected tiles invert to marigold and carry a quantity badge, above a bottom sheet with the running total and three payment buttons Cash / UPI / Khata; (3) a stock list with a red "buy today" alert banner and rows showing quantity in hand; (4) end-of-day cash reconciliation showing expected versus counted with a shortfall highlighted in red; (5) a reports screen with four stat cards, a seven-day bar chart, and horizontal margin bars per item.
>
> **Content — use these exact strings:** Vada Pav ₹20, Misal Pav ₹70, Batata Vada ₹15, Samosa ₹20, Kanda Bhaji ₹50, Poha ₹30, Upma ₹30, Chai ₹15. Sales today ₹2,340, 47 orders. Low stock: Pav, Chutney, Coffee powder. Drawer should hold ₹3,550, counted ₹3,470, short ₹80.
>
> **Navigation:** a five-item bottom tab bar — Sell, Stock, Money, Reports, More — each with a 20px Lucide outline icon above a 9.5px uppercase label, the active tab marked by a marigold top border.

---

## 10. Handoff back to code

The CSS custom properties at the top of `shopbook-design-board.html` are the same tokens as Section 2. Once the Figma file exists, the port into the React app is a find-and-replace of the `C` colour object plus adopting the type scale — the component structure already matches this spec.
