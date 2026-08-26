// Cross-platform HTTP helpers.
// `fetchImpl` is injected by the host app so the core stays framework-agnostic:
//   - Desktop (Tauri) passes @tauri-apps/plugin-http fetch (bypasses CORS).
//   - Web / mobile pass the global fetch (mobile should route through a proxy).

const MODEL = "claude-sonnet-4-20250514";

async function resolveFetch(fetchImpl) {
  if (fetchImpl) return fetchImpl;
  if (typeof fetch !== "undefined") return fetch.bind(globalThis);
  return null;
}

export async function fetchAI(prompt, apiKey, opts = {}) {
  const { fetchImpl, proxyUrl } = opts;
  if (!apiKey) {
    return "⚠️ Add your Anthropic API key in Settings to generate AI reports.";
  }
  const f = await resolveFetch(fetchImpl);
  if (!f) return "Network unavailable.";
  try {
    const headers = { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": apiKey };
    const body = JSON.stringify({ model: MODEL, max_tokens: 1000, messages: [{ role: "user", content: prompt }] });
    let res;
    if (proxyUrl) {
      res = await f(proxyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, apiKey }) });
    } else {
      res = await f("https://api.anthropic.com/v1/messages", { method: "POST", headers, body });
    }
    if (!res.ok) return `AI request failed (${res.status}).`;
    const d = await res.json();
    return d.content?.map(b => b.text || "").join("") || "Unable to generate.";
  } catch (e) {
    return "AI request error: " + (e && e.message ? e.message : String(e));
  }
}

export async function sendDiscord(url, stock, reason, fetchImpl) {
  if (!url) return false;
  const up = stock.changePct >= 0;
  const f = await resolveFetch(fetchImpl);
  if (!f) return false;
  try {
    await f(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "NSE Market Hub 🇰🇪",
        embeds: [{
          title: `${up ? "📈" : "📉"} ${stock.ticker} — ${stock.name}`,
          description: `**${reason}**`,
          color: up ? 0x16c784 : 0xea3943,
          fields: [
            { name: "Price", value: `${stock.currency} ${stock.price.toFixed(2)}`, inline: true },
            { name: "Change", value: `${(stock.changePct >= 0 ? "+" : "") + stock.changePct.toFixed(2)}%`, inline: true },
            { name: "Market", value: stock.market, inline: true },
            { name: "Volume", value: stock.volume.toLocaleString(), inline: true },
            { name: "High", value: `${stock.currency} ${stock.high.toFixed(2)}`, inline: true },
            { name: "Low", value: `${stock.currency} ${stock.low.toFixed(2)}`, inline: true },
          ],
          footer: { text: `NSE Market Hub • ${new Date().toLocaleString("en-KE")}` }
        }]
      })
    });
    return true;
  } catch (e) {
    return false;
  }
}
