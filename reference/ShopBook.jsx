import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

/* ================================================================== */
/*  DESIGN TOKENS — the painted menu board above the counter          */
/* ================================================================== */
const C = {
  board: "#0D1F18",
  tile: "#153027",
  edge: "#20463A",
  marigold: "#F2A81D",
  cream: "#F3EFE2",
  steel: "#7E938A",
  chili: "#D9402F",
  mint: "#5CC79E",
  plum: "#B06AB3",
};
const DISPLAY = "'Anton', Impact, 'Arial Narrow', sans-serif";
const BODY = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

const rupee = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const dayLabel = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/* ================================================================== */
/*  SEED DATA — a real Pune snacks counter                            */
/* ================================================================== */
const RM = [
  { id: 1, name: "Pav", unit: "pc", avgCost: 4, reorder: 100 },
  { id: 2, name: "Potato", unit: "g", avgCost: 0.03, reorder: 8000 },
  { id: 3, name: "Besan", unit: "g", avgCost: 0.09, reorder: 3000 },
  { id: 4, name: "Oil", unit: "ml", avgCost: 0.14, reorder: 4000 },
  { id: 5, name: "Onion", unit: "g", avgCost: 0.04, reorder: 6000 },
  { id: 6, name: "Chutney", unit: "g", avgCost: 0.12, reorder: 1500 },
  { id: 7, name: "Matki", unit: "g", avgCost: 0.11, reorder: 3000 },
  { id: 8, name: "Farsan", unit: "g", avgCost: 0.18, reorder: 2000 },
  { id: 9, name: "Maida", unit: "g", avgCost: 0.05, reorder: 2000 },
  { id: 10, name: "Poha", unit: "g", avgCost: 0.06, reorder: 3000 },
  { id: 11, name: "Rava", unit: "g", avgCost: 0.05, reorder: 3000 },
  { id: 12, name: "Sabudana", unit: "g", avgCost: 0.11, reorder: 2500 },
  { id: 13, name: "Peanut", unit: "g", avgCost: 0.14, reorder: 1500 },
  { id: 14, name: "Idli batter", unit: "g", avgCost: 0.05, reorder: 4000 },
  { id: 15, name: "Dosa batter", unit: "g", avgCost: 0.05, reorder: 4000 },
  { id: 16, name: "Sambar", unit: "ml", avgCost: 0.04, reorder: 4000 },
  { id: 17, name: "Tea powder", unit: "g", avgCost: 0.45, reorder: 500 },
  { id: 18, name: "Milk", unit: "ml", avgCost: 0.06, reorder: 8000 },
  { id: 19, name: "Sugar", unit: "g", avgCost: 0.045, reorder: 3000 },
  { id: 20, name: "Ghee", unit: "g", avgCost: 0.6, reorder: 800 },
  { id: 21, name: "Coffee powder", unit: "g", avgCost: 0.9, reorder: 300 },
  { id: 22, name: "Cold drink", unit: "pc", avgCost: 14, reorder: 24 },
  { id: 23, name: "Paper bag", unit: "pc", avgCost: 1.2, reorder: 200 },
];

const ITEMS = [
  { id: 1, name: "Vada Pav", cat: "Snacks", pc: 20, po: 26, recipe: [[1,1],[2,60],[3,25],[4,15],[6,10]] },
  { id: 2, name: "Misal Pav", cat: "Snacks", pc: 70, po: 92, recipe: [[1,2],[7,80],[4,20],[5,20],[8,25]] },
  { id: 3, name: "Batata Vada", cat: "Snacks", pc: 15, po: 20, recipe: [[2,60],[3,25],[4,15]] },
  { id: 4, name: "Samosa", cat: "Snacks", pc: 20, po: 26, recipe: [[9,30],[2,50],[4,20]] },
  { id: 5, name: "Kanda Bhaji", cat: "Snacks", pc: 50, po: 66, recipe: [[5,100],[3,40],[4,30]] },
  { id: 6, name: "Poha", cat: "Breakfast", pc: 30, po: 40, recipe: [[10,80],[5,20],[4,10]] },
  { id: 7, name: "Upma", cat: "Breakfast", pc: 30, po: 40, recipe: [[11,80],[4,10],[5,15]] },
  { id: 8, name: "Sabudana Khichdi", cat: "Breakfast", pc: 60, po: 78, recipe: [[12,90],[13,20],[4,15]] },
  { id: 9, name: "Idli Sambar", cat: "South", pc: 50, po: 66, recipe: [[14,150],[16,150]] },
  { id: 10, name: "Sada Dosa", cat: "South", pc: 70, po: 92, recipe: [[15,120],[4,15]] },
  { id: 11, name: "Sheera", cat: "Sweet", pc: 30, po: 40, recipe: [[11,70],[19,50],[20,20]] },
  { id: 12, name: "Chai", cat: "Drinks", pc: 15, po: 20, recipe: [[17,5],[18,100],[19,12]] },
  { id: 13, name: "Coffee", cat: "Drinks", pc: 20, po: 26, recipe: [[21,4],[18,120],[19,12]] },
  { id: 14, name: "Cold Drink", cat: "Drinks", pc: 20, po: 24, recipe: [[22,1]] },
];

const EXP_CATS = ["Raw material","Gas cylinder","Packaging","Salary","Electricity","Rent","Repairs","Misc"];
const WASTE_REASONS = ["Spoiled","Spilled","Unsold at close","Staff meal"];
const PLATFORMS = [
  { id: "zomato", name: "Zomato", commission: 22 },
  { id: "swiggy", name: "Swiggy", commission: 24 },
];

const KEY = "shopbook:v2";

const FRESH = {
  rawMaterials: RM.map((r) => ({ ...r })),
  items: ITEMS.map((i) => ({ ...i, active: true })),
  customers: [
    { id: 1, name: "Auto stand bhaiya", phone: "98xxx11223" },
    { id: 2, name: "Salon next door", phone: "97xxx44556" },
  ],
  days: [],
  sales: [],
  stockMoves: RM.map((r) => ({
    id: uid() + r.id, dayId: null, rmId: r.id, type: "in",
    qty: r.reorder * 1.6, rate: r.avgCost, at: new Date().toISOString(),
  })),
  expenses: [],
  payments: [],
  payouts: [],
};

