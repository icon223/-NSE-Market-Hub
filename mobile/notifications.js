import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Fires a local native notification banner (used on threshold breaches).
export async function notify(title, body) {
  try {
    const ok = await ensurePermission();
    if (ok) {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    }
  } catch (e) {
    // notifications unavailable (e.g. emulator without play services) — ignore
  }
}
