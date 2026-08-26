# NSE Market Hub

A real-time market dashboard for the **Nairobi Securities Exchange (NSE)** and related
East-African / global markets, shipped as **two native apps from one shared codebase**:

- **Desktop** — Tauri v2 + Vite + React (Windows / macOS / Linux)
- **Mobile** — React Native + Expo (iOS / Android)

Both apps render the same live market simulation, watchlists, portfolios, news, and
AI-generated reports — driven by a single shared engine in `core/`.

> ⚠️ By default the market data is **simulated** (random-walk price generation) so the
> UI, alerts and persistence can be developed without a provider. The **Global** (US)
> symbols can be switched to **real, live data and real trading** by connecting the
> optional `server/` backend (Alpaca). See [Trading (Real Orders)](#trading-real-orders).

---

## Features

| Feature | Desktop (Tauri) | Mobile (Expo) |
| --- | --- | --- |
| Live ticking prices (2s) for 4 markets | ✅ | ✅ |
| NSE / NEROB / East-Africa / Global tabs | ✅ | ✅ |
| Sparklines + area detail chart | ✅ | ✅ (react-native-svg) |
| Watchlist (⭐) | ✅ | ✅ |
| Portfolio tracker (P&L) | ✅ | ✅ |
| News feed (filterable) | ✅ | ✅ |
| Threshold alerts (±%) | ✅ | ✅ |
| **Native notifications** on breach | ✅ (Tauri plugin) | ✅ (expo-notifications) |
| **Discord webhook** on breach | ✅ | ✅ |
| **System tray** with live top-mover % | ✅ | — |
| Persistent settings/portfolio | ✅ (localStorage) | ✅ (async-storage) |
| AI Market Report + Tips (Claude) | ✅ | ✅ |
| **Real trading** (Alpaca: buy/sell, positions, P&L) | ✅ | ✅ |
| **Live US quotes** (Global tab, via Alpaca) | ✅ | ✅ |

---

## Architecture

```
core/                 ← framework-agnostic, shared by BOTH apps
  data.js             market & news definitions (NSE, NEROB, EA, Global, NSE_NEWS, CURRENCY)
  format.js           rand, fmt, fmtPct, fmtVol, fmtTime, fmtDate
  engine.js           genHistory, initStock, tickPool  (the simulation)
   api.js              fetchAI (Claude) + sendDiscord   (transport injected)
   backend.js          thin client for the trading backend (server/)
   useMarket.js        React hook: runs the 2s loop, owns state, fires onAlert
   index.js            barrel export

server/               ← Node/Express trading backend (holds Alpaca secrets)
   src/alpaca.js      Alpaca REST helpers (account, positions, orders, quote, bars)
   src/index.js       Express app: auth middleware + /api/* routes
   .env.example        ALPACA_KEY / ALPACA_SECRET / ALPACA_PAPER / SERVER_TOKEN / PORT

desktop/              ← Tauri v2 + Vite + React
  src/App.jsx         full dashboard UI (reuses core)
  src/lib/tauri.js    notify(), emitTray(), getTauriFetch()
  src-tauri/          Rust shell: window, tray, capabilities, http/notification plugins

mobile/               ← Expo + React Native
  App.jsx             RN UI, bottom tabs, settings
  components/         Sparkline.jsx, AreaChart.jsx  (react-native-svg)
  store.js            usePersistentState (async-storage)
  notifications.js    expo-notifications wrapper
  theme.js            colors
```

The only app-specific code is the **rendering layer** and the **native integrations**.
All market logic lives in `core/` and is imported via relative path
(`../../core/index.js` from desktop, `../core/index.js` from mobile).

---

## How the engine works

1. **Initialization** — `initStock()` seeds each company with a random history
   (`genHistory`) and computes its opening price, change, high/low and volume.
2. **Live loop** — `useMarket()` starts a `setInterval` every **2000 ms**. On each tick
   it calls `tickPool(prevStocks, threshold)` for every market:
   - nudges each price by a small random delta (`±0.7%`),
   - recomputes `changePct`, high/low, appends to `history` (keeps last 50 points),
   - if `|changePct| ≥ threshold` **and** it wasn't already alerted, it produces an alert.
3. **Alerts** — each alert is handed to the app's `onAlert` callback, which:
   - sends a **Discord webhook** (if a URL is configured),
   - fires a **native notification**,
   - appends the event to the in-app alerts list.
4. **Selected stock** — the detail panel re-syncs to the live object every tick so the
   area chart animates in real time.

Threshold, watchlist, portfolio, webhook URL and API key are all **persisted**, so they
survive restarts.

---

## Trading (Real Orders)

The dashboard can place **real buy/sell orders** for the **Global (US) symbols**
(AAPL, TSLA, NVDA, MSFT, JPM, XOM) through [Alpaca](https://alpaca.markets). NSE/NEROB/EA
stay simulated (Alpaca has no Kenyan listings).

**Security model:** the Alpaca API key/secret live **only** on the backend (`server/`).
The desktop/mobile apps never see them — they call the backend with a single shared
`SERVER_TOKEN` (`Authorization: Bearer <token>`). The backend is a thin, CORS-enabled
Express proxy (helmet-hardened) that forwards authenticated requests to Alpaca.

### 1. Start the backend
```bash
cd server
cp .env.example .env          # then fill in real values
npm install
npm run dev                   # listens on PORT (default 8080)
```
`.env`:
| Var | Meaning |
| --- | --- |
| `ALPACA_KEY` / `ALPACA_SECRET` | Alpaca API key + secret (paper keys by default) |
| `ALPACA_PAPER` | `true` = paper (safe). Set `false` **only** for live real-money trading |
| `SERVER_TOKEN` | shared secret the apps send as a bearer token |
| `PORT` | backend port (default `8080`) |

Routes: `GET /api/mode`, `/api/account`, `/api/positions`, `/api/orders`,
`POST /api/orders`, `DELETE /api/orders/:id`, `GET /api/quote/:symbol`,
`GET /api/bars/:symbol`.

### 2. Connect an app
Open **Settings (⚙)** in the desktop or mobile app and enter:
- **Trading Backend URL** — e.g. `http://localhost:8080` (use your machine's LAN IP on
  the phone, e.g. `http://192.168.x.x:8080`)
- **Backend Token** — the same `SERVER_TOKEN`

The header badge turns **PAPER** (green) when connected in paper mode, or **LIVE $**
(red) for real-money, with a red warning banner. The Global tab then streams real quotes
and the Portfolio tab shows your live Alpaca account, positions and P&L.

### 3. Place an order
Tap **💱 Trade** on any Global symbol (or Buy/Sell on a position). Choose **Buy/Sell**,
**Market** or **Limit**, enter quantity (and limit price), then submit. Orders go to
Alpaca in the selected mode (paper or live). Order types supported: **Market** and
**Limit** (day).

> ⚠️ **Real money is real.** Set `ALPACA_PAPER=true` and use paper keys while testing.
> Only flip `ALPACA_PAPER=false` with a funded account and after you understand the risk.
> Free Alpaca data may be delayed ~15 min; order execution is live either way.

---

## Desktop (Tauri v2)

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) + the
  [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
  (WebView2 on Windows, Xcode CLT on macOS, `webkit2gtk` on Linux).
- Node.js ≥ 18.

### Run
```bash
cd desktop
npm install
npm run tauri dev      # launches the native window + Vite dev server
```

### Build distributables
```bash
npm run tauri build    # outputs:
                       #   Windows → .msi / .exe
                       #   macOS   → .app / .dmg  (signing needed on a Mac)
                       #   Linux   → .deb / .AppImage
```

### Native integrations
- **Notifications** — `src/lib/tauri.js → notify()` uses
  `@tauri-apps/plugin-notification`. Permission is granted in
  `src-tauri/capabilities/default.json`.
- **System tray** — `src-tauri/src/lib.rs` builds a tray icon; every 5s the UI calls
  `emitTray()` which invokes the Rust `update_tray` command to show the top NSE mover's %.
- **CORS-free HTTP** — `core/api.js` accepts a `fetchImpl`. On desktop, `getTauriFetch()`
  injects `@tauri-apps/plugin-http`'s `fetch`, which is exempt from browser CORS. The
  allowed scopes (`api.anthropic.com`, `discord.com`) are declared in
  `src-tauri/tauri.conf.json → plugins.http.scope`.
- **Persistence** — `localStorage` (works inside the webview and survives restarts).

---

## Mobile (Expo)

### Prerequisites
- Node.js ≥ 18
- Expo CLI (`npm i -g expo-cli`) — or use `npx expo`
- For device builds: Android Studio (Android) or Xcode (iOS)

### Run in the Expo Go app / emulator
```bash
cd mobile
npm install
npx expo start          # scan the QR code with Expo Go, or press a / i
```

### Build a native installer
```bash
npx expo prebuild       # generates native android/ & ios/ projects
npx expo run:android    # builds & installs on a connected device/emulator
# or use EAS for cloud builds:
eas build --platform android    # → .apk / .aab
eas build --platform ios        # → .ipa
```

### Native integrations
- **Charts** — `react-native-svg` (`components/Sparkline.jsx`, `components/AreaChart.jsx`).
- **Persistence** — `@react-native-async-storage/async-storage` via `store.js →
  usePersistentState`.
- **Notifications** — `expo-notifications` (`notifications.js → notify()`).
- **UI** — built from `View / Text / ScrollView / TouchableOpacity` + `StyleSheet`,
  with a bottom tab bar (Markets / Watch / Portfolio / News / AI).

---

## Configuration (both apps)

Open **Settings** (⚙ on desktop header / mobile top-right):

| Setting | Purpose |
| --- | --- |
| **Discord Webhook URL** | Stock alerts are POSTed here as rich embeds. |
| **Anthropic API Key** | Enables the AI Market Report & Tips. Get one at console.anthropic.com. |
| **Alert Threshold (%)** | e.g. `2.5` → notify when a stock moves ±2.5%. |

All three are persisted locally and never leave the device except to call Discord/Anthropic.

---

## AI Reports & CORS

- **Desktop** uses Tauri's HTTP plugin, so the Claude API call bypasses CORS and works
  out of the box once you supply an API key.
- **Mobile** uses the standard `fetch`, which **may be blocked by CORS** when calling
  `api.anthropic.com` directly from a device. If reports fail on mobile, point
  `fetchAI` at a tiny proxy (the `proxyUrl` option is already wired in `core/api.js`):
  ```js
  fetchAI(prompt, apiKey, { proxyUrl: "https://your-proxy.example.com/anthropic" });
  ```
  The proxy should forward the request server-side with your key.

If no API key is set, the report/tips screens show a friendly "add your API key" message
instead of crashing.

---

## Project layout (quick)

```
market viwer/
├─ core/            shared engine (data, format, engine, api, useMarket)
├─ desktop/         Tauri + Vite + React  → npm run tauri dev / build
└─ mobile/          Expo + React Native  → npx expo start / eas build
```

---

## Known limitations / next steps

- Market data is **simulated** — wire a real feed (e.g. NSE API / a broker) into
  `core/engine.js` (`tickPool`) to go live.
- Desktop Rust shell was not compiled in the original build environment (policy-limited);
  build it with `npm run tauri build` on a machine with Rust.
- Mobile background price updates need a fetch task (e.g. `expo-background-fetch`) if you
  want alerts while the app is closed.
- No authentication / multi-user support.
```
