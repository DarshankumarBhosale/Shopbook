# PROMPTS.md

Prompts for driving the agent. Prompt 1 runs once. Prompt 2 is the one you'll use most.

---

## 1 · Scaffold (run once)

> Read `AGENTS.md` first — every rule in it applies.
>
> Set up the ShopBook project: Vite + React 18 + TypeScript, Tailwind, Zustand, Dexie, Recharts, Capacitor for Android.
>
> Configure the Tailwind theme with the exact colour tokens, type scale and spacing steps from `AGENTS.md` and `docs/design-system.md`. Load Anton, Inter and JetBrains Mono.
>
> Define the Dexie schema from `docs/spec.md` §3, with the indexes listed in `AGENTS.md`. Seed the database on first run with the 23 raw materials and 14 menu items (including their recipes) found in `reference/ShopBook.jsx`.
>
> Then build **Phase 1 only**: day open with opening cash, counter sales with the menu-tile board and a cart sheet, expense entry, and day close with cash reconciliation. Port the component structure from `reference/ShopBook.jsx` but apply the new design tokens — that file's colours are superseded.
>
> Put stock deduction, COGS, and cash reconciliation in `src/lib/` as pure functions with unit tests.
>
> When it runs, open it in the browser, complete a full day — open with ₹2,000, sell two Vada Pav on cash, add a ₹400 expense, close and reconcile — and show me screenshots of each step.
>
> Do not start Phase 2.

---

## 2 · UI/UX change — the reusable one

Fill the four slots. Keep the rest exactly as written; the framing is what stops the agent redesigning things you didn't ask about.

> Read `AGENTS.md` and `docs/design-system.md` before changing anything.
>
> **Screen:** `[which screen — e.g. the Sell tab cart sheet]`
> **Problem:** `[what's wrong, from the user's point of view — e.g. "the helper can't tell at a glance which payment mode he just tapped"]`
> **Constraint:** `[what must not change — e.g. "the sale must still be three taps" / "the tile grid stays 3 columns"]`
> **Done when:** `[observable outcome — e.g. "the selected payment mode is unmistakable from arm's length"]`
>
> Rules for this change:
> - Use only existing design tokens. Do not introduce a new colour, font size or spacing value.
> - Marigold stays reserved for primary actions and rupee values.
> - Touch targets stay at or above 44px; payment buttons stay 52px.
> - Change only the screen named above. Leave every other screen alone.
> - Keep all four component states — default, pressed, disabled, focus.
>
> Before you start, show me two different approaches in one or two sentences each, and wait for me to pick one.
>
> After implementing, use the browser to open the screen, interact with the thing you changed, and show me before-and-after screenshots at 390×844.

### Worked example

> Read `AGENTS.md` and `docs/design-system.md` before changing anything.
>
> **Screen:** Sell tab, the menu tile board
> **Problem:** With 14 items the helper scrolls to reach Chai and Coffee, which are two of the most-sold items. Scrolling mid-sale breaks the three-tap flow.
> **Constraint:** Tiles stay large enough to hit without looking. No search box — typing is too slow at the counter.
> **Done when:** The eight most-sold items are reachable without scrolling on a 390×844 screen.
>
> `[…rules block unchanged…]`

---

## 3 · New feature

> Read `AGENTS.md` first.
>
> Implement `[feature]` from `docs/spec.md` §`[section]`.
>
> Before writing code, tell me: which Dexie tables it touches, which pure functions in `src/lib/` it needs, and whether the helper role can access it. Wait for my confirmation.
>
> Then build it, write unit tests for the logic, and verify in the browser with the app offline. Show me the flow working.
>
> Do not modify existing screens beyond what this feature requires.

---

## 4 · When something is broken

> `[What you did]` → `[what you expected]` → `[what actually happened]`.
>
> Reproduce it in the browser first and show me the failing state. Then find the root cause and tell me what it is before you fix it — I want to know whether it's a one-off or a pattern.
>
> After fixing, add a test that would have caught it.

---

## Habits that make these work

**Say what's wrong, not what to build.** "The helper can't tell which payment mode is selected" gets you a better result than "make the selected button brighter" — the agent can see the whole screen and you can't.

**Ask for options before code.** One extra round trip saves you from a large diff in the wrong direction.

**Make it prove things in the browser.** This is Antigravity's real advantage. "Show me it working" catches what code review misses.

**One screen per prompt.** Broad requests are where agents quietly redesign things you were happy with.

**When it drifts, point at the rule.** "That violates the marigold rule in `AGENTS.md`" corrects faster than re-explaining.
