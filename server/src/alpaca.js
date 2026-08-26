// Alpaca REST client. All broker secrets live here on the server.
// Docs: https://docs.alpaca.markets/  (Trading API v2 + Market Data API v2)

const TRADING_BASE =
  process.env.ALPACA_PAPER === "false"
    ? "https://api.alpaca.markets"
    : "https://paper-api.alpaca.markets";
const DATA_BASE = "https://data.alpaca.markets";

const KEY = process.env.ALPACA_KEY;
const SECRET = process.env.ALPACA_SECRET;

function authHeaders() {
  return {
    "APCA-API-KEY-ID": KEY || "",
    "APCA-API-SECRET-KEY": SECRET || "",
    "Content-Type": "application/json",
  };
}

async function jget(url) {
  const r = await fetch(url, { headers: authHeaders() });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Alpaca ${r.status}: ${t.slice(0, 300)}`);
  }
  return r.json();
}

export async function getAccount() {
  return jget(`${TRADING_BASE}/v2/account`);
}

export async function getPositions() {
  return jget(`${TRADING_BASE}/v2/positions`);
}

export async function getOrders(status = "all") {
  return jget(`${TRADING_BASE}/v2/orders?status=${status}&limit=100`);
}

export async function placeOrder({ symbol, qty, side, type, limit_price, time_in_force = "day" }) {
  const body = {
    symbol: String(symbol).toUpperCase(),
    qty: String(qty),
    side: String(side).toLowerCase(),
    type: String(type).toLowerCase(),
    time_in_force: time_in_force,
  };
  if (body.type === "limit") body.limit_price = String(limit_price);
  const r = await fetch(`${TRADING_BASE}/v2/orders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`order ${r.status}: ${t.slice(0, 400)}`);
  }
  return r.json();
}

export async function cancelOrder(id) {
  const r = await fetch(`${TRADING_BASE}/v2/orders/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return { ok: r.ok, status: r.status };
}

// Latest NBBO quote (mid = (bid+ask)/2). Free tier may be delayed.
export async function getQuote(symbol) {
  const d = await jget(`${DATA_BASE}/v2/stocks/${symbol}/quotes/latest`);
  const q = d.quote || {};
  const bid = q.bp != null ? parseFloat(q.bp) : null;
  const ask = q.ap != null ? parseFloat(q.ap) : null;
  const price = ask != null && bid != null ? (ask + bid) / 2 : (ask ?? bid ?? 0);
  return { symbol: d.symbol, price, bid, ask, t: q.t };
}

// Seed/background daily bars (last `limit` closes) for the live chart.
export async function getBars(symbol, limit = 50) {
  const d = await jget(
    `${DATA_BASE}/v2/stocks/${symbol}/bars?timeframe=1D&limit=${limit}`
  );
  return (d.bars || []).map((b) => parseFloat(b.c));
}
