import { useState, useEffect, useRef, useCallback } from "react";
import {
  NSE_COMPANIES,
  NSE_NEWS,
  fetchAI,
  sendDiscord,
  fmt, fmtPct, fmtVol, fmtTime, fmtDate,
  useMarket
} from "../../core/index.js";
import { notify, emitTray, getTauriFetch } from "./lib/tauri.js";

function usePersistent(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s != null ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV];
}

function Sparkline({ data, color, w = 88, h = 28 }) {
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * h}`).join(" ");
  const area = `M0,${h} L${pts.split(" ").join(" L")} L${w},${h} Z`;
  const gid = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function AreaChart({ stock }) {
  if (!stock) return null;
  const W = 520, H = 150, PL = 44, PR = 10, PT = 10, PB = 26;
  const data = stock.history, mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const iw = W - PL - PR, ih = H - PT - PB;
  const pts = data.map((v, i) => [PL + (i / (data.length - 1)) * iw, PT + ih - ((v - mn) / rng) * ih]);
  const line = "M" + pts.map(([x, y]) => `${x},${y}`).join(" L");
  const area = line + ` L${pts[pts.length - 1][0]},${PT + ih} L${PL},${PT + ih} Z`;
  const col = stock.changePct >= 0 ? "#16c784" : "#ea3943";
  const yT = [0, .25, .5, .75, 1].map(t => ({ y: PT + ih - t * ih, v: (mn + t * rng).toFixed(stock.price < 100 ? 2 : 0) }));
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <defs><linearGradient id="agc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={col} stopOpacity="0.28" />
        <stop offset="100%" stopColor={col} stopOpacity="0" />
      </linearGradient></defs>
      {yT.map(({ y, v }) => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={PL - 3} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{v}</text>
        </g>
      ))}
      <path d={area} fill="url(#agc)" />
      <path d={line} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={col} />
    </svg>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [clock, setClock] = useState(fmtTime());
  const [webhookUrl, setWebhookUrl] = usePersistent("nmh_webhook", "");
  const [apiKey, setApiKey] = usePersistent("nmh_apikey", "");
  const [threshold, setThreshold] = usePersistent("nmh_threshold", 2.5);
  const [showDiscord, setShowDiscord] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [discordLog, setDiscordLog] = useState([]);
  const [watchlist, setWatchlist] = usePersistent("nmh_watchlist", ["SCOM", "EQTY", "KCB"]);
  const [portfolio, setPortfolio] = usePersistent("nmh_portfolio", [
    { ticker: "SCOM", market: "NSE", shares: 1000, buyPrice: 17.20 },
    { ticker: "EQTY", market: "NSE", shares: 200, buyPrice: 39.50 },
  ]);
  const [showAddPos, setShowAddPos] = useState(false);
  const [newPos, setNewPos] = useState({ ticker: "", shares: "", buyPrice: "" });
  const [newsFilter, setNewsFilter] = useState("ALL");
  const [report, setReport] = useState("");
  const [tips, setTips] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);
  const [tab, setTab] = useState("nse");

  const onAlert = useCallback(async (a) => {
    const s = allStocksRef.current.find(x => x.ticker === a.ticker && x.market === a.market);
    if (!s) return;
    const reason = `${Math.abs(a.changePct).toFixed(2)}% ${a.changePct >= 0 ? "surge" : "drop"} on ${a.market}`;
    if (webhookUrlRef.current) {
      const f = await getTauriFetch();
      sendDiscord(webhookUrlRef.current, s, reason, f).then(ok => {
        if (ok) setDiscordLog(l => [`✅ ${s.ticker}: ${fmtPct(a.changePct)}`, ...l.slice(0, 14)]);
      });
    }
    notify(`${s.ticker} ${a.changePct >= 0 ? "▲" : "▼"} ${fmtPct(a.changePct)}`, `${s.name} — ${reason}`);
    setAlerts(al => [{ id: Date.now() + s.ticker, ticker: s.ticker, market: s.market, changePct: a.changePct, price: a.price, time: a.time }, ...al.slice(0, 29)]);
  }, []);

  const { nse, nerob, ea, global } = useMarket({ threshold, onAlert });

  const allStocks = [...nse, ...nerob, ...ea, ...global];
  const allStocksRef = useRef(allStocks);
  allStocksRef.current = allStocks;
  const webhookUrlRef = useRef(webhookUrl);
  webhookUrlRef.current = webhookUrl;

  useEffect(() => {
    const iv = setInterval(() => setClock(fmtTime()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const live = allStocks.find(s => s.ticker === selected.ticker && s.market === selected.market);
    if (live) setSelected(live);
  }, [nse, nerob, ea, global]);

  // push top NSE move to the system tray every 5s
  useEffect(() => {
    const iv = setInterval(() => {
      if (!nse.length) return;
      const top = [...nse].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
      emitTray(`${top.ticker} ${fmtPct(top.changePct)}`);
    }, 5000);
    return () => clearInterval(iv);
  }, [nse]);

  const getStock = (ticker, market) => allStocks.find(s => s.ticker === ticker && s.market === market);
  const toggleWatch = (ticker) => setWatchlist(w => w.includes(ticker) ? w.filter(t => t !== ticker) : [...w, ticker]);
  const isWatched = (ticker) => watchlist.includes(ticker);

  const addPosition = () => {
    const s = allStocks.find(s => s.ticker === newPos.ticker.toUpperCase());
    if (!s || !newPos.shares || !newPos.buyPrice) return;
    setPortfolio(p => [...p, { ticker: s.ticker, market: s.market, shares: parseFloat(newPos.shares), buyPrice: parseFloat(newPos.buyPrice) }]);
    setNewPos({ ticker: "", shares: "", buyPrice: "" });
    setShowAddPos(false);
  };

  const portfolioRows = portfolio.map(pos => {
    const live = getStock(pos.ticker, pos.market);
    if (!live) return null;
    const currentVal = live.price * pos.shares, costBasis = pos.buyPrice * pos.shares;
    const pnl = currentVal - costBasis, pnlPct = (pnl / costBasis) * 100;
    return { ...pos, live, currentVal, costBasis, pnl, pnlPct };
  }).filter(Boolean);

  const totalValue = portfolioRows.reduce((a, r) => a + r.currentVal, 0);
  const totalCost = portfolioRows.reduce((a, r) => a + r.costBasis, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const watchlistStocks = watchlist.map(t => allStocks.find(s => s.ticker === t)).filter(Boolean);
  const activeStocks = tab === "nse" ? nse : tab === "nerob" ? nerob : tab === "ea" ? ea : tab === "global" ? global : [];
  const nseIdx = nse.reduce((a, s) => a + s.changePct, 0) / nse.length;
  const top3 = [...nse].sort((a, b) => b.changePct - a.changePct).slice(0, 3);
  const bot3 = [...nse].sort((a, b) => a.changePct - b.changePct).slice(0, 3);
  const filteredNews = newsFilter === "ALL" ? NSE_NEWS : NSE_NEWS.filter(n => n.tag === newsFilter || n.tag === "NSE");
  const tapeItems = [...nse.slice(0, 8), ...nerob.slice(0, 4)];

  const manualAlert = async (s) => {
    if (!webhookUrl) { setShowDiscord(true); return; }
    const f = await getTauriFetch();
    const ok = await sendDiscord(webhookUrl, s, "Manual alert by analyst", f);
    setDiscordLog(l => [ok ? `✅ Manual: ${s.ticker} ${fmtPct(s.changePct)}` : `❌ Failed: ${s.ticker}`, ...l.slice(0, 14)]);
  };
  const doReport = async () => {
    setTab("report"); setLoadingReport(true);
    const data = nse.map(s => `${s.ticker} (${s.name}): KES ${fmt(s.price)}, ${fmtPct(s.changePct)}`).join("\n");
    setReport(await fetchAI(`You are a senior analyst at the Nairobi Securities Exchange (NSE). Write a professional 3-paragraph market report covering overall NSE sentiment, top movers, and outlook for Kenyan investors. Be specific.\n\nNSE Data:\n${data}`, apiKey, { fetchImpl: await getTauriFetch() }));
    setLoadingReport(false);
  };
  const doTips = async () => {
    setTab("tips"); setLoadingTips(true);
    const data = nse.map(s => `${s.ticker}: KES ${fmt(s.price)}, ${fmtPct(s.changePct)}, ${s.sector}`).join("\n");
    setTips(await fetchAI(`You are a licensed Kenyan financial advisor. Give 4 specific BUY/HOLD/SELL tips for NSE investors with ticker references and KES prices.\n\nNSE Data:\n${data}`, apiKey, { fetchImpl: await getTauriFetch() }));
    setLoadingTips(false);
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --bg:#09101f;--s1:#0e1828;--s2:#131e30;--border:#1c2b42;--border2:#243450;
      --green:#16c784;--red:#ea3943;--gold:#f3ba2f;--blue:#4a90ff;
      --text:#e2eaf5;--sub:#5f7399;--muted:#2d3f5c;
      --ff:'Outfit',sans-serif;--mono:'DM Mono',monospace;
    }
    html,body{background:var(--bg);color:var(--text);font-family:var(--ff);font-size:14px;min-height:100vh;}
    ::-webkit-scrollbar{width:3px;height:3px;}
    ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
    .ks{height:3px;background:linear-gradient(90deg,#000 0 20%,#bb0000 20% 40%,#006600 40% 60%,#bb0000 60% 80%,#000 80%);}
    .hdr{background:var(--s1);border-bottom:1px solid var(--border);padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:200;}
    .logo-text{font-size:19px;font-weight:800;letter-spacing:-.5px;}
    .logo-text em{color:var(--green);font-style:normal;}
    .logo-sub{font-size:9px;color:var(--sub);letter-spacing:2px;text-transform:uppercase;font-family:var(--mono);}
    .hdr-r{display:flex;align-items:center;gap:12px;}
    .live-badge{display:flex;align-items:center;gap:5px;background:rgba(22,199,132,.1);border:1px solid rgba(22,199,132,.3);border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;color:var(--green);}
    .live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:blink 1.2s infinite;}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
    .clk{font-family:var(--mono);font-size:11px;color:var(--sub);}
    .btn{padding:6px 14px;border-radius:7px;border:none;font-family:var(--ff);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;}
    .btn-o{background:transparent;border:1px solid var(--border2);color:var(--text);}
    .btn-o:hover{border-color:var(--green);color:var(--green);}
    .btn-g{background:var(--green);color:#000;font-weight:700;}
    .btn-g:hover{filter:brightness(1.1);box-shadow:0 0 14px rgba(22,199,132,.35);}
    .btn-r{background:rgba(234,57,67,.15);border:1px solid rgba(234,57,67,.35);color:var(--red);}
    .btn-r:hover{background:rgba(234,57,67,.25);}
    .btn-sm{padding:3px 9px;font-size:11px;border-radius:5px;}
    .btn-xs{padding:2px 7px;font-size:10px;border-radius:4px;}
    .tape-wrap{overflow:hidden;background:var(--s2);border-bottom:1px solid var(--border);}
    .tape{display:flex;width:max-content;animation:scroll 45s linear infinite;}
    @keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    .ti{padding:5px 20px;display:flex;gap:8px;align-items:center;font-size:11px;border-right:1px solid var(--border);white-space:nowrap;}
    .tsym{font-family:var(--mono);font-weight:500;}
    .tpr{font-family:var(--mono);color:var(--sub);}
    .up{color:var(--green);}.dn{color:var(--red);}
    .idx-bar{display:flex;gap:10px;padding:10px 20px;background:var(--s1);border-bottom:1px solid var(--border);flex-wrap:wrap;align-items:center;}
    .ic{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:7px 14px;min-width:128px;}
    .il{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--sub);font-family:var(--mono);}
    .iv{font-size:17px;font-weight:700;font-family:var(--mono);margin-top:1px;}
    .ichg{font-size:11px;font-family:var(--mono);}
    .drow{display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap;}
    .inp{background:var(--s2);border:1px solid var(--border2);border-radius:7px;padding:7px 11px;color:var(--text);font-family:var(--mono);font-size:11px;outline:none;width:100%;}
    .inp:focus{border-color:var(--green);}
    .inp-sm{width:56px;text-align:center;color:var(--green);}
    .nav{display:flex;padding:0 20px;background:var(--s1);border-bottom:1px solid var(--border);overflow-x:auto;}
    .nb{padding:11px 16px;font-size:12px;font-weight:600;border:none;background:transparent;color:var(--sub);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .18s;display:flex;align-items:center;gap:5px;}
    .nb:hover{color:var(--text);}
    .nb.active{color:var(--green);border-bottom-color:var(--green);}
    .np{background:var(--muted);color:var(--sub);font-size:9px;padding:1px 5px;border-radius:9px;font-family:var(--mono);}
    .nb.active .np{background:rgba(22,199,132,.18);color:var(--green);}
    .layout{display:grid;grid-template-columns:1fr 290px;min-height:calc(100vh - 230px);}
    .left{padding:16px 20px;border-right:1px solid var(--border);overflow-y:auto;}
    .right{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;background:var(--s1);}
    @media(max-width:860px){.layout{grid-template-columns:1fr}}
    .tbl{width:100%;border-collapse:collapse;}
    .tbl thead th{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--sub);padding:7px 9px;text-align:left;border-bottom:1px solid var(--border);font-family:var(--mono);font-weight:500;background:var(--s1);position:sticky;top:0;z-index:10;}
    .tbl tbody tr{cursor:pointer;border-bottom:1px solid rgba(28,43,66,.5);transition:background .1s;}
    .tbl tbody tr:hover{background:rgba(255,255,255,.02);}
    .tbl tbody tr.sel{background:rgba(22,199,132,.055);border-left:2px solid var(--green);}
    .tbl td{padding:8px 9px;vertical-align:middle;}
    .sym{font-family:var(--mono);font-size:13px;font-weight:500;}
    .co{font-size:12px;color:var(--sub);}
    .pr{font-family:var(--mono);font-size:13px;font-weight:500;}
    .badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-family:var(--mono);font-weight:500;}
    .badge.up{background:rgba(22,199,132,.12);color:var(--green);}
    .badge.dn{background:rgba(234,57,67,.12);color:var(--red);}
    .stag{display:inline-block;padding:2px 6px;border-radius:3px;font-size:9px;background:rgba(74,144,255,.1);color:#7aaeff;border:1px solid rgba(74,144,255,.2);}
    .fu{animation:fu .5s;}.fd{animation:fd .5s;}
    @keyframes fu{0%{background:rgba(22,199,132,.18)}100%{background:transparent}}
    @keyframes fd{0%{background:rgba(234,57,67,.18)}100%{background:transparent}}
    .panel{background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:13px;}
    .pt{font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--sub);margin-bottom:10px;font-family:var(--mono);}
    .det-sym{font-family:var(--mono);font-size:19px;font-weight:500;}
    .det-name{font-size:12px;color:var(--sub);margin-top:1px;}
    .det-pr{font-family:var(--mono);font-size:24px;font-weight:700;margin-top:8px;}
    .det-chg{font-family:var(--mono);font-size:12px;margin-top:2px;}
    .sg{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:9px;}
    .sb{background:var(--s1);border:1px solid var(--border);border-radius:6px;padding:6px 9px;}
    .sl{font-size:9px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;}
    .sv{font-family:var(--mono);font-size:12px;font-weight:500;margin-top:1px;}
    .mv{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(28,43,66,.4);cursor:pointer;}
    .mv:last-child{border:none;}
    .al{display:flex;justify-content:space-between;align-items:center;padding:4px 7px;border-radius:4px;margin-bottom:3px;font-size:11px;border-left:2px solid;}
    .al.up{background:rgba(22,199,132,.06);border-color:var(--green);}
    .al.dn{background:rgba(234,57,67,.06);border-color:var(--red);}
    .star-btn{background:none;border:none;cursor:pointer;font-size:14px;padding:0 2px;transition:transform .15s;}
    .star-btn:hover{transform:scale(1.3);}
    .pf-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
    .pfc{background:var(--s1);border:1px solid var(--border);border-radius:8px;padding:10px 12px;}
    .pfL{font-size:9px;color:var(--sub);letter-spacing:1px;text-transform:uppercase;font-family:var(--mono);}
    .pfV{font-family:var(--mono);font-size:16px;font-weight:700;margin-top:3px;}
    .pfr{display:grid;grid-template-columns:1.2fr .8fr .8fr 1fr 1fr .5fr;gap:6px;align-items:center;padding:8px 10px;border-radius:7px;margin-bottom:5px;background:var(--s1);border:1px solid var(--border);}
    .apf{background:var(--s2);border:1px solid var(--border2);border-radius:8px;padding:14px;margin-bottom:14px;display:grid;grid-template-columns:1.5fr 1fr 1fr auto;gap:8px;align-items:end;}
    .fld{display:flex;flex-direction:column;gap:4px;}
    .fld label{font-size:10px;color:var(--sub);letter-spacing:1px;text-transform:uppercase;}
    .fld input{background:var(--s1);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;color:var(--text);font-family:var(--mono);font-size:12px;outline:none;}
    .fld input:focus{border-color:var(--green);}
    .nf{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
    .nchip{padding:4px 12px;border-radius:20px;border:1px solid var(--border2);background:transparent;color:var(--sub);font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--ff);}
    .nchip:hover{border-color:var(--green);color:var(--green);}
    .nchip.active{background:rgba(22,199,132,.15);border-color:rgba(22,199,132,.4);color:var(--green);}
    .ni{display:flex;gap:12px;align-items:flex-start;padding:13px 0;border-bottom:1px solid rgba(28,43,66,.5);}
    .ni:last-child{border:none;}
    .ndot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;}
    .ndot.positive{background:var(--green);}.ndot.negative{background:var(--red);}
    .nh{font-size:13px;font-weight:500;line-height:1.45;margin-bottom:5px;}
    .nm{display:flex;gap:8px;align-items:center;font-size:11px;color:var(--sub);flex-wrap:wrap;}
    .ntag{padding:1px 7px;border-radius:3px;background:rgba(74,144,255,.1);color:#7aaeff;border:1px solid rgba(74,144,255,.2);font-family:var(--mono);font-size:10px;}
    .ntag.pos{background:rgba(22,199,132,.1);color:var(--green);border-color:rgba(22,199,132,.25);}
    .ntag.neg{background:rgba(234,57,67,.1);color:var(--red);border-color:rgba(234,57,67,.25);}
    .rb{font-size:13px;line-height:1.85;color:#c5d2e8;white-space:pre-wrap;}
    .ld{font-family:var(--mono);font-size:13px;color:var(--green);}
    .bl::after{content:"▋";animation:blink .7s steps(1) infinite;}
    .ll{font-family:var(--mono);font-size:10px;color:var(--sub);padding:2px 0;border-bottom:1px solid rgba(255,255,255,.03);}
    .sh{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
    .st{font-size:15px;font-weight:700;}
  `;

  return (
    <>
      <style>{CSS}</style>
      <div className="ks" />
      <div className="hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#16c784,#0e1828)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 13 }}>N</div>
          <div>
            <div className="logo-text">NSE</div>
            <div className="logo-sub">Nairobi Securities Exchange</div>
          </div>
        </div>
        <div className="hdr-r">
          <div className="live-badge"><div className="live-dot" />LIVE</div>
          <span className="clk">{clock} EAT · {fmtDate()}</span>
          <button className="btn btn-o btn-sm" onClick={() => setShowDiscord(v => !v)}>{showDiscord ? "✕" : "🔔"} Settings</button>
        </div>
      </div>

      <div className="tape-wrap">
        <div className="tape">
          {[...tapeItems, ...tapeItems].map((s, i) => (
            <div className="ti" key={i}>
              <span className="tsym">{s.ticker}</span>
              <span className="tpr">{s.currency} {fmt(s.price)}</span>
              <span className={s.changePct >= 0 ? "up" : "dn"}>{fmtPct(s.changePct)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="idx-bar">
        <div className="ic"><div className="il">NSE 20 Index</div><div className={`iv ${nseIdx >= 0 ? "up" : "dn"}`}>{(1842 + nseIdx * 10).toFixed(0)}</div><div className={`ichg ${nseIdx >= 0 ? "up" : "dn"}`}>{fmtPct(nseIdx)}</div></div>
        <div className="ic"><div className="il">NASI</div><div className={`iv ${nseIdx >= 0 ? "up" : "dn"}`}>{(113.4 + nseIdx * 2).toFixed(1)}</div><div className={`ichg ${nseIdx >= 0 ? "up" : "dn"}`}>{fmtPct(nseIdx * .8)}</div></div>
        <div className="ic"><div className="il">Volume</div><div className="iv" style={{ color: "var(--gold)" }}>{fmtVol(nse.reduce((a, s) => a + s.volume, 0))}</div><div className="ichg" style={{ color: "var(--sub)" }}>shares</div></div>
        <div className="ic"><div className="il">Market</div><div className="iv up" style={{ fontSize: 13, paddingTop: 4 }}>● OPEN</div><div className="ichg" style={{ color: "var(--sub)" }}>09:00–15:00 EAT</div></div>
        {showDiscord && (
          <div className="drow">
            <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Discord Webhook URL…" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
            <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Anthropic API Key (sk-…)" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            <span style={{ fontSize: 11, color: "var(--sub)", whiteSpace: "nowrap" }}>Alert ±</span>
            <input type="number" className="inp inp-sm" min="0.5" max="20" step="0.5" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))} />
            <span style={{ fontSize: 11, color: "var(--sub)" }}>%</span>
            {webhookUrl && <span style={{ fontSize: 11, color: "var(--green)", whiteSpace: "nowrap" }}>✓ Discord</span>}
            {apiKey && <span style={{ fontSize: 11, color: "var(--green)", whiteSpace: "nowrap" }}>✓ AI</span>}
          </div>
        )}
      </div>

      <div className="nav">
        {[["nse", "🇰🇪 NSE Kenya", nse.length], ["nerob", "🏛 NEROB", nerob.length], ["ea", "🌍 East Africa", ea.length], ["global", "🌐 Global", global.length], ["watchlist", "⭐ Watchlist", watchlist.length], ["portfolio", "💼 Portfolio", portfolio.length], ["news", "📰 News", NSE_NEWS.length], ["report", "🤖 AI Report", null], ["tips", "💡 Tips", null]].map(([key, label, count]) => (
          <button key={key} className={`nb ${tab === key ? "active" : ""}`} onClick={() => { key === "report" ? doReport() : key === "tips" ? doTips() : setTab(key); }}>
            {label}{count !== null && <span className="np">{count}</span>}
          </button>
        ))}
      </div>

      {["nse", "nerob", "ea", "global"].includes(tab) && (
        <div className="layout">
          <div className="left">
            <table className="tbl">
              <thead><tr>
                <th>Ticker</th><th>Company</th>{tab === "ea" && <th>Country</th>}<th>Sector</th><th>Price</th><th>Chg</th><th>%</th><th>High</th><th>Low</th><th>Vol</th><th>Chart</th><th>⭐</th><th>📣</th>
              </tr></thead>
              <tbody>
                {activeStocks.map(s => (
                  <tr key={s.ticker + s.market} className={`${selected?.ticker === s.ticker && selected?.market === s.market ? "sel" : ""} ${s.price > s.prev ? "fu" : s.price < s.prev ? "fd" : ""}`} onClick={() => setSelected(s)}>
                    <td><div className="sym">{s.ticker}</div><div style={{ fontSize: 9, color: "var(--sub)", fontFamily: "var(--mono)" }}>{s.market}</div></td>
                    <td><span className="co">{s.name}</span></td>
                    {tab === "ea" && <td><span style={{ fontSize: 12 }}>{s.country}</span></td>}
                    <td><span className="stag">{s.sector}</span></td>
                    <td><span className="pr">{s.currency} {fmt(s.price)}</span></td>
                    <td><span className={s.change >= 0 ? "up" : "dn"} style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{s.change >= 0 ? "+" : ""}{fmt(Math.abs(s.change))}</span></td>
                    <td><span className={`badge ${s.changePct >= 0 ? "up" : "dn"}`}>{fmtPct(s.changePct)}</span></td>
                    <td><span className="up" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{fmt(s.high)}</span></td>
                    <td><span className="dn" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{fmt(s.low)}</span></td>
                    <td><span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--sub)" }}>{fmtVol(s.volume)}</span></td>
                    <td><Sparkline data={s.history} color={s.changePct >= 0 ? "#16c784" : "#ea3943"} /></td>
                    <td><button className="star-btn" onClick={e => { e.stopPropagation(); toggleWatch(s.ticker); }}>{isWatched(s.ticker) ? "⭐" : "☆"}</button></td>
                    <td><button className="btn btn-o btn-xs" onClick={e => { e.stopPropagation(); manualAlert(s); }}>📣</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="right">
            {selected ? (
              <div className="panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div><div className="det-sym">{selected.ticker}</div><div className="det-name">{selected.name}</div><div style={{ fontSize: 10, color: "var(--sub)", marginTop: 2 }}>{selected.market} · {selected.sector}</div></div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span className={`badge ${selected.changePct >= 0 ? "up" : "dn"}`}>{fmtPct(selected.changePct)}</span>
                    <button className="star-btn" style={{ fontSize: 16 }} onClick={() => toggleWatch(selected.ticker)}>{isWatched(selected.ticker) ? "⭐" : "☆"}</button>
                  </div>
                </div>
                <div className={`det-pr ${selected.changePct >= 0 ? "up" : "dn"}`}>{selected.currency} {fmt(selected.price)}</div>
                <div className={`det-chg ${selected.changePct >= 0 ? "up" : "dn"}`}>{selected.change >= 0 ? "▲" : "▼"} {fmt(Math.abs(selected.change))} today</div>
                <div style={{ marginTop: 10 }}><AreaChart stock={selected} /></div>
                <div className="sg">
                  <div className="sb"><div className="sl">Open</div><div className="sv">{selected.currency} {fmt(selected.open)}</div></div>
                  <div className="sb"><div className="sl">Volume</div><div className="sv">{fmtVol(selected.volume)}</div></div>
                  <div className="sb"><div className="sl">High</div><div className="sv up">{fmt(selected.high)}</div></div>
                  <div className="sb"><div className="sl">Low</div><div className="sv dn">{fmt(selected.low)}</div></div>
                </div>
                <div style={{ marginTop: 8 }}><button className="btn btn-o btn-sm" onClick={() => manualAlert(selected)}>📣 Discord Alert</button></div>
              </div>
            ) : (
              <div className="panel" style={{ color: "var(--sub)", fontSize: 12, textAlign: "center", padding: "28px 0" }}>Click any stock to view details</div>
            )}
            {tab === "nse" && <>
              <div className="panel"><div className="pt">🔥 Top Gainers</div>{top3.map(s => (
                <div className="mv" key={s.ticker} onClick={() => setSelected(s)}>
                  <div><div className="sym" style={{ fontSize: 12 }}>{s.ticker}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>{s.name}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontFamily: "var(--mono)", fontSize: 11 }}>KES {fmt(s.price)}</div><span className="badge up" style={{ fontSize: 9 }}>{fmtPct(s.changePct)}</span></div>
                </div>
              ))}</div>
              <div className="panel"><div className="pt">📉 Top Losers</div>{bot3.map(s => (
                <div className="mv" key={s.ticker} onClick={() => setSelected(s)}>
                  <div><div className="sym" style={{ fontSize: 12 }}>{s.ticker}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>{s.name}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontFamily: "var(--mono)", fontSize: 11 }}>KES {fmt(s.price)}</div><span className="badge dn" style={{ fontSize: 9 }}>{fmtPct(s.changePct)}</span></div>
                </div>
              ))}</div>
            </>}
            <div className="panel"><div className="pt">⚡ Alerts</div>
              {alerts.length === 0 ? <div style={{ fontSize: 11, color: "var(--sub)", fontFamily: "var(--mono)" }}>No alerts yet.</div>
                : alerts.slice(0, 8).map(a => <div key={a.id} className={`al ${a.changePct >= 0 ? "up" : "dn"}`}><span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500 }}>{a.ticker}</span><span className={a.changePct >= 0 ? "up" : "dn"} style={{ fontSize: 11 }}>{fmtPct(a.changePct)}</span><span style={{ color: "var(--sub)", fontSize: 10 }}>{a.time}</span></div>)}
            </div>
            {discordLog.length > 0 && <div className="panel"><div className="pt">📡 Discord</div>{discordLog.map((l, i) => <div key={i} className="ll">{l}</div>)}</div>}
          </div>
        </div>
      )}

      {tab === "watchlist" && (
        <div style={{ padding: "18px 20px" }}>
          <div className="sh"><div className="st">⭐ Watchlist</div><span style={{ fontSize: 12, color: "var(--sub)" }}>Click ☆ on any stock to watch it</span></div>
          {watchlistStocks.length === 0 ? (
            <div style={{ color: "var(--sub)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No stocks watched yet. Click ☆ on any row to add here.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
              {watchlistStocks.map(s => (
                <div key={s.ticker} className="panel" style={{ cursor: "pointer" }} onClick={() => { setTab("nse"); setTimeout(() => setSelected(s), 50); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 500 }}>{s.ticker}</div>
                      <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 1 }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)" }}>{s.market} · {s.sector}</div>
                    </div>
                    <button className="star-btn" style={{ fontSize: 16 }} onClick={e => { e.stopPropagation(); toggleWatch(s.ticker); }}>⭐</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <div className={s.changePct >= 0 ? "up" : "dn"} style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700 }}>{s.currency} {fmt(s.price)}</div>
                      <div className={s.changePct >= 0 ? "up" : "dn"} style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 2 }}>{fmtPct(s.changePct)} today</div>
                    </div>
                    <Sparkline data={s.history} color={s.changePct >= 0 ? "#16c784" : "#ea3943"} w={80} h={36} />
                  </div>
                  <div style={{ marginTop: 8 }}><button className="btn btn-o btn-xs" onClick={e => { e.stopPropagation(); manualAlert(s); }}>📣 Alert</button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "portfolio" && (
        <div style={{ padding: "18px 20px" }}>
          <div className="sh"><div className="st">💼 Portfolio Tracker</div>
            <button className="btn btn-g btn-sm" onClick={() => setShowAddPos(v => !v)}>{showAddPos ? "✕ Cancel" : "+ Add Position"}</button>
          </div>
          <div className="pf-sum">
            <div className="pfc"><div className="pfL">Total Value</div><div className="pfV">KES {fmtVol(totalValue)}</div></div>
            <div className="pfc"><div className="pfL">Total P&L</div><div className={`pfV ${totalPnl >= 0 ? "up" : "dn"}`}>{totalPnl >= 0 ? "+" : "-"}KES {fmtVol(Math.abs(totalPnl))}</div><div className={totalPnl >= 0 ? "up" : "dn"} style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{fmtPct(totalPnlPct)}</div></div>
            <div className="pfc"><div className="pfL">Cost Basis</div><div className="pfV">KES {fmtVol(totalCost)}</div></div>
          </div>
          {showAddPos && (
            <div className="apf">
              <div className="fld"><label>Ticker</label><input placeholder="e.g. SCOM" value={newPos.ticker} onChange={e => setNewPos(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} /></div>
              <div className="fld"><label>Shares</label><input type="number" placeholder="100" value={newPos.shares} onChange={e => setNewPos(p => ({ ...p, shares: e.target.value }))} /></div>
              <div className="fld"><label>Buy Price (KES)</label><input type="number" placeholder="17.20" value={newPos.buyPrice} onChange={e => setNewPos(p => ({ ...p, buyPrice: e.target.value }))} /></div>
              <button className="btn btn-g" onClick={addPosition}>Add</button>
            </div>
          )}
          {portfolioRows.length === 0 ? (
            <div style={{ color: "var(--sub)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No positions yet. Add your first above.</div>
          ) : (<>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr .8fr 1fr 1fr .5fr", gap: 6, padding: "0 10px 6px", marginBottom: 4 }}>
              {["Stock", "Shares", "Buy Price", "Current Value", "P&L", ""].map(h => <span key={h} style={{ fontSize: 9, color: "var(--sub)", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: "var(--mono)" }}>{h}</span>)}
            </div>
            {portfolioRows.map((row, i) => (
              <div className="pfr" key={i}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500 }}>{row.ticker}</div>
                  <div style={{ fontSize: 10, color: "var(--sub)" }}>{row.live.name}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, marginTop: 2 }}>{row.live.currency} {fmt(row.live.price)} <span className={row.live.changePct >= 0 ? "up" : "dn"} style={{ fontSize: 10 }}>{fmtPct(row.live.changePct)}</span></div>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{row.shares.toLocaleString()}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--sub)" }}>KES {fmt(row.buyPrice)}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500 }}>KES {fmtVol(row.currentVal)}</div>
                <div>
                  <div className={row.pnl >= 0 ? "up" : "dn"} style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>{row.pnl >= 0 ? "+" : "-"}KES {fmtVol(Math.abs(row.pnl))}</div>
                  <div className={row.pnl >= 0 ? "up" : "dn"} style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{fmtPct(row.pnlPct)}</div>
                </div>
                <button className="btn btn-r btn-xs" onClick={() => setPortfolio(p => p.filter((_, idx) => idx !== i))}>✕</button>
              </div>
            ))}
          </>)}
        </div>
      )}

      {tab === "news" && (
        <div style={{ padding: "18px 20px", maxWidth: 820 }}>
          <div className="sh"><div className="st">📰 NSE & Kenya Market News</div></div>
          <div className="nf">
            {["ALL", ...NSE_COMPANIES.map(s => s.ticker)].map(t => (
              <button key={t} className={`nchip ${newsFilter === t ? "active" : ""}`} onClick={() => setNewsFilter(t)}>{t}</button>
            ))}
          </div>
          <div className="panel">
            {filteredNews.map(n => (
              <div className="ni" key={n.id}>
                <div className={`ndot ${n.sentiment}`} />
                <div style={{ flex: 1 }}>
                  <div className="nh">{n.headline}</div>
                  <div className="nm">
                    <span>{n.source}</span><span>·</span><span>{n.time}</span>
                    <span className="ntag">{n.tag}</span>
                    <span className={`ntag ${n.sentiment === "positive" ? "pos" : "neg"}`}>{n.sentiment === "positive" ? "▲ Positive" : "▼ Negative"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "report" && (
        <div style={{ padding: "18px 20px", maxWidth: 820 }}>
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>🤖 AI Market Report — NSE Kenya</div>
              <button className="btn btn-g btn-sm" onClick={doReport} disabled={loadingReport}>↻ Refresh</button>
            </div>
            {loadingReport ? <div className="ld">Analysing NSE market data<span className="bl" /></div> : report ? <div className="rb">{report}</div> : <div style={{ color: "var(--sub)" }}>Loading…</div>}
          </div>
        </div>
      )}

      {tab === "tips" && (
        <div style={{ padding: "18px 20px", maxWidth: 820 }}>
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>💡 AI Investment Tips — NSE Kenya</div>
              <button className="btn btn-g btn-sm" onClick={doTips} disabled={loadingTips}>↻ Refresh</button>
            </div>
            {loadingTips ? <div className="ld">Evaluating NSE positions<span className="bl" /></div> : tips ? <div className="rb">{tips}</div> : <div style={{ color: "var(--sub)" }}>Loading…</div>}
          </div>
        </div>
      )}
    </>
  );
}
