import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/notifications/vapid-public-key`, {
    headers: { "x-drift-session": getSessionId() },
  });
  if (!res.ok) throw new Error("Failed to get VAPID key");
  const data = await res.json();
  return data.key;
}

function getSessionId(): string {
  return localStorage.getItem("drift_session_id") || "";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type NotificationSettings = {
  subscribed: boolean;
  reminderTime: string | null;
  timezone: string;
};

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission);
    }
    fetchSettings();
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications/settings`, {
        headers: { "x-drift-session": getSessionId() },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      setSettings({ subscribed: false, reminderTime: null, timezone: "UTC" });
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribe = useCallback(async (reminderTime: string): Promise<boolean> => {
    try {
      if (!("serviceWorker" in navigator)) return false;

      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const vapidKey = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      let pushSub = await reg.pushManager.getSubscription();
      if (!pushSub) {
        pushSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      }

      const subJson = pushSub.toJSON();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch(`${API_BASE}/api/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-drift-session": getSessionId(),
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          reminderTime,
          timezone,
        }),
      });

      if (!res.ok) return false;
      await fetchSettings();
      return true;
    } catch (err) {
      console.error("Subscribe error:", err);
      return false;
    }
  }, [fetchSettings]);

  const updateTime = useCallback(async (reminderTime: string): Promise<boolean> => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`${API_BASE}/api/notifications/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-drift-session": getSessionId(),
        },
        body: JSON.stringify({ reminderTime, timezone }),
      });
      if (!res.ok) return false;
      await fetchSettings();
      return true;
    } catch {
      return false;
    }
  }, [fetchSettings]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      const res = await fetch(`${API_BASE}/api/notifications/unsubscribe`, {
        method: "DELETE",
        headers: { "x-drift-session": getSessionId() },
      });
      if (!res.ok) return false;
      await fetchSettings();
      return true;
    } catch {
      return false;
    }
  }, [fetchSettings]);

  return { settings, loading, permission, supported, subscribe, updateTime, unsubscribe, refetch: fetchSettings };
}