/* ================================================================== */
/*  ROOT                                                              */
/* ================================================================== */
export default function ShopBook() {
  const [db, setDb] = useState(FRESH);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState(null);       // 'owner' | 'helper'
  const [tab, setTab] = useState("sell");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(KEY);
        if (r && r.value) setDb(JSON.parse(r.value));
      } catch (e) { /* first run */ }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try { await window.storage.set(KEY, JSON.stringify(db)); } catch (e) { /* memory only */ }
    })();
  }, [db, ready]);

  const say = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const patch = (fn) => setDb((d) => ({ ...d, ...fn(d) }));

  /* -------- derived -------- */
  const openDay = useMemo(() => db.days.find((d) => d.status === "open") || null, [db.days]);

  const stock = useMemo(() => {
    const m = {};
    db.rawMaterials.forEach((r) => (m[r.id] = 0));
    db.stockMoves.forEach((mv) => { m[mv.rmId] = (m[mv.rmId] || 0) + mv.qty; });
    return m;
  }, [db.stockMoves, db.rawMaterials]);

  const lowStock = db.rawMaterials.filter((r) => stock[r.id] < r.reorder);

  const daySales = openDay ? db.sales.filter((s) => s.dayId === openDay.id) : [];
  const dayExp = openDay ? db.expenses.filter((e) => e.dayId === openDay.id) : [];
  const dayPay = openDay ? db.payments.filter((p) => p.dayId === openDay.id) : [];

  const T = useMemo(() => {
    const cash = daySales.filter((s) => s.mode === "Cash").reduce((a, b) => a + b.gross, 0);
    const upi = daySales.filter((s) => s.mode === "UPI").reduce((a, b) => a + b.gross, 0);
    const credit = daySales.filter((s) => s.mode === "Udhaar").reduce((a, b) => a + b.gross, 0);
    const online = daySales.filter((s) => s.channel !== "counter").reduce((a, b) => a + b.gross, 0);
    const cashExp = dayExp.filter((e) => e.mode === "Cash").reduce((a, b) => a + b.amount, 0);
    const cashIn = dayPay.filter((p) => p.mode === "Cash").reduce((a, b) => a + b.amount, 0);
    const gross = daySales.reduce((a, b) => a + b.gross, 0);
    const net = daySales.reduce((a, b) => a + b.net, 0);
    const cogs = daySales.reduce((a, b) => a + b.cogs, 0);
    return {
      cash, upi, credit, online, gross, net, cogs,
      cashExp, cashIn,
      totalExp: dayExp.reduce((a, b) => a + b.amount, 0),
      expected: (openDay ? openDay.openingCash : 0) + cash + cashIn - cashExp,
      orders: daySales.length,
    };
  }, [daySales, dayExp, dayPay, openDay]);

  const ctx = { db, patch, say, stock, lowStock, openDay, daySales, dayExp, T, role };

  if (!ready) return <Shell><div style={{ height: 500 }} /></Shell>;
  if (!role) return <Shell><Login onPick={setRole} /></Shell>;
  if (!openDay && tab !== "more")
    return (
      <Shell toast={toast}>
        <TopBar role={role} openDay={openDay} onExit={() => setRole(null)} />
        <StartDay patch={patch} say={say} />
      </Shell>
    );

  return (
    <Shell toast={toast}>
      <TopBar role={role} openDay={openDay} onExit={() => setRole(null)} />
      <div style={{ paddingBottom: 78 }}>
        {tab === "sell" && <SellTab {...ctx} />}
        {tab === "stock" && <StockTab {...ctx} />}
        {tab === "money" && <MoneyTab {...ctx} />}
        {tab === "reports" && <ReportsTab {...ctx} />}
        {tab === "more" && <MoreTab {...ctx} setDb={setDb} goSell={() => setTab("sell")} />}
      </div>
      <TabBar tab={tab} setTab={setTab} role={role} alerts={lowStock.length} />
    </Shell>
  );
}

