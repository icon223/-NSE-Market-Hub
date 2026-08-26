// Thin client for the NSE Market Hub trading backend (server/). The apps never
// talk to Alpaca directly — they call this backend with a shared token.

function headers(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function apiGet(path, backendUrl, token) {
  const r = await fetch(`${backendUrl}${path}`, { headers: headers(token) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function apiPost(path, body, backendUrl, token) {
  const r = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function apiDelete(path, backendUrl, token) {
  const r = await fetch(`${backendUrl}${path}`, { method: "DELETE", headers: headers(token) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const getMode = (b, t) => apiGet("/api/mode", b, t);
export const getAccount = (b, t) => apiGet("/api/account", b, t);
export const getPositions = (b, t) => apiGet("/api/positions", b, t);
export const getOrders = (b, t) => apiGet("/api/orders", b, t);
export const placeOrder = (body, b, t) => apiPost("/api/orders", body, b, t);
export const cancelOrder = (id, b, t) => apiDelete(`/api/orders/${id}`, b, t);
export const getQuote = (sym, b, t) => apiGet(`/api/quote/${sym}`, b, t);
export const getBars = (sym, b, t) => apiGet(`/api/bars/${sym}`, b, t);
