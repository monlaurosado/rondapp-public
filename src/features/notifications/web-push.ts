import { Platform } from "react-native";

import { env } from "@/lib/env";
import { requireSupabase } from "@/lib/supabase";

export type WebPushPermissionStatus =
  | "loading"
  | "granted"
  | "denied"
  | "undetermined"
  | "unsupported"
  | "install_required";

type TestNotificationResult = {
  sent: number;
  expoSent: number;
  webSent: number;
};

const WEB_PUSH_TIMEOUT_MS = 15_000;
let cachedVapidPublicKey: string | null = null;

function withTimeout<T>(operation: PromiseLike<T>, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} ha agotado el tiempo de espera.`)),
      WEB_PUSH_TIMEOUT_MS,
    );
  });
  return Promise.race([Promise.resolve(operation), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function isIosWeb() {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandaloneWebApp() {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true ||
    iosNavigator.standalone === true;
}

function supportsWebPush() {
  return Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

export function getWebPushPermissionStatus(): WebPushPermissionStatus {
  if (!supportsWebPush()) return "unsupported";
  if (isIosWeb() && !isStandaloneWebApp()) return "install_required";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "undetermined";
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = globalThis.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function arrayBufferToBase64Url(value: ArrayBuffer | null) {
  if (!value) return null;
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sameApplicationServerKey(subscription: PushSubscription, publicKey: string) {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey) return false;
  const expected = base64UrlToUint8Array(publicKey);
  const current = new Uint8Array(currentKey);
  return current.length === expected.length && current.every((byte, index) => byte === expected[index]);
}

async function getVapidPublicKey() {
  if (cachedVapidPublicKey) return cachedVapidPublicKey;

  const supabase = requireSupabase();
  const { data, error } = await withTimeout(
    supabase.functions.invoke("web-push-config"),
    "La configuración de notificaciones",
  );
  if (error) throw error;

  const publicKey = (data as { publicKey?: unknown } | null)?.publicKey;
  if (typeof publicKey !== "string" || publicKey.length < 80) {
    throw new Error("La configuración de notificaciones no es válida.");
  }
  cachedVapidPublicKey = publicKey;
  return publicKey;
}

async function getReadyServiceWorker() {
  if (!supportsWebPush()) {
    throw new Error("Este dispositivo no permite notificaciones web.");
  }
  return withTimeout(
    navigator.serviceWorker.ready,
    "El inicio de las notificaciones",
  );
}

export async function registerWebPushSubscription(options: {
  requestPermission?: boolean;
} = {}) {
  const initialStatus = getWebPushPermissionStatus();
  if (initialStatus === "unsupported") {
    throw new Error("Este navegador no permite notificaciones push.");
  }
  if (initialStatus === "install_required") {
    throw new Error(
      "En iPhone, instala Rondapp en la pantalla de inicio y ábrela desde su icono para activar los avisos.",
    );
  }

  let permission = Notification.permission;
  if (permission === "default" && options.requestPermission) {
    // iOS requires this call to happen directly from the user's tap.
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return null;

  const [registration, publicKey] = await Promise.all([
    getReadyServiceWorker(),
    getVapidPublicKey(),
  ]);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameApplicationServerKey(subscription, publicKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey),
  });

  const p256dh = arrayBufferToBase64Url(subscription.getKey("p256dh"));
  const auth = arrayBufferToBase64Url(subscription.getKey("auth"));
  if (!p256dh || !auth) {
    throw new Error("El dispositivo no ha devuelto una suscripción push válida.");
  }

  const supabase = requireSupabase();
  const { data, error } = await withTimeout(
    supabase.rpc("register_web_push_subscription", {
      p_endpoint: subscription.endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_agent: navigator.userAgent.slice(0, 500),
    }),
    "El registro de notificaciones",
  );
  if (error) throw error;
  if (!data) throw new Error("No hemos podido guardar la suscripción push.");
  return subscription;
}

async function unregisterWebPushRpc(endpoint: string, accessToken?: string) {
  if (accessToken && env.supabaseUrl && env.supabasePublishableKey) {
    const response = await withTimeout(
      fetch(`${env.supabaseUrl}/rest/v1/rpc/unregister_web_push_subscription`, {
        method: "POST",
        headers: {
          apikey: env.supabasePublishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_endpoint: endpoint }),
        keepalive: true,
      }),
      "La desvinculación de notificaciones",
    );
    if (!response.ok) {
      throw new Error(`No hemos podido desvincular las notificaciones (${response.status}).`);
    }
    return;
  }

  const supabase = requireSupabase();
  const { error } = await withTimeout(
    supabase.rpc("unregister_web_push_subscription", { p_endpoint: endpoint }),
    "La desvinculación de notificaciones",
  );
  if (error) throw error;
}

export async function unregisterWebPushSubscription(accessToken?: string) {
  if (!supportsWebPush()) return false;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;

  let remoteError: unknown;
  try {
    await unregisterWebPushRpc(subscription.endpoint, accessToken);
  } catch (error) {
    remoteError = error;
  }
  await subscription.unsubscribe();
  if (remoteError) throw remoteError;
  return true;
}

export async function sendTestPushNotification() {
  const supabase = requireSupabase();
  const { data, error } = await withTimeout(
    supabase.functions.invoke("send-test-notification"),
    "La notificación de prueba",
  );
  if (error) throw error;

  const result = data as Partial<TestNotificationResult> | null;
  if (typeof result?.sent !== "number" || result.sent < 1) {
    throw new Error("No hay ningún dispositivo registrado para recibir la prueba.");
  }
  return result as TestNotificationResult;
}