/* ================================================================== */
/*  SHELL / CHROME                                                    */
/* ================================================================== */
function Shell({ children, toast }) {
  return (
    <div style={{ background: C.board, color: C.cream, fontFamily: BODY, minHeight: 620,
                  borderRadius: 14, overflow: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap');
        .tap { transition: transform .08s ease, background .12s ease; -webkit-tap-highlight-color: transparent; }
        .tap:active { transform: scale(.97); }
        .tap:focus-visible { outline: 2px solid ${C.marigold}; outline-offset: 2px; }
        .noscroll::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) { .tap { transition: none; } .tap:active { transform: none; } }
      `}</style>
      {children}
      {toast && (
        <div className="rounded-lg px-4 py-3"
             style={{ position: "fixed", bottom: 92, left: 16, right: 16, background: C.marigold,
                      color: C.board, fontWeight: 700, fontSize: 13, zIndex: 60, textAlign: "center" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function TopBar({ role, openDay, onExit }) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="flex items-center justify-between px-4 py-2"
         style={{ borderBottom: `1px solid ${C.edge}`, fontSize: 11, letterSpacing: ".08em" }}>
      <span style={{ color: C.steel }} className="uppercase">{today}</span>
      <div className="flex items-center gap-3">
        <span style={{ color: openDay ? C.mint : C.steel, fontWeight: 600 }} className="uppercase">
          {openDay ? "Day open" : "Not started"}
        </span>
        <button onClick={onExit} className="tap rounded px-2 py-1 uppercase"
                style={{ background: C.tile, border: `1px solid ${C.edge}`, color: C.cream,
                         fontSize: 10, letterSpacing: ".08em" }}>
          {role}
        </button>
      </div>
    </div>
  );
}

function TabBar({ tab, setTab, role, alerts }) {
  const tabs = [
    { id: "sell", label: "Sell" },
    { id: "stock", label: "Stock", badge: alerts },
    { id: "money", label: "Money" },
    ...(role === "owner" ? [{ id: "reports", label: "Reports" }] : []),
    { id: "more", label: "More" },
  ];
  return (
    <div className="flex" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.tile,
                                   borderTop: `1px solid ${C.edge}`, zIndex: 50 }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setTab(t.id)}
                className="tap flex-1 py-4 relative"
                style={{ background: "transparent", color: tab === t.id ? C.marigold : C.steel,
                         fontFamily: DISPLAY, fontSize: 14, letterSpacing: ".06em",
                         borderTop: tab === t.id ? `2px solid ${C.marigold}` : "2px solid transparent" }}>
          {t.label.toUpperCase()}
          {t.badge > 0 && (
            <span style={{ position: "absolute", top: 6, right: "50%", marginRight: -26, width: 16, height: 16,
                           background: C.chili, color: C.cream, borderRadius: 999, fontSize: 9,
                           fontFamily: MONO, lineHeight: "16px" }}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  LOGIN + START DAY                                                 */
/* ================================================================== */
function Login({ onPick }) {
  return (
    <div className="px-5 py-12 text-center">
      <div style={{ fontFamily: DISPLAY, fontSize: 44, lineHeight: .95, letterSpacing: ".02em" }} className="uppercase">
        Shop<br /><span style={{ color: C.marigold }}>Book</span>
      </div>
      <p style={{ color: C.steel, fontSize: 14 }} className="mt-4 mb-10">Who's on the counter?</p>
      <button onClick={() => onPick("owner")} className="tap w-full py-4 rounded-lg mb-3"
              style={{ background: C.marigold, color: C.board, fontFamily: DISPLAY, fontSize: 20, letterSpacing: ".06em" }}>
        OWNER
      </button>
      <button onClick={() => onPick("helper")} className="tap w-full py-4 rounded-lg"
              style={{ background: C.tile, color: C.cream, border: `1px solid ${C.edge}`,
                       fontFamily: DISPLAY, fontSize: 20, letterSpacing: ".06em" }}>
        HELPER
      </button>
      <p style={{ color: C.steel, fontSize: 12 }} className="mt-6">
        Helper can record sales, expenses and stock. Profit and edits stay with the owner.
      </p>
    </div>
  );
}

function StartDay({ patch, say }) {
  const [cash, setCash] = useState("");
  return (
    <div className="px-5 py-10 text-center">
      <h1 style={{ fontFamily: DISPLAY, fontSize: 38, lineHeight: 1 }} className="uppercase">Start the day</h1>
      <p style={{ color: C.steel, fontSize: 14 }} className="mt-3 mb-8">
        Count the drawer before the first customer. Tonight's close checks against this.
      </p>
      <Label>Opening cash</Label>
      <BigNum value={cash} onChange={setCash} />
      <button onClick={() => {
                patch((d) => ({ days: [...d.days, { id: uid(), date: new Date().toISOString(),
                  openingCash: Number(cash || 0), status: "open" }] }));
                say("Day book opened");
              }}
              className="tap w-full py-4 rounded-lg mt-8"
              style={{ background: C.marigold, color: C.board, fontFamily: DISPLAY, fontSize: 20, letterSpacing: ".06em" }}>
        OPEN DAY BOOK
      </button>
    </div>
  );
}

/* ================================================================== */
/*  SELL                                                              */
/* ================================================================== */
function SellTab({ db, patch, say, stock, openDay, T, role }) {
  const [mode, setMode] = useState("counter");   // counter | online
  const [cart, setCart] = useState({});
  const [payOpen, setPayOpen] = useState(false);
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [custId, setCustId] = useState(null);
  const t0 = useRef(null);

  const priceOf = (it) => (mode === "counter" ? it.pc : it.po);

  const add = (it) => {
    if (t0.current === null) t0.current = Date.now();
    setCart((c) => ({ ...c, [it.id]: (c[it.id] || 0) + 1 }));
  };
  const dec = (id) => setCart((c) => {
    const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n;
  });

  const lines = Object.entries(cart).map(([id, qty]) => {
    const it = db.items.find((i) => i.id === Number(id));
    return { itemId: it.id, name: it.name, qty, rate: priceOf(it), amount: priceOf(it) * qty };
  });
  const gross = lines.reduce((a, b) => a + b.amount, 0);
  const count = lines.reduce((a, b) => a + b.qty, 0);

  const cogsOf = (ls) => ls.reduce((sum, l) => {
    const it = db.items.find((i) => i.id === l.itemId);
    return sum + l.qty * it.recipe.reduce((s, [rmId, q]) => {
      const rm = db.rawMaterials.find((r) => r.id === rmId);
      return s + (rm ? rm.avgCost * q : 0);
    }, 0);
  }, 0);

  const commit = (payMode) => {
    const cogs = cogsOf(lines);
    const commissionPct = mode === "online" ? platform.commission : 0;
    const commissionAmt = Math.round((gross * commissionPct) / 100);
    const sale = {
      id: uid(), dayId: openDay.id,
      channel: mode === "online" ? platform.id : "counter",
      lines, gross, commissionPct, commissionAmt, net: gross - commissionAmt, cogs,
      mode: mode === "online" ? "Platform" : payMode,
      customerId: payMode === "Udhaar" ? custId : null,
      settled: false, at: new Date().toISOString(),
      seconds: t0.current ? Math.round((Date.now() - t0.current) / 100) / 10 : 0,
    };
    const moves = [];
    lines.forEach((l) => {
      const it = db.items.find((i) => i.id === l.itemId);
      it.recipe.forEach(([rmId, q]) => {
        moves.push({ id: uid() + rmId, dayId: openDay.id, rmId, type: "sale",
                     qty: -q * l.qty, at: sale.at });
      });
    });
    patch((d) => ({ sales: [...d.sales, sale], stockMoves: [...d.stockMoves, ...moves] }));
    setCart({}); setPayOpen(false); setCustId(null); t0.current = null;
    say(`${rupee(gross)} recorded · stock deducted`);
  };

  const shortages = useMemo(() => {
    const need = {};
    lines.forEach((l) => {
      const it = db.items.find((i) => i.id === l.itemId);
      it.recipe.forEach(([rmId, q]) => { need[rmId] = (need[rmId] || 0) + q * l.qty; });
    });
    return Object.entries(need)
      .filter(([rmId, q]) => (stock[rmId] || 0) < q)
      .map(([rmId]) => db.rawMaterials.find((r) => r.id === Number(rmId)).name);
  }, [cart, db.items, db.rawMaterials, stock]);

  return (
    <div>
      {/* today strip */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <Label>Sales today</Label>
            <div style={{ fontFamily: MONO, fontSize: 40, color: C.marigold, fontWeight: 700, lineHeight: 1.1 }}>
              {rupee(T.gross)}
            </div>
            <div style={{ color: C.steel, fontSize: 12 }}>
              {T.orders} orders · {rupee(T.cash)} cash · {rupee(T.upi)} UPI · {rupee(T.online)} online
            </div>
          </div>
        </div>
      </div>

      {/* channel switch */}
      <div className="flex gap-2 px-4 pb-3">
        <Seg active={mode === "counter"} onClick={() => setMode("counter")} label="Counter" />
        <Seg active={mode === "online"} onClick={() => setMode("online")} label="Zomato / Swiggy" />
      </div>

      {mode === "online" && (
        <div className="flex gap-2 px-4 pb-3">
          {PLATFORMS.map((p) => (
            <button key={p.id} onClick={() => setPlatform(p)}
                    className="tap flex-1 rounded-lg py-2"
                    style={{ background: platform.id === p.id ? C.plum : C.tile,
                             color: platform.id === p.id ? C.cream : C.steel,
                             border: `1px solid ${platform.id === p.id ? C.plum : C.edge}`,
                             fontSize: 12, fontWeight: 700 }}>
              {p.name} · {p.commission}%
            </button>
          ))}
        </div>
      )}

      {/* the board */}
      <div className="grid grid-cols-3 gap-2 px-3">
        {db.items.filter((i) => i.active).map((it) => {
          const qty = cart[it.id] || 0;
          return (
            <button key={it.id} onClick={() => add(it)}
                    className="tap rounded-lg px-2 py-3 relative flex flex-col justify-between"
                    style={{ background: qty ? C.marigold : C.tile, color: qty ? C.board : C.cream,
                             border: `1px solid ${qty ? C.marigold : C.edge}`, minHeight: 80 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 13.5, lineHeight: 1.05 }}
                    className="uppercase text-left">{it.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }} className="text-left">
                ₹{priceOf(it)}
              </span>
              {qty > 0 && <Badge n={qty} />}
            </button>
          );
        })}
      </div>

      {/* cart bar */}
      {count > 0 && (
        <div className="px-4 pt-3 pb-4"
             style={{ position: "fixed", bottom: 62, left: 0, right: 0, background: C.tile,
                      borderTop: `2px solid ${C.marigold}`, zIndex: 40 }}>
          {shortages.length > 0 && (
            <div className="rounded px-3 py-2 mb-2" style={{ background: C.board, border: `1px solid ${C.chili}` }}>
              <span style={{ color: C.chili, fontSize: 11, fontWeight: 700 }}>
                Not enough {shortages.slice(0, 3).join(", ")} — sale will push stock negative
              </span>
            </div>
          )}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 noscroll" style={{ maxHeight: 80, overflowY: "auto" }}>
              {lines.map((l) => (
                <div key={l.itemId} className="flex items-center justify-between py-1">
                  <span style={{ fontSize: 13 }}>{l.qty} × {l.name}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.steel }}>₹{l.amount}</span>
                    <button onClick={() => dec(l.itemId)} className="tap rounded"
                            aria-label={"Remove one " + l.name}
                            style={{ width: 22, height: 22, background: C.board, color: C.chili,
                                     border: `1px solid ${C.edge}`, fontSize: 14, lineHeight: 1 }}>−</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.marigold }}>{rupee(gross)}</div>
          </div>

          {mode === "online" ? (
            <button onClick={() => commit("Platform")} className="tap w-full py-4 rounded-lg"
                    style={{ background: C.plum, color: C.cream, fontFamily: DISPLAY, fontSize: 18, letterSpacing: ".06em" }}>
              SAVE {platform.name.toUpperCase()} ORDER · NET {rupee(gross * (1 - platform.commission / 100))}
            </button>
          ) : !payOpen ? (
            <div className="grid grid-cols-3 gap-2">
              <PayBtn label="CASH" onClick={() => commit("Cash")} primary />
              <PayBtn label="UPI" onClick={() => commit("UPI")} />
              <PayBtn label="UDHAAR" onClick={() => setPayOpen(true)} />
            </div>
          ) : (
            <div>
              <Label>Whose khata?</Label>
              <div className="flex flex-wrap gap-2 my-2">
                {db.customers.map((cu) => (
                  <button key={cu.id} onClick={() => setCustId(cu.id)} className="tap rounded-full px-3 py-2"
                          style={{ background: custId === cu.id ? C.marigold : C.board,
                                   color: custId === cu.id ? C.board : C.cream,
                                   border: `1px solid ${custId === cu.id ? C.marigold : C.edge}`, fontSize: 12 }}>
                    {cu.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PayBtn label="BACK" onClick={() => setPayOpen(false)} />
                <PayBtn label="SAVE" primary disabled={!custId} onClick={() => custId && commit("Udhaar")} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  STOCK                                                             */
/* ================================================================== */
function StockTab({ db, patch, say, stock, lowStock, openDay }) {
  const [sheet, setSheet] = useState(null);   // 'in' | 'waste' | 'audit'
  const [rmId, setRmId] = useState(null);
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");
  const [reason, setReason] = useState(WASTE_REASONS[0]);

  const submit = () => {
    const q = Number(qty || 0);
    if (!rmId || !q) return;
    const rm = db.rawMaterials.find((r) => r.id === rmId);
    let move;
    if (sheet === "in") {
      move = { id: uid(), dayId: openDay.id, rmId, type: "in", qty: q, rate: Number(rate || rm.avgCost), at: new Date().toISOString() };
    } else if (sheet === "waste") {
      move = { id: uid(), dayId: openDay.id, rmId, type: "wastage", qty: -q, reason, at: new Date().toISOString() };
    } else {
      move = { id: uid(), dayId: openDay.id, rmId, type: "audit", qty: q - (stock[rmId] || 0),
               reason: "Physical count", at: new Date().toISOString() };
    }
    patch((d) => {
      const next = { stockMoves: [...d.stockMoves, move] };
      if (sheet === "in" && rate) {
        next.rawMaterials = d.rawMaterials.map((r) => r.id === rmId ? { ...r, avgCost: Number(rate) } : r);
        next.expenses = [...d.expenses, { id: uid(), dayId: openDay.id, category: "Raw material",
          amount: Math.round(q * Number(rate)), mode: "Cash", note: `${rm.name} ${q}${rm.unit}` }];
      }
      return next;
    });
    setSheet(null); setRmId(null); setQty(""); setRate("");
    say(sheet === "in" ? "Stock added · expense logged" : sheet === "waste" ? "Wastage recorded" : "Count adjusted");
  };

  return (
    <div className="px-4 pt-4">
      <div className="flex gap-2 mb-4">
        <MiniBtn label="Stock in" onClick={() => setSheet("in")} primary />
        <MiniBtn label="Wastage" onClick={() => setSheet("waste")} />
        <MiniBtn label="Count" onClick={() => setSheet("audit")} />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg px-4 py-3 mb-4" style={{ background: C.tile, border: `1px solid ${C.chili}` }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 16, color: C.chili }} className="uppercase mb-1">
            Buy today — {lowStock.length} items
          </div>
          <div style={{ color: C.cream, fontSize: 12 }}>{lowStock.map((r) => r.name).join(" · ")}</div>
        </div>
      )}

      {sheet && (
        <div className="rounded-lg px-4 py-4 mb-4" style={{ background: C.tile, border: `1px solid ${C.marigold}` }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: DISPLAY, fontSize: 18 }} className="uppercase">
              {sheet === "in" ? "Stock in" : sheet === "waste" ? "Log wastage" : "Physical count"}
            </span>
            <button onClick={() => setSheet(null)} className="tap" style={{ color: C.steel, fontSize: 18 }}>×</button>
          </div>
          <select value={rmId || ""} onChange={(e) => setRmId(Number(e.target.value))}
                  className="w-full rounded px-3 py-3 mb-3"
                  style={{ background: C.board, color: C.cream, border: `1px solid ${C.edge}`, fontSize: 14 }}>
            <option value="">Choose material…</option>
            {db.rawMaterials.map((r) => (
              <option key={r.id} value={r.id}>{r.name} — {Math.round(stock[r.id])}{r.unit} in hand</option>
            ))}
          </select>
          <div className="flex gap-2 mb-3">
            <input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ""))}
                   placeholder={sheet === "audit" ? "Counted qty" : "Quantity"}
                   className="flex-1 rounded px-3 py-3"
                   style={{ background: C.board, color: C.cream, border: `1px solid ${C.edge}`, fontFamily: MONO, fontSize: 15 }} />
            {sheet === "in" && (
              <input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
                     placeholder="Rate/unit" className="flex-1 rounded px-3 py-3"
                     style={{ background: C.board, color: C.cream, border: `1px solid ${C.edge}`, fontFamily: MONO, fontSize: 15 }} />
            )}
          </div>
          {sheet === "waste" && (
            <div className="flex flex-wrap gap-2 mb-3">
              {WASTE_REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} className="tap rounded-full px-3 py-2"
                        style={{ background: reason === r ? C.chili : C.board, color: C.cream,
                                 border: `1px solid ${reason === r ? C.chili : C.edge}`, fontSize: 12 }}>{r}</button>
              ))}
            </div>
          )}
          <button onClick={submit} className="tap w-full py-3 rounded-lg"
                  style={{ background: C.marigold, color: C.board, fontFamily: DISPLAY, fontSize: 17, letterSpacing: ".05em" }}>
            SAVE
          </button>
        </div>
      )}

      <Label>Everything in the kitchen</Label>
      <div className="mt-2">
        {db.rawMaterials.map((r) => {
          const have = stock[r.id] || 0;
          const low = have < r.reorder;
          return (
            <div key={r.id} className="flex items-center justify-between py-2.5"
                 style={{ borderBottom: `1px solid ${C.edge}` }}>
              <div>
                <div style={{ fontSize: 14 }}>{r.name}</div>
                <div style={{ color: C.steel, fontSize: 11 }}>
                  {rupee(r.avgCost * have)} at {r.avgCost}/{r.unit}
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: low ? C.chili : C.cream }}>
                {Math.round(have)}<span style={{ fontSize: 11, color: C.steel }}> {r.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MONEY — expenses, khata, payouts, close                           */
/* ================================================================== */
function MoneyTab({ db, patch, say, openDay, daySales, T, role }) {
  const [view, setView] = useState("expense");

  return (
    <div className="px-4 pt-4">
      <div className="flex gap-2 mb-4 noscroll" style={{ overflowX: "auto" }}>
        <Seg active={view === "expense"} onClick={() => setView("expense")} label="Expense" />
        <Seg active={view === "khata"} onClick={() => setView("khata")} label="Khata" />
        {role === "owner" && <Seg active={view === "payout"} onClick={() => setView("payout")} label="Payouts" />}
        {role === "owner" && <Seg active={view === "close"} onClick={() => setView("close")} label="Close day" />}
      </div>
      {view === "expense" && <ExpenseView db={db} patch={patch} say={say} openDay={openDay} T={T} />}
      {view === "khata" && <KhataView db={db} patch={patch} say={say} openDay={openDay} />}
      {view === "payout" && <PayoutView db={db} patch={patch} say={say} />}
      {view === "close" && <CloseView db={db} patch={patch} say={say} openDay={openDay} T={T} />}
    </div>
  );
}

function ExpenseView({ db, patch, say, openDay, T }) {
  const [cat, setCat] = useState(EXP_CATS[0]);
  const [amt, setAmt] = useState("");
  const [mode, setMode] = useState("Cash");
  const [note, setNote] = useState("");
  const list = db.expenses.filter((e) => e.dayId === openDay.id);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {EXP_CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className="tap rounded-full px-3 py-2"
                  style={{ background: cat === c ? C.marigold : C.tile, color: cat === c ? C.board : C.cream,
                           border: `1px solid ${cat === c ? C.marigold : C.edge}`, fontSize: 12, fontWeight: 600 }}>
            {c}
          </button>
        ))}
      </div>
      <BigNum value={amt} onChange={setAmt} />
      <div className="grid grid-cols-2 gap-2 my-3">
        {["Cash", "UPI"].map((m) => (
          <button key={m} onClick={() => setMode(m)} className="tap py-3 rounded-lg"
                  style={{ background: mode === m ? C.marigold : C.tile, color: mode === m ? C.board : C.cream,
                           border: `1px solid ${mode === m ? C.marigold : C.edge}`,
                           fontFamily: DISPLAY, fontSize: 16, letterSpacing: ".05em" }}>{m.toUpperCase()}</button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
             className="w-full rounded-lg px-4 py-3 mb-3"
             style={{ background: C.tile, border: `1px solid ${C.edge}`, color: C.cream, fontSize: 14 }} />
      <button disabled={!amt} onClick={() => {
                patch((d) => ({ expenses: [...d.expenses, { id: uid(), dayId: openDay.id, category: cat,
                  amount: Number(amt), mode, note }] }));
                setAmt(""); setNote(""); say("Expense saved");
              }}
              className="tap w-full py-4 rounded-lg mb-6"
              style={{ background: amt ? C.marigold : C.tile, color: amt ? C.board : C.steel,
                       border: `1px solid ${amt ? C.marigold : C.edge}`, fontFamily: DISPLAY, fontSize: 18, letterSpacing: ".05em" }}>
        SAVE EXPENSE
      </button>

      <Label>Spent today — {rupee(T.totalExp)}</Label>
      {list.length === 0 && <Empty text="Nothing spent yet today." />}
      {list.slice().reverse().map((e) => (
        <div key={e.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${C.edge}` }}>
          <div>
            <div style={{ fontSize: 14 }}>{e.category}</div>
            <div style={{ color: C.steel, fontSize: 11 }}>{e.mode}{e.note ? " · " + e.note : ""}</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700 }}>{rupee(e.amount)}</div>
        </div>
      ))}
    </div>
  );
}

