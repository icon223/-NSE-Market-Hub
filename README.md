# NSE Market Hub

A real-time market dashboard for the **Nairobi Securities Exchange (NSE)** and related
East-African / global markets, shipped as **two native apps from one shared codebase**:

- **Desktop** — Tauri v2 + Vite + React (Windows / macOS / Linux)
- **Mobile** — React Native + Expo (iOS / Android)

Both apps render the same live market simulation, watchlists, portfolios, news, and
AI-generated reports — driven by a single shared engine in `core/`.

> ⚠️ The market data is **simulated** (random-walk price generation). There is no live
> feed wired in yet. Everything you see is produced locally by the engine so the UI,
> alerts, notifications and persistence can be developed and demoed without a data provider.

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

---

## Architecture

```
core/                 ← framework-agnostic, shared by BOTH apps
  data.js             market & news definitions (NSE, NEROB, EA, Global, NSE_NEWS, CURRENCY)
  format.js           rand, fmt, fmtPct, fmtVol, fmtTime, fmtDate
  engine.js           genHistory, initStock, tickPool  (the simulation)
  api.js              fetchAI (Claude) + sendDiscord   (transport injected)
  useMarket.js        React hook: runs the 2s loop, owns state, fires onAlert
  index.js            barrel export

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
