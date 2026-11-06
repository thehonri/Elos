"use client";
import { sb } from "./supabase";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
export function isIOS() {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
}
export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export type PushResult = "ok" | "denied" | "unsupported" | "needs_install" | "error";

/** Precisa ser chamado num toque do usuário (exigência do iOS). */
export async function enablePush(userId: string): Promise<PushResult> {
  if (isIOS() && !isStandalone()) return "needs_install";
  if (!pushSupported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/serwist/sw.js", { scope: "/" }));
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
    }
    const j = sub.toJSON();
    const { error } = await sb()
      .from("push_subscriptions")
      .upsert({ user_id: userId, endpoint: j.endpoint!, keys: j.keys }, { onConflict: "endpoint" });
    return error ? "error" : "ok";
  } catch {
    return "error";
  }
}

export async function pushStatus(): Promise<"on" | "off" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}