function KhataView({ db, patch, say, openDay }) {
  const [amt, setAmt] = useState("");
  const [sel, setSel] = useState(null);

  const balances = db.customers.map((cu) => {
    const owed = db.sales.filter((s) => s.customerId === cu.id).reduce((a, b) => a + b.gross, 0);
    const paid = db.payments.filter((p) => p.customerId === cu.id).reduce((a, b) => a + b.amount, 0);
    return { ...cu, out: owed - paid };
  });
  const total = balances.reduce((a, b) => a + b.out, 0);

  return (
    <div>
      <div className="rounded-lg px-4 py-4 mb-4" style={{ background: C.tile, border: `1px solid ${C.edge}` }}>
        <Label>Total outstanding</Label>
        <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: total > 0 ? C.chili : C.mint }}>
          {rupee(total)}
        </div>
      </div>

      {balances.map((cu) => (
        <div key={cu.id} className="py-3" style={{ borderBottom: `1px solid ${C.edge}` }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 14 }}>{cu.name}</div>
              <div style={{ color: C.steel, fontSize: 11 }}>{cu.phone}</div>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: cu.out > 0 ? C.chili : C.mint }}>
                {rupee(cu.out)}
              </span>
              {cu.out > 0 && (
                <button onClick={() => setSel(sel === cu.id ? null : cu.id)} className="tap rounded px-3 py-1.5"
                        style={{ background: C.marigold, color: C.board, fontSize: 11, fontWeight: 700 }}>
                  RECEIVE
                </button>
              )}
            </div>
          </div>
          {sel === cu.id && (
            <div className="flex gap-2 mt-3">
              <input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))}
                     placeholder="Amount received" className="flex-1 rounded px-3 py-2"
                     style={{ background: C.board, color: C.cream, border: `1px solid ${C.edge}`, fontFamily: MONO }} />
              <button onClick={() => {
                        if (!amt) return;
                        patch((d) => ({ payments: [...d.payments, { id: uid(), dayId: openDay.id,
                          customerId: cu.id, amount: Number(amt), mode: "Cash" }] }));
                        setAmt(""); setSel(null); say("Payment received");
                      }}
                      className="tap rounded px-4" style={{ background: C.mint, color: C.board, fontWeight: 700, fontSize: 12 }}>
                SAVE
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PayoutView({ db, patch, say }) {
  const [rec, setRec] = useState({});
  return (
    <div>
      <p style={{ color: C.steel, fontSize: 13 }} className="mb-4">
        Platforms pay net of commission, days later. Enter what actually hit the bank and the app tells you if it's short.
      </p>
      {PLATFORMS.map((p) => {
        const pending = db.sales.filter((s) => s.channel === p.id && !s.settled);
        const expected = pending.reduce((a, b) => a + b.net, 0);
        const past = db.payouts.filter((x) => x.platform === p.id);
        return (
          <div key={p.id} className="rounded-lg px-4 py-4 mb-3" style={{ background: C.tile, border: `1px solid ${C.edge}` }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontFamily: DISPLAY, fontSize: 20, color: C.plum }} className="uppercase">{p.name}</span>
              <span style={{ color: C.steel, fontSize: 11 }}>{pending.length} orders pending</span>
            </div>
            <Row label="Expected payout" value={rupee(expected)} strong />
            {expected > 0 && (
              <div className="flex gap-2 mt-3">
                <input inputMode="numeric" value={rec[p.id] || ""}
                       onChange={(e) => setRec({ ...rec, [p.id]: e.target.value.replace(/\D/g, "") })}
                       placeholder="Amount credited" className="flex-1 rounded px-3 py-2"
                       style={{ background: C.board, color: C.cream, border: `1px solid ${C.edge}`, fontFamily: MONO }} />
                <button onClick={() => {
                          const got = Number(rec[p.id] || 0);
                          if (!got) return;
                          const ids = pending.map((s) => s.id);
                          patch((d) => ({
                            sales: d.sales.map((s) => ids.includes(s.id) ? { ...s, settled: true } : s),
                            payouts: [...d.payouts, { id: uid(), platform: p.id, expected,
                              received: got, variance: got - expected, at: new Date().toISOString() }],
                          }));
                          setRec({ ...rec, [p.id]: "" });
                          say(got < expected ? `Short by ${rupee(expected - got)} — logged` : "Payout reconciled");
                        }}
                        className="tap rounded px-4" style={{ background: C.marigold, color: C.board, fontWeight: 700, fontSize: 12 }}>
                  MATCH
                </button>
              </div>
            )}
            {past.slice().reverse().slice(0, 3).map((x) => (
              <div key={x.id} className="flex justify-between mt-2" style={{ fontSize: 11 }}>
                <span style={{ color: C.steel }}>{dayLabel(x.at)} · got {rupee(x.received)}</span>
                <span style={{ color: x.variance < 0 ? C.chili : C.mint, fontFamily: MONO }}>
                  {x.variance < 0 ? "−" : "+"}{rupee(Math.abs(x.variance))}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function CloseView({ db, patch, say, openDay, T }) {
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const variance = counted === "" ? null : Number(counted) - T.expected;
  const ok = counted !== "" && (variance === 0 || note.trim());

  return (
    <div>
      <div className="rounded-lg px-4 py-4 mb-4" style={{ background: C.tile, border: `1px solid ${C.edge}` }}>
        <Row label="Opening cash" value={rupee(openDay.openingCash)} />
        <Row label="Cash sales" value={"+ " + rupee(T.cash)} />
        <Row label="Khata received" value={"+ " + rupee(T.cashIn)} />
        <Row label="Cash expenses" value={"− " + rupee(T.cashExp)} />
        <div style={{ borderTop: `1px solid ${C.edge}` }} className="mt-2 pt-2">
          <Row label="Drawer should hold" value={rupee(T.expected)} strong />
        </div>
      </div>

      <Label>Now count it</Label>
      <BigNum value={counted} onChange={setCounted} color={C.cream} />

      {variance !== null && variance !== 0 && (
        <div className="rounded-lg px-4 py-3 my-3" style={{ background: C.tile, border: `1px solid ${C.chili}` }}>
          <div style={{ color: C.chili, fontFamily: DISPLAY, fontSize: 18 }} className="uppercase">
            {variance > 0 ? "Excess " : "Short "}{rupee(Math.abs(variance))}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened? (required)"
                 className="w-full rounded px-3 py-2 mt-2"
                 style={{ background: C.board, border: `1px solid ${C.edge}`, color: C.cream, fontSize: 13 }} />
        </div>
      )}

      <button disabled={!ok} onClick={() => {
                patch((d) => ({ days: d.days.map((x) => x.id === openDay.id
                  ? { ...x, status: "closed", counted: Number(counted), variance, note,
                      gross: T.gross, cogs: T.cogs, exp: T.totalExp, closedAt: new Date().toISOString() }
                  : x) }));
                say("Day locked");
              }}
              className="tap w-full py-4 rounded-lg mt-4"
              style={{ background: ok ? C.marigold : C.tile, color: ok ? C.board : C.steel,
                       border: `1px solid ${ok ? C.marigold : C.edge}`, fontFamily: DISPLAY, fontSize: 19, letterSpacing: ".06em" }}>
        LOCK THE DAY
      </button>
    </div>
  );
}

/* ================================================================== */
/*  REPORTS — owner only                                              */
/* ================================================================== */
function ReportsTab({ db, T, openDay }) {
  const closed = db.days.filter((d) => d.status === "closed");

  const trend = closed.slice(-7).map((d) => ({
    day: dayLabel(d.date), sales: d.gross || 0, profit: (d.gross || 0) - (d.cogs || 0) - (d.exp || 0),
  }));
  if (openDay) trend.push({ day: "Today", sales: T.gross, profit: T.gross - T.cogs - T.totalExp });

  const byItem = {};
  db.sales.forEach((s) => s.lines.forEach((l) => {
    byItem[l.name] = (byItem[l.name] || 0) + l.amount;
  }));
  const top = Object.entries(byItem).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v).slice(0, 6);

  const chan = [
    { name: "Counter", v: db.sales.filter((s) => s.channel === "counter").reduce((a, b) => a + b.net, 0) },
    { name: "Zomato", v: db.sales.filter((s) => s.channel === "zomato").reduce((a, b) => a + b.net, 0) },
    { name: "Swiggy", v: db.sales.filter((s) => s.channel === "swiggy").reduce((a, b) => a + b.net, 0) },
  ].filter((x) => x.v > 0);
  const CHAN_COLORS = [C.marigold, C.chili, C.plum];

  const grossAll = db.sales.reduce((a, b) => a + b.gross, 0);
  const netAll = db.sales.reduce((a, b) => a + b.net, 0);
  const cogsAll = db.sales.reduce((a, b) => a + b.cogs, 0);
  const expAll = db.expenses.reduce((a, b) => a + b.amount, 0);
  const wasteVal = db.stockMoves.filter((m) => m.type === "wastage").reduce((a, m) => {
    const rm = db.rawMaterials.find((r) => r.id === m.rmId);
    return a + Math.abs(m.qty) * (rm ? rm.avgCost : 0);
  }, 0);
  const profit = netAll - cogsAll - expAll;
  const margin = grossAll ? (profit / grossAll) * 100 : 0;

  return (
    <div className="px-4 pt-4">
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Stat label="Revenue" value={rupee(grossAll)} />
        <Stat label="Net profit" value={rupee(profit)} color={profit >= 0 ? C.mint : C.chili} />
        <Stat label="Margin" value={margin.toFixed(1) + "%"} color={margin >= 20 ? C.mint : C.marigold} />
        <Stat label="Wastage" value={rupee(wasteVal)} color={C.chili} />
      </div>

      {trend.length > 1 && (
        <Panel title="Sales & profit">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={trend} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={C.edge} vertical={false} />
              <XAxis dataKey="day" stroke={C.steel} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.steel} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: C.tile, border: `1px solid ${C.edge}`, borderRadius: 8, fontSize: 12 }}
                       labelStyle={{ color: C.cream }} />
              <Line type="monotone" dataKey="sales" stroke={C.marigold} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="profit" stroke={C.mint} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {top.length > 0 && (
        <Panel title="What actually sells">
          <ResponsiveContainer width="100%" height={30 + top.length * 26}>
            <BarChart data={top} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" stroke={C.steel} width={92} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: C.tile, border: `1px solid ${C.edge}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="v" fill={C.marigold} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {chan.length > 0 && (
        <Panel title="Where the money comes from (net of commission)">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={chan} dataKey="v" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={3}>
                {chan.map((e, i) => <Cell key={i} fill={CHAN_COLORS[i % 3]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.tile, border: `1px solid ${C.edge}`, borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {chan.map((c, i) => (
              <span key={c.name} style={{ fontSize: 11, color: C.steel }}>
                <span style={{ color: CHAN_COLORS[i % 3] }}>■</span> {c.name} {rupee(c.v)}
              </span>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Profit and loss">
        <Row label="Gross sales" value={rupee(grossAll)} />
        <Row label="Platform commission" value={"− " + rupee(grossAll - netAll)} />
        <Row label="Cost of ingredients" value={"− " + rupee(cogsAll)} />
        <Row label="Expenses" value={"− " + rupee(expAll)} />
        <div style={{ borderTop: `1px solid ${C.edge}` }} className="mt-2 pt-2">
          <Row label="Net profit" value={rupee(profit)} strong />
        </div>
      </Panel>

      {closed.length > 0 && (
        <Panel title="Closed days">
          {closed.slice().reverse().map((d) => (
            <div key={d.id} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${C.edge}` }}>
              <span style={{ fontSize: 13 }}>{dayLabel(d.date)}</span>
              <div className="flex gap-3">
                <span style={{ fontFamily: MONO, fontSize: 13 }}>{rupee(d.gross)}</span>
                {d.variance !== 0 && (
                  <span style={{ fontFamily: MONO, fontSize: 13, color: C.chili }}>
                    {d.variance > 0 ? "+" : "−"}{rupee(Math.abs(d.variance))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

/* ================================================================== */
/*  MORE — masters                                                    */
/* ================================================================== */
function MoreTab({ db, patch, say, role, setDb, goSell, openDay }) {
  const [edit, setEdit] = useState(null);

  if (role !== "owner")
    return <div className="px-5 pt-8"><Empty text="Menu, recipes and settings are owner-only." /></div>;

  return (
    <div className="px-4 pt-4">
      <Label>Menu & recipes</Label>
      <p style={{ color: C.steel, fontSize: 12 }} className="mt-1 mb-3">
        The recipe is what makes stock deduct itself. Change a quantity here and every future sale uses it.
      </p>

      {db.items.map((it) => (
        <div key={it.id} className="mb-2 rounded-lg" style={{ background: C.tile, border: `1px solid ${C.edge}` }}>
          <button onClick={() => setEdit(edit === it.id ? null : it.id)}
                  className="tap w-full flex items-center justify-between px-4 py-3">
            <div className="text-left">
              <div style={{ fontFamily: DISPLAY, fontSize: 15 }} className="uppercase">{it.name}</div>
              <div style={{ color: C.steel, fontSize: 11 }}>
                ₹{it.pc} counter · ₹{it.po} online · {it.recipe.length} ingredients
              </div>
            </div>
            <span style={{ color: C.steel }}>{edit === it.id ? "▲" : "▼"}</span>
          </button>

          {edit === it.id && (
            <div className="px-4 pb-4">
              <div className="flex gap-2 mb-3">
                <PriceField label="Counter ₹" value={it.pc}
                  onChange={(v) => patch((d) => ({ items: d.items.map((x) => x.id === it.id ? { ...x, pc: v } : x) }))} />
                <PriceField label="Online ₹" value={it.po}
                  onChange={(v) => patch((d) => ({ items: d.items.map((x) => x.id === it.id ? { ...x, po: v } : x) }))} />
              </div>
              {it.recipe.map(([rmId, q], idx) => {
                const rm = db.rawMaterials.find((r) => r.id === rmId);
                return (
                  <div key={rmId} className="flex items-center justify-between py-1.5">
                    <span style={{ fontSize: 13 }}>{rm.name}</span>
                    <div className="flex items-center gap-2">
                      <input inputMode="numeric" value={q}
                             onChange={(e) => {
                               const v = Number(e.target.value.replace(/[^\d.]/g, "") || 0);
                               patch((d) => ({ items: d.items.map((x) => x.id === it.id
                                 ? { ...x, recipe: x.recipe.map((r, i) => i === idx ? [r[0], v] : r) } : x) }));
                             }}
                             className="rounded px-2 py-1 text-right"
                             style={{ width: 62, background: C.board, color: C.cream,
                                      border: `1px solid ${C.edge}`, fontFamily: MONO, fontSize: 13 }} />
                      <span style={{ color: C.steel, fontSize: 11, width: 22 }}>{rm.unit}</span>
                      <button onClick={() => patch((d) => ({ items: d.items.map((x) => x.id === it.id
                                ? { ...x, recipe: x.recipe.filter((_, i) => i !== idx) } : x) }))}
                              className="tap rounded" aria-label={"Remove " + rm.name}
                              style={{ width: 22, height: 22, background: C.board, color: C.chili,
                                       border: `1px solid ${C.edge}`, fontSize: 13, lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                );
              })}
              <select value="" onChange={(e) => {
                        const v = Number(e.target.value); if (!v) return;
                        patch((d) => ({ items: d.items.map((x) => x.id === it.id
                          ? { ...x, recipe: [...x.recipe, [v, 10]] } : x) }));
                      }}
                      className="w-full rounded px-3 py-2 mt-2"
                      style={{ background: C.board, color: C.steel, border: `1px solid ${C.edge}`, fontSize: 12 }}>
                <option value="">+ Add ingredient…</option>
                {db.rawMaterials.filter((r) => !it.recipe.some(([id]) => id === r.id))
                  .map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div style={{ color: C.steel, fontSize: 11 }} className="mt-3">
                Ingredient cost {rupee(it.recipe.reduce((s, [rmId, q]) => {
                  const rm = db.rawMaterials.find((r) => r.id === rmId);
                  return s + (rm ? rm.avgCost * q : 0);
                }, 0))} · margin at counter {(
                  ((it.pc - it.recipe.reduce((s, [rmId, q]) => {
                    const rm = db.rawMaterials.find((r) => r.id === rmId);
                    return s + (rm ? rm.avgCost * q : 0);
                  }, 0)) / it.pc) * 100
                ).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="mt-6 mb-8">
        <Label>Danger zone</Label>
        <button onClick={() => { setDb(FRESH); say("Wiped back to seed data"); goSell(); }}
                className="tap w-full py-3 rounded-lg mt-2"
                style={{ background: C.tile, color: C.chili, border: `1px solid ${C.chili}`, fontSize: 14, fontWeight: 600 }}>
          Reset everything
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  SHARED UI                                                         */
/* ================================================================== */
const Label = ({ children }) => (
  <div style={{ color: C.steel, fontSize: 11, letterSpacing: ".1em" }} className="uppercase">{children}</div>
);

const Empty = ({ text }) => (
  <div className="py-8 text-center" style={{ color: C.steel, fontSize: 13 }}>{text}</div>
);

function BigNum({ value, onChange, color }) {
  return (
    <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
           placeholder="0"
           style={{ fontFamily: MONO, fontSize: 40, background: "transparent", color: color || C.marigold,
                    border: "none", borderBottom: `2px solid ${C.edge}`, outline: "none", width: "100%" }}
           className="py-1" />
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span style={{ color: strong ? C.cream : C.steel, fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: strong ? 21 : 14, fontWeight: 700,
                     color: strong ? C.marigold : C.cream }}>{value}</span>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-lg px-3 py-3" style={{ background: C.tile, border: `1px solid ${C.edge}` }}>
      <div style={{ color: C.steel, fontSize: 10, letterSpacing: ".08em" }} className="uppercase">{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: color || C.cream }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-lg px-4 py-4 mb-3" style={{ background: C.tile, border: `1px solid ${C.edge}` }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 15, letterSpacing: ".04em" }} className="uppercase mb-3">{title}</div>
      {children}
    </div>
  );
}

function Seg({ active, onClick, label }) {
  return (
    <button onClick={onClick} className="tap rounded-lg px-4 py-2"
            style={{ background: active ? C.marigold : C.tile, color: active ? C.board : C.steel,
                     border: `1px solid ${active ? C.marigold : C.edge}`, fontSize: 13, fontWeight: 700,
                     whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}

function MiniBtn({ label, onClick, primary }) {
  return (
    <button onClick={onClick} className="tap flex-1 py-3 rounded-lg"
            style={{ background: primary ? C.marigold : C.tile, color: primary ? C.board : C.cream,
                     border: `1px solid ${primary ? C.marigold : C.edge}`,
                     fontFamily: DISPLAY, fontSize: 14, letterSpacing: ".05em" }}>
      {label.toUpperCase()}
    </button>
  );
}

function PayBtn({ label, onClick, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="tap py-4 rounded-lg"
            style={{ background: primary ? (disabled ? C.edge : C.marigold) : C.board,
                     color: primary ? C.board : C.cream,
                     border: `1px solid ${primary ? "transparent" : C.marigold}`,
                     fontFamily: DISPLAY, fontSize: 16, letterSpacing: ".05em", opacity: disabled ? .5 : 1 }}>
      {label}
    </button>
  );
}

function PriceField({ label, value, onChange }) {
  return (
    <div className="flex-1">
      <div style={{ color: C.steel, fontSize: 10 }} className="uppercase mb-1">{label}</div>
      <input inputMode="numeric" value={value}
             onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "") || 0))}
             className="w-full rounded px-3 py-2"
             style={{ background: C.board, color: C.cream, border: `1px solid ${C.edge}`, fontFamily: MONO, fontSize: 14 }} />
    </div>
  );
}

function Badge({ n }) {
  return (
    <span className="absolute rounded-full flex items-center justify-center"
          style={{ top: -7, right: -7, width: 24, height: 24, background: C.board, color: C.marigold,
                   fontFamily: MONO, fontSize: 12, fontWeight: 700, border: `2px solid ${C.marigold}` }}>
      {n}
    </span>
  );
}
