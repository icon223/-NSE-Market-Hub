// Tauri-backed native features. These are no-ops (or console warnings) when
// running in a plain browser, so the same code works under `npm run dev`.

let _tauriFetch;
export async function getTauriFetch() {
  if (_tauriFetch !== undefined) return _tauriFetch;
  try {
    const mod = await import("@tauri-apps/plugin-http");
    _tauriFetch = mod.fetch;
  } catch (e) {
    _tauriFetch = null;
  }
  return _tauriFetch || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
}

export async function notify(title, body) {
  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import("@tauri-apps/plugin-notification");
    let granted = await isPermissionGranted();
    if (!granted) {
      const res = await requestPermission();
      granted = res === "granted";
    }
    if (granted) sendNotification({ title, body });
  } catch (e) {
    console.warn("notify unavailable:", e);
  }
}

export async function emitTray(text) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("update_tray", { text });
  } catch (e) {
    // not running under Tauri — ignore
  }
}
