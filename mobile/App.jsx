import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StatusBar, StyleSheet, Dimensions, Platform
} from "react-native";
import {
  NSE_COMPANIES, NSE_NEWS,
  fetchAI, sendDiscord, fmt, fmtPct, fmtVol, fmtTime, fmtDate, useMarket,
  getMode, getAccount, getPositions, placeOrder
} from "../core/index.js";
import Sparkline from "./components/Sparkline.jsx";
import AreaChart from "./components/AreaChart.jsx";
import { usePersistentState } from "./store.js";
import { notify } from "./notifications.js";
import { C, mono } from "./theme.js";

const { width: SCREEN_W } = Dimensions.get("window");
const isTradeable = (s) => s.market === "NASDAQ" || s.market === "NYSE";

function Badge({ pct }) {
  const up = pct >= 0;
  return (
    <View style={[styles.badge, { backgroundColor: up ? "rgba(22,199,132,.12)" : "rgba(234,57,67,.12)" }]}>
      <Text style={{ color: up ? C.green : C.red, fontFamily: mono.fontFamily, fontSize: 11 }}>
        {fmtPct(pct)}
      </Text>
    </View>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [clock, setClock] = useState(fmtTime());
  const [webhookUrl, setWebhookUrl] = usePersistentState("nmh_webhook", "");
  const [apiKey, setApiKey] = usePersistentState("nmh_apikey", "");
  const [threshold, setThreshold] = usePersistentState("nmh_threshold", 2.5);
  const [watchlist, setWatchlist] = usePersistentState("nmh_watchlist", ["SCOM", "EQTY", "KCB"]);
  const [portfolio, setPortfolio] = usePersistentState("nmh_portfolio", [
    { ticker: "SCOM", market: "NSE", shares: 1000, buyPrice: 17.20 },
    { ticker: "EQTY", market: "NSE", shares: 200, buyPrice: 39.50 },
  ]);

  const [tab, setTab] = useState("markets");
  const [marketSub, setMarketSub] = useState("nse");
  const [aiSub, setAiSub] = useState("report");
  const [showSettings, setShowSettings] = useState(false);

  const [backendUrl, setBackendUrl] = usePersistentState("nmh_backend", "");
  const [serverToken, setServerToken] = usePersistentState("nmh_token", "");
  const [backendStatus, setBackendStatus] = useState("off");
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [tradeSym, setTradeSym] = useState(null);
  const [tradeSide, setTradeSide] = useState("buy");
  const [tradeType, setTradeType] = useState("market");
  const [tradeQty, setTradeQty] = useState("");
  const [tradeLimit, setTradeLimit] = useState("");
  const [tradeMsg, setTradeMsg] = useState("");

  const connected = backendStatus === "paper" || backendStatus === "live";
  const realMoney = backendStatus === "live";

  const [alerts, setAlerts] = useState([]);
  const [newsFilter, setNewsFilter] = useState("ALL");
  const [report, setReport] = useState("");
  const [tips, setTips] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);

  const onAlert = useCallback(async (a) => {
    const s = allStocksRef.current.find(x => x.ticker === a.ticker && x.market === a.market);
    if (!s) return;
    const reason = `${Math.abs(a.changePct).toFixed(2)}% ${a.changePct >= 0 ? "surge" : "drop"} on ${a.market}`;
    if (webhookUrlRef.current) {
      const ok = await sendDiscord(webhookUrlRef.current, s, reason);
      if (ok) setAlerts(al => [{ id: Date.now() + s.ticker, ticker: s.ticker, market: s.market, changePct: a.changePct, price: a.price, time: a.time }, ...al.slice(0, 29)]);
    }
    notify(`${s.ticker} ${a.changePct >= 0 ? "▲" : "▼"} ${fmtPct(a.changePct)}`, `${s.name} — ${reason}`);
  }, []);

  useEffect(() => {
    if (!backendUrl || !serverToken) {
      setBackendStatus("off"); setAccount(null); setPositions([]); return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const m = await getMode(backendUrl, serverToken);
        const [acc, pos] = await Promise.all([
          getAccount(backendUrl, serverToken),
          getPositions(backendUrl, serverToken),
        ]);
        if (!active) return;
        setBackendStatus(m.paper ? "paper" : "live");
        setAccount(acc); setPositions(pos);
      } catch (e) {
        if (active) setBackendStatus("error");
      }
    };
    refresh();
    const id = setInterval(refresh, 6000);
    return () => { active = false; clearInterval(id); };
  }, [backendUrl, serverToken]);

  const submitTrade = async () => {
    if (!tradeSym || !tradeQty) return;
    setTradeMsg("Placing order…");
    try {
      const o = await placeOrder(
        { symbol: tradeSym, qty: parseFloat(tradeQty), side: tradeSide, type: tradeType, limit_price: tradeType === "limit" ? parseFloat(tradeLimit) : undefined },
        backendUrl, serverToken
      );
      setTradeMsg(`✅ Submitted (${o.status || "new"})`);
      setTimeout(() => setTradeSym(null), 1200);
    } catch (e) {
      setTradeMsg("❌ " + (e && e.message ? e.message : "failed"));
    }
  };

  const { nse, nerob, ea, global } = useMarket({ threshold, onAlert, backend: connected ? backendUrl : null, token: connected ? serverToken : null, live: connected });

  const allStocks = useMemo(() => [...nse, ...nerob, ...ea, ...global], [nse, nerob, ea, global]);
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
  }, [allStocks]);

  const getStock = (ticker, market) => allStocks.find(s => s.ticker === ticker && s.market === market);
  const toggleWatch = (ticker) => setWatchlist(w => w.includes(ticker) ? w.filter(t => t !== ticker) : [...w, ticker]);
  const isWatched = (ticker) => watchlist.includes(ticker);

  const manualAlert = async (s) => {
    if (!webhookUrl) { setShowSettings(true); return; }
    const ok = await sendDiscord(webhookUrl, s, "Manual alert by analyst");
    setAlerts(al => [{ id: Date.now() + s.ticker + "m", ticker: s.ticker, market: s.market, changePct: s.changePct, price: s.price, time: fmtTime() }, ...al.slice(0, 29)]);
  };

  const doReport = async () => {
    setAiSub("report"); setLoadingReport(true);
    const data = nse.map(s => `${s.ticker} (${s.name}): KES ${fmt(s.price)}, ${fmtPct(s.changePct)}`).join("\n");
    setReport(await fetchAI(`You are a senior analyst at the Nairobi Securities Exchange (NSE). Write a professional 3-paragraph market report covering overall NSE sentiment, top movers, and outlook for Kenyan investors. Be specific.\n\nNSE Data:\n${data}`, apiKey));
    setLoadingReport(false);
  };
  const doTips = async () => {
    setAiSub("tips"); setLoadingTips(true);
    const data = nse.map(s => `${s.ticker}: KES ${fmt(s.price)}, ${fmtPct(s.changePct)}, ${s.sector}`).join("\n");
    setTips(await fetchAI(`You are a licensed Kenyan financial advisor. Give 4 specific BUY/HOLD/SELL tips for NSE investors with ticker references and KES prices.\n\nNSE Data:\n${data}`, apiKey));
    setLoadingTips(false);
  };

  const activeStocks = marketSub === "nse" ? nse : marketSub === "nerob" ? nerob : marketSub === "ea" ? ea : global;
  const nseIdx = nse.reduce((a, s) => a + s.changePct, 0) / nse.length;

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

  const filteredNews = newsFilter === "ALL" ? NSE_NEWS : NSE_NEWS.filter(n => n.tag === newsFilter || n.tag === "NSE");
  const watchlistStocks = watchlist.map(t => allStocks.find(s => s.ticker === t)).filter(Boolean);

  const renderMarketRow = (s) => (
    <TouchableOpacity key={s.ticker + s.market} style={styles.row} onPress={() => setSelected(s)}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sym, { color: C.text }]}>{s.ticker} <Text style={[styles.mkt, { color: C.sub }]}>{s.market}</Text></Text>
        <Text style={{ color: C.sub, fontSize: 12 }}>{s.name}</Text>
      </View>
      <Sparkline data={s.history} color={s.changePct >= 0 ? C.green : C.red} w={64} h={26} />
      <View style={{ width: 92, alignItems: "flex-end" }}>
        <Text style={{ color: C.text, fontFamily: mono.fontFamily, fontSize: 13 }}>{s.currency} {fmt(s.price)}</Text>
        <Badge pct={s.changePct} />
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); toggleWatch(s.ticker); }} style={{ paddingHorizontal: 6 }}>
        <Text style={{ fontSize: 16 }}>{isWatched(s.ticker) ? "⭐" : "☆"}</Text>
      </TouchableOpacity>
      {isTradeable(s) && (
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setTradeSide("buy"); setTradeSym(s.ticker); setTradeMsg(""); }} style={styles.miniBtn}>
          <Text style={{ fontSize: 12, color: C.green }}>💱</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); manualAlert(s); }} style={styles.miniBtn}>
        <Text style={{ fontSize: 12 }}>📣</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: C.green, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>N</Text>
          </View>
          <View>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: "800" }}>NSE Market Hub</Text>
            <Text style={{ color: C.sub, fontSize: 9, letterSpacing: 1 }}>NAIROBI SECURITIES EXCHANGE</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[styles.liveBadge, connected && { backgroundColor: realMoney ? "rgba(234,57,67,.12)" : "rgba(22,199,132,.12)", borderColor: realMoney ? "rgba(234,57,67,.3)" : "rgba(22,199,132,.3)" }]}>
            <View style={[styles.liveDot, { backgroundColor: connected ? (realMoney ? C.red : C.green) : C.sub }]} />
            <Text style={{ color: connected ? (realMoney ? C.red : C.green) : C.sub, fontSize: 11, fontWeight: "600" }}>{connected ? (realMoney ? "LIVE $" : "PAPER") : "SIM"}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.gearBtn}>
            <Text style={{ color: C.text, fontSize: 16 }}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 90 }}>
        {tab === "markets" && (
          <View style={{ padding: 12 }}>
            <Text style={styles.clock}>{clock} EAT · {fmtDate()}</Text>
            <View style={styles.seg}>
              {[["nse", "NSE"], ["nerob", "NEROB"], ["ea", "EA"], ["global", "Global"]].map(([k, l]) => (
                <TouchableOpacity key={k} style={[styles.segBtn, marketSub === k && styles.segActive]} onPress={() => setMarketSub(k)}>
                  <Text style={{ color: marketSub === k ? C.green : C.sub, fontSize: 12, fontWeight: "600" }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selected && (
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={[styles.detSym, { color: C.text }]}>{selected.ticker}</Text>
                    <Text style={{ color: C.sub, fontSize: 12 }}>{selected.name}</Text>
                    <Text style={{ color: C.sub, fontSize: 10 }}>{selected.market} · {selected.sector}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Badge pct={selected.changePct} />
                    <TouchableOpacity onPress={() => toggleWatch(selected.ticker)} style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 18 }}>{isWatched(selected.ticker) ? "⭐" : "☆"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.detPr, { color: selected.changePct >= 0 ? C.green : C.red }]}>{selected.currency} {fmt(selected.price)}</Text>
                <AreaChart stock={selected} />
                <View style={styles.sg}>
                  {[["Open", `${selected.currency} ${fmt(selected.open)}`], ["Volume", fmtVol(selected.volume)], ["High", `${selected.currency} ${fmt(selected.high)}`], ["Low", `${selected.currency} ${fmt(selected.low)}`]].map(([l, v]) => (
                    <View key={l} style={styles.sb}><Text style={{ color: C.sub, fontSize: 9 }}>{l.toUpperCase()}</Text><Text style={[styles.sv, { color: C.text }]}>{v}</Text></View>
                  ))}
                </View>
                {isTradeable(selected) && (
                  <TouchableOpacity style={[styles.outlineBtn, { borderColor: C.green }]} onPress={() => { setTradeSide("buy"); setTradeSym(selected.ticker); setTradeMsg(""); }}>
                    <Text style={{ color: C.green, fontWeight: "600" }}>💱 Trade</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.outlineBtn} onPress={() => manualAlert(selected)}>
                  <Text style={{ color: C.text }}>📣 Discord Alert</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={{ color: C.sub, fontSize: 11 }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeStocks.map(renderMarketRow)}

            {alerts.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.pt}>⚡ Alerts</Text>
                {alerts.slice(0, 8).map(a => (
                  <View key={a.id} style={[styles.al, { borderLeftColor: a.changePct >= 0 ? C.green : C.red, backgroundColor: a.changePct >= 0 ? "rgba(22,199,132,.06)" : "rgba(234,57,67,.06)" }]}>
                    <Text style={[mono, { color: C.text, fontSize: 11 }]}>{a.ticker}</Text>
                    <Text style={{ color: a.changePct >= 0 ? C.green : C.red, fontSize: 11 }}>{fmtPct(a.changePct)}</Text>
                    <Text style={{ color: C.sub, fontSize: 10 }}>{a.time}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {tab === "watch" && (
          <View style={{ padding: 12 }}>
            <Text style={styles.st}>⭐ Watchlist</Text>
            {watchlistStocks.length === 0
              ? <Text style={{ color: C.sub, marginTop: 20 }}>No stocks watched yet. Tap ☆ on any market row.</Text>
              : watchlistStocks.map(s => (
                <TouchableOpacity key={s.ticker} style={styles.card} onPress={() => { setMarketSub(s.market.toLowerCase() === "nerob" ? "nerob" : s.market === "EA" ? "ea" : s.market === "NSE" ? "nse" : "global"); setTab("markets"); setTimeout(() => setSelected(s), 50); }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View>
                      <Text style={[styles.detSym, { color: C.text }]}>{s.ticker}</Text>
                      <Text style={{ color: C.sub, fontSize: 11 }}>{s.name}</Text>
                      <Text style={{ color: C.sub, fontSize: 10 }}>{s.market} · {s.sector}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleWatch(s.ticker)}><Text style={{ fontSize: 18 }}>⭐</Text></TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
                    <Text style={[styles.detPr, { color: s.changePct >= 0 ? C.green : C.red }]}>{s.currency} {fmt(s.price)}</Text>
                    <Sparkline data={s.history} color={s.changePct >= 0 ? C.green : C.red} w={80} h={32} />
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {tab === "portfolio" && (
          <View style={{ padding: 12 }}>
            <Text style={styles.st}>💼 Portfolio</Text>
            {connected && (
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>🏦 Alpaca {realMoney ? "Live" : "Paper"}</Text>
                  <Text style={{ color: realMoney ? C.red : C.green, fontSize: 10, letterSpacing: 1 }}>{realMoney ? "REAL MONEY" : "PAPER"}</Text>
                </View>
                {account && (
                  <View style={styles.pfSum}>
                    <View style={styles.pfc}><Text style={styles.pfL}>EQUITY</Text><Text style={[styles.pfV, { color: C.text }]}>$ {fmtVol(parseFloat(account.equity || 0))}</Text></View>
                    <View style={styles.pfc}><Text style={styles.pfL}>BUY PWR</Text><Text style={[styles.pfV, { color: C.text }]}>$ {fmtVol(parseFloat(account.buying_power || 0))}</Text></View>
                  </View>
                )}
                {positions.length === 0
                  ? <Text style={{ color: C.sub, marginTop: 8 }}>No open positions.</Text>
                  : positions.map(p => {
                    const upnl = parseFloat(p.unrealized_pl || 0);
                    return (
                      <View key={p.symbol} style={[styles.pfr, { marginTop: 6 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sym, { color: C.text }]}>{p.symbol}</Text>
                          <Text style={{ color: C.sub, fontSize: 10 }}>qty {parseFloat(p.qty || 0).toLocaleString()} @ $ {fmt(parseFloat(p.avg_entry_price || 0))}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[styles.pfV, { color: C.text, fontSize: 13 }]}>$ {fmt(parseFloat(p.market_value || 0))}</Text>
                          <Text style={{ color: upnl >= 0 ? C.green : C.red, fontSize: 12 }}>{upnl >= 0 ? "+" : "-"} $ {fmtVol(Math.abs(upnl))}</Text>
                        </View>
                        <View style={{ flexDirection: "row", marginLeft: 8 }}>
                          <TouchableOpacity onPress={() => { setTradeSide("buy"); setTradeSym(p.symbol); setTradeMsg(""); }}><Text style={{ color: C.green, fontSize: 12, marginRight: 8 }}>Buy</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => { setTradeSide("sell"); setTradeSym(p.symbol); setTradeMsg(""); }}><Text style={{ color: C.red, fontSize: 12 }}>Sell</Text></TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
            <View style={styles.pfSum}>
              <View style={styles.pfc}><Text style={styles.pfL}>VALUE</Text><Text style={[styles.pfV, { color: C.text }]}>KES {fmtVol(totalValue)}</Text></View>
              <View style={styles.pfc}><Text style={styles.pfL}>P&L</Text><Text style={[styles.pfV, { color: totalPnl >= 0 ? C.green : C.red }]}>{totalPnl >= 0 ? "+" : "-"}KES {fmtVol(Math.abs(totalPnl))}</Text><Text style={{ color: totalPnl >= 0 ? C.green : C.red, fontSize: 11 }}>{fmtPct(totalPnlPct)}</Text></View>
              <View style={styles.pfc}><Text style={styles.pfL}>COST</Text><Text style={[styles.pfV, { color: C.text }]}>KES {fmtVol(totalCost)}</Text></View>
            </View>
            {portfolioRows.length === 0
              ? <Text style={{ color: C.sub, marginTop: 20 }}>No positions yet.</Text>
              : portfolioRows.map((row, i) => (
                <View key={i} style={styles.pfr}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sym, { color: C.text }]}>{row.ticker}</Text>
                    <Text style={{ color: C.sub, fontSize: 10 }}>{row.live.name}</Text>
                    <Text style={{ color: C.text, fontSize: 11 }}>{row.live.currency} {fmt(row.live.price)} <Text style={{ color: row.live.changePct >= 0 ? C.green : C.red }}>{fmtPct(row.live.changePct)}</Text></Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.pfV, { color: C.text, fontSize: 13 }]}>KES {fmtVol(row.currentVal)}</Text>
                    <Text style={{ color: row.pnl >= 0 ? C.green : C.red, fontSize: 12 }}>{row.pnl >= 0 ? "+" : "-"}KES {fmtVol(Math.abs(row.pnl))} ({fmtPct(row.pnlPct)})</Text>
                    <TouchableOpacity onPress={() => setPortfolio(p => p.filter((_, idx) => idx !== i))}><Text style={{ color: C.red, fontSize: 12 }}>✕ remove</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        )}

        {tab === "news" && (
          <View style={{ padding: 12 }}>
            <Text style={styles.st}>📰 NSE & Kenya Market News</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {["ALL", ...NSE_COMPANIES.map(s => s.ticker)].map(t => (
                <TouchableOpacity key={t} style={[styles.nchip, newsFilter === t && styles.nchipActive]} onPress={() => setNewsFilter(t)}>
                  <Text style={{ color: newsFilter === t ? C.green : C.sub, fontSize: 11, fontWeight: "600" }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {filteredNews.map(n => (
              <View key={n.id} style={styles.card}>
                <View style={{ flexDirection: "row" }}>
                  <View style={[styles.ndot, { backgroundColor: n.sentiment === "positive" ? C.green : C.red }]} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ color: C.text, fontSize: 13, lineHeight: 19 }}>{n.headline}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                      <Text style={{ color: C.sub, fontSize: 11 }}>{n.source} · {n.time}</Text>
                      <View style={[styles.ntag, { marginLeft: 8 }]}><Text style={{ color: C.blue, fontSize: 10, fontFamily: mono.fontFamily }}>{n.tag}</Text></View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === "ai" && (
          <View style={{ padding: 12 }}>
            <View style={styles.seg}>
              <TouchableOpacity style={[styles.segBtn, aiSub === "report" && styles.segActive]} onPress={doReport}>
                <Text style={{ color: aiSub === "report" ? C.green : C.sub, fontSize: 12, fontWeight: "600" }}>🤖 Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segBtn, aiSub === "tips" && styles.segActive]} onPress={doTips}>
                <Text style={{ color: aiSub === "tips" ? C.green : C.sub, fontSize: 12, fontWeight: "600" }}>💡 Tips</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              {aiSub === "report"
                ? loadingReport
                  ? <Text style={{ color: C.green, fontFamily: mono.fontFamily }}>Analysing NSE market data…</Text>
                  : <Text style={{ color: "#c5d2e8", fontSize: 13, lineHeight: 22 }}>{report || "Tap Report to generate."}</Text>
                : loadingTips
                  ? <Text style={{ color: C.green, fontFamily: mono.fontFamily }}>Evaluating NSE positions…</Text>
                  : <Text style={{ color: "#c5d2e8", fontSize: 13, lineHeight: 22 }}>{tips || "Tap Tips to generate."}</Text>}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        {[["markets", "📈"], ["watch", "⭐"], ["portfolio", "💼"], ["news", "📰"], ["ai", "🤖"]].map(([k, icon]) => (
          <TouchableOpacity key={k} style={styles.tabBtn} onPress={() => setTab(k)}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
            <Text style={{ color: tab === k ? C.green : C.sub, fontSize: 10 }}>{k[0].toUpperCase() + k.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showSettings && (
        <View style={styles.overlay}>
          <View style={styles.settingsCard}>
            <Text style={[styles.st, { marginBottom: 12 }]}>⚙ Settings</Text>
            <Text style={styles.lbl}>Discord Webhook URL</Text>
            <TextInput style={styles.input} placeholder="https://discord.com/api/webhooks/..." placeholderTextColor={C.muted} value={webhookUrl} onChangeText={setWebhookUrl} autoCapitalize="none" />
            <Text style={styles.lbl}>Anthropic API Key</Text>
            <TextInput style={styles.input} placeholder="sk-..." placeholderTextColor={C.muted} value={apiKey} onChangeText={setApiKey} autoCapitalize="none" secureTextEntry />
            <Text style={styles.lbl}>Alert Threshold (%)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={String(threshold)} onChangeText={v => setThreshold(parseFloat(v) || 2.5)} />
            <Text style={styles.lbl}>Trading Backend URL</Text>
            <TextInput style={styles.input} placeholder="http://192.168.x.x:8080" placeholderTextColor={C.muted} value={backendUrl} onChangeText={setBackendUrl} autoCapitalize="none" />
            <Text style={styles.lbl}>Backend Token</Text>
            <TextInput style={styles.input} placeholder="SERVER_TOKEN" placeholderTextColor={C.muted} value={serverToken} onChangeText={setServerToken} autoCapitalize="none" secureTextEntry />
            <Text style={{ fontSize: 11, color: backendStatus === "error" ? C.red : backendStatus === "off" ? C.sub : realMoney ? C.red : C.green, marginTop: 8 }}>
              {backendStatus === "off" ? "● Not connected" : backendStatus === "error" ? "● Connection error" : realMoney ? "● LIVE real-money" : "● Paper connected"}
            </Text>
            <TouchableOpacity style={styles.greenBtn} onPress={() => setShowSettings(false)}>
              <Text style={{ color: "#000", fontWeight: "700" }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {tradeSym && (
        <View style={styles.overlay}>
          <View style={styles.settingsCard}>
            <Text style={[styles.st, { marginBottom: 10 }]}>Trade {tradeSym}</Text>
            {realMoney && <Text style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>⚠ Live real-money order to your funded Alpaca account.</Text>}
            <View style={styles.seg}>
              <TouchableOpacity style={[styles.segBtn, tradeSide === "buy" && styles.segActive]} onPress={() => setTradeSide("buy")}><Text style={{ color: tradeSide === "buy" ? C.green : C.sub, fontSize: 12, fontWeight: "600" }}>Buy</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.segBtn, tradeSide === "sell" && styles.segActive]} onPress={() => setTradeSide("sell")}><Text style={{ color: tradeSide === "sell" ? C.red : C.sub, fontSize: 12, fontWeight: "600" }}>Sell</Text></TouchableOpacity>
            </View>
            <View style={styles.seg}>
              <TouchableOpacity style={[styles.segBtn, tradeType === "market" && styles.segActive]} onPress={() => setTradeType("market")}><Text style={{ color: tradeType === "market" ? C.green : C.sub, fontSize: 12, fontWeight: "600" }}>Market</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.segBtn, tradeType === "limit" && styles.segActive]} onPress={() => setTradeType("limit")}><Text style={{ color: tradeType === "limit" ? C.green : C.sub, fontSize: 12, fontWeight: "600" }}>Limit</Text></TouchableOpacity>
            </View>
            <Text style={styles.lbl}>Quantity (shares)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="10" placeholderTextColor={C.muted} value={tradeQty} onChangeText={setTradeQty} autoCapitalize="none" />
            {tradeType === "limit" && (
              <>
                <Text style={styles.lbl}>Limit Price (USD)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" placeholderTextColor={C.muted} value={tradeLimit} onChangeText={setTradeLimit} autoCapitalize="none" />
              </>
            )}
            <TouchableOpacity style={[styles.greenBtn, { backgroundColor: tradeSide === "buy" ? C.green : C.red }]} onPress={submitTrade}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Submit {tradeSide === "buy" ? "Buy" : "Sell"} Order</Text>
            </TouchableOpacity>
            {tradeMsg && <Text style={{ color: tradeMsg.startsWith("✅") ? C.green : C.red, fontSize: 12, marginTop: 8 }}>{tradeMsg}</Text>}
            <TouchableOpacity onPress={() => setTradeSym(null)} style={{ alignItems: "center", marginTop: 6 }}>
              <Text style={{ color: C.sub, fontSize: 12 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.s1, borderBottomWidth: 1, borderBottomColor: C.border },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(22,199,132,.1)", borderRadius: 14, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(22,199,132,.3)" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  gearBtn: { marginLeft: 10, padding: 4 },
  clock: { color: C.sub, fontSize: 11, fontFamily: mono.fontFamily, marginBottom: 8 },
  seg: { flexDirection: "row", gap: 8, marginBottom: 10 },
  segBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border },
  segActive: { borderColor: C.green, backgroundColor: "rgba(22,199,132,.08)" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(28,43,66,.5)" },
  sym: { fontSize: 14, fontWeight: "500", fontFamily: mono.fontFamily },
  mkt: { fontSize: 9, fontFamily: mono.fontFamily },
  miniBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  card: { backgroundColor: C.s2, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 10 },
  pt: { fontSize: 10, fontWeight: "600", letterSpacing: 2, color: C.sub, marginBottom: 8 },
  detSym: { fontSize: 19, fontWeight: "500", fontFamily: mono.fontFamily },
  detPr: { fontSize: 24, fontWeight: "700", fontFamily: mono.fontFamily, marginTop: 8 },
  sg: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  sb: { backgroundColor: C.s1, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 6, width: (SCREEN_W - 48) / 2 - 4 },
  sv: { fontSize: 12, fontWeight: "500", fontFamily: mono.fontFamily, marginTop: 2 },
  outlineBtn: { marginTop: 8, borderWidth: 1, borderColor: C.border2, borderRadius: 7, paddingVertical: 7, alignItems: "center" },
  closeBtn: { alignItems: "center", marginTop: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  al: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 4, borderRadius: 4, marginBottom: 3, borderLeftWidth: 2 },
  st: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 10 },
  pfSum: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pfc: { flex: 1, backgroundColor: C.s1, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10 },
  pfL: { fontSize: 9, color: C.sub, letterSpacing: 1 },
  pfV: { fontSize: 15, fontWeight: "700", fontFamily: mono.fontFamily, marginTop: 3 },
  pfr: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.s1, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, marginBottom: 6 },
  nchip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: C.border2, marginRight: 6 },
  nchipActive: { borderColor: C.green, backgroundColor: "rgba(22,199,132,.12)" },
  ndot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  ntag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, backgroundColor: "rgba(74,144,255,.1)", borderWidth: 1, borderColor: "rgba(74,144,255,.2)" },
  tabBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", backgroundColor: C.s1, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 8, paddingBottom: Platform.OS === "ios" ? 18 : 8 },
  tabBtn: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  settingsCard: { width: "100%", backgroundColor: C.s2, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16 },
  lbl: { color: C.sub, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: C.s1, borderWidth: 1, borderColor: C.border2, borderRadius: 7, padding: 10, color: C.text, fontSize: 12, fontFamily: mono.fontFamily },
  greenBtn: { marginTop: 16, backgroundColor: C.green, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
});
