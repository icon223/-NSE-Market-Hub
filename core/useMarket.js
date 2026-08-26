import { useState, useEffect, useRef } from "react";
import { initStock, tickPool } from "./engine.js";
import {
  NSE_COMPANIES, NEROB_COMPANIES, EA_COMPANIES, GLOBAL,
} from "./data.js";
import { getBars, getQuote } from "./backend.js";

const POOLS = ["nse", "nerob", "ea", "global"];
const US_TICKERS = GLOBAL.map((g) => g.ticker);

const SEEDS = {
  nse: NSE_COMPANIES,
  nerob: NEROB_COMPANIES,
  ea: EA_COMPANIES,
  global: GLOBAL,
};

// Runs the 2s live tick loop for all four markets and returns the live stocks.
// `onAlert(alert)` fires once per threshold breach. When `live`+`backend` are set,
// the US ("Global") symbols are driven by real Alpaca quotes instead of the
// simulator, and alerts are evaluated against real prices.
export function useMarket({ threshold = 2.5, onAlert, backend = null, token = null, live = false } = {}) {
  const [nse, setNse] = useState(() => initStock(SEEDS.nse));
  const [nerob, setNerob] = useState(() => initStock(SEEDS.nerob));
  const [ea, setEa] = useState(() => initStock(SEEDS.ea));
  const [global, setGlobal] = useState(() => initStock(SEEDS.global));

  const ref = useRef({ nse, nerob, ea, global });
  useEffect(() => { ref.current = { nse, nerob, ea, global }; }, [nse, nerob, ea, global]);

  const threshRef = useRef(threshold);
  threshRef.current = threshold;
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;
  const liveRef = useRef(live);
  liveRef.current = live;
  const backendRef = useRef(backend);
  backendRef.current = backend;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const liveOpen = useRef({});
  const alerted = useRef({});

  // Simulator tick for the non-live pools (and global when not live).
  useEffect(() => {
    const setters = { nse: setNse, nerob: setNerob, ea: setEa, global: setGlobal };
    const iv = setInterval(() => {
      const t = threshRef.current;
      const cur = ref.current;
      const next = {};
      const alerts = [];
      for (const k of POOLS) {
        if (k === "global" && liveRef.current) continue; // global handled by live feed
        const { stocks, alerts: al } = tickPool(cur[k], t);
        next[k] = stocks;
        if (al.length) alerts.push(...al);
      }
      ref.current = { ...ref.current, ...next };
      for (const k of POOLS) if (next[k]) setters[k](next[k]);
      if (alerts.length && onAlertRef.current) alerts.forEach((a) => onAlertRef.current(a));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  // Live feed for US symbols: seed history from bars, then stream quotes.
  useEffect(() => {
    if (!live || !backend) return;
    let active = true;

    const seed = async () => {
      for (const sym of US_TICKERS) {
        try {
          const bars = await getBars(sym, backend, token);
          if (!active || !bars.length) continue;
          const open = bars[0];
          const price = bars[bars.length - 1];
          liveOpen.current[sym] = open;
          setGlobal((prev) =>
            prev.map((s) =>
              s.ticker === sym
                ? { ...s, history: bars, open, price, prev: price, change: price - open, changePct: ((price - open) / open) * 100, high: Math.max(...bars), low: Math.min(...bars) }
                : s
            )
          );
        } catch {}
      }
    };

    const tick = async () => {
      await Promise.all(
        US_TICKERS.map(async (sym) => {
          try {
            const q = await getQuote(sym, backend, token);
            if (!active) return;
            setGlobal((prev) =>
              prev.map((s) => {
                if (s.ticker !== sym) return s;
                const price = q.price;
                const open = liveOpen.current[sym] ?? s.open;
                const history = [...s.history.slice(-49), price];
                const changePct = ((price - open) / open) * 100;
                const a = {
                  ticker: s.ticker, market: s.market, name: s.name,
                  changePct, price, currency: s.currency,
                  time: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                  isUp: changePct >= 0,
                };
                if (Math.abs(changePct) >= threshRef.current && !alerted.current[sym]) {
                  alerted.current[sym] = true;
                  onAlertRef.current && onAlertRef.current(a);
                }
                if (Math.abs(changePct) < threshRef.current / 2) alerted.current[sym] = false;
                return { ...s, price, prev: s.price, change: price - open, changePct, history, high: Math.max(s.high, price), low: Math.min(s.low, price) };
              })
            );
          } catch {}
        })
      );
    };

    seed().then(tick);
    const id = setInterval(tick, 2000);
    return () => { active = false; clearInterval(id); };
  }, [live, backend, token]);

  return { nse, nerob, ea, global };
}
