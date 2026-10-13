import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { env } from "@/lib/env";
import { requireSupabase } from "@/lib/supabase";

export function configureNotifications() {
  if (Platform.OS === "web") return;
  import("expo-notifications")
    .then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    })
    .catch(() => undefined);
}

const ANDROID_NOTIFICATION_CHANNEL_ID = "default";
const DEVICE_TOKEN_TIMEOUT_MS = 12_000;
let deviceTokenQueue: Promise<unknown> = Promise.resolve();
let deviceTokenEpoch = 0;
let deviceTokenUserId: string | null = null;
let deviceTokenRegistrationEnabled = false;

function withDeviceTokenTimeout<T>(operation: PromiseLike<T>, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} ha agotado el tiempo de espera.`)),
      DEVICE_TOKEN_TIMEOUT_MS,
    );
  });
  return Promise.race([Promise.resolve(operation), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function enqueueDeviceTokenOperation<T>(operation: () => Promise<T>) {
  const result = deviceTokenQueue.then(operation, operation);
  deviceTokenQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function deviceTokenRpcError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function callDeviceTokenRpc<T>(input: {
  functionName: "register_device_token" | "unregister_device_token";
  body: Record<string, string | null>;
  accessToken: string;
  label: string;
}) {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Supabase no está configurado.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEVICE_TOKEN_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${env.supabaseUrl}/rest/v1/rpc/${input.functionName}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          apikey: env.supabasePublishableKey,
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.body),
        signal: controller.signal,
      },
    );
    const responseText = await response.text();
    let payload: unknown = null;
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = responseText;
      }
    }

    if (!response.ok) {
      throw new Error(
        deviceTokenRpcError(payload, `${input.label} ha fallado.`),
      );
    }
    return payload as T;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${input.label} ha agotado el tiempo de espera.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function resumeDeviceTokenRegistration(userId: string) {
  if (deviceTokenRegistrationEnabled && deviceTokenUserId === userId) return;
  deviceTokenEpoch += 1;
  deviceTokenUserId = userId;
  deviceTokenRegistrationEnabled = true;
}

export function suspendDeviceTokenRegistration() {
  deviceTokenEpoch += 1;
  deviceTokenUserId = null;
  deviceTokenRegistrationEnabled = false;
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") return;
  const Notifications = await import("expo-notifications");

  await Notifications.setNotificationChannelAsync(
    ANDROID_NOTIFICATION_CHANNEL_ID,
    {
      name: "Rondas",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFB45C",
    },
  );
}

async function getCurrentExpoPushToken(options: { requestPermission: boolean }) {
  if (!Device.isDevice) {
    return null;
  }

  const Notifications = await import("expo-notifications");

  if (options.requestPermission) {
    await ensureAndroidNotificationChannel();
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (finalStatus !== "granted" && options.requestPermission) {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync(
    env.easProjectId ? { projectId: env.easProjectId } : undefined,
  );
  return tokenResult.data;
}

function getBuildNumber() {
  if (Platform.OS === "ios") {
    return Constants.expoConfig?.ios?.buildNumber ?? null;
  }

  if (Platform.OS === "android") {
    const versionCode = Constants.expoConfig?.android?.versionCode;
    return typeof versionCode === "number" ? String(versionCode) : null;
  }

  return null;
}

export async function registerDeviceToken(options: { requestPermission?: boolean } = {}) {
  if (Platform.OS === "web") return null;

  const requestEpoch = deviceTokenEpoch;
  const requestUserId = deviceTokenUserId;
  return enqueueDeviceTokenOperation(async () => {
    if (
      !requestUserId ||
      !deviceTokenRegistrationEnabled ||
      requestEpoch !== deviceTokenEpoch
    ) {
      return null;
    }

    const token = await withDeviceTokenTimeout(
      getCurrentExpoPushToken({
        requestPermission: options.requestPermission !== false,
      }),
      "El registro de notificaciones",
    );
    if (
      !token ||
      !deviceTokenRegistrationEnabled ||
      requestEpoch !== deviceTokenEpoch
    ) {
      return null;
    }

    const supabase = requireSupabase();
    const { data: sessionData, error: sessionError } = await withDeviceTokenTimeout(
      supabase.auth.getSession(),
      "La sesión para notificaciones",
    );
    if (sessionError) throw sessionError;
    const activeSession = sessionData.session;
    if (
      !activeSession?.access_token ||
      activeSession.user.id !== requestUserId ||
      !deviceTokenRegistrationEnabled ||
      requestEpoch !== deviceTokenEpoch
    ) {
      return null;
    }

    const platform = Platform.OS === "ios" || Platform.OS === "android"
      ? Platform.OS
      : "unknown";
    const data = await callDeviceTokenRpc<string | null>({
      functionName: "register_device_token",
      body: {
        p_expo_push_token: token,
        p_platform: platform,
        p_device_name: Device.deviceName ?? null,
        p_app_version: Constants.expoConfig?.version ?? null,
        p_build_number: getBuildNumber(),
      },
      accessToken: activeSession.access_token,
      label: "El registro de notificaciones",
    });

    if (!data) {
      throw new Error("No hemos podido vincular las notificaciones a este dispositivo.");
    }

    if (!deviceTokenRegistrationEnabled || requestEpoch !== deviceTokenEpoch) {
      await callDeviceTokenRpc<boolean>({
        functionName: "unregister_device_token",
        body: { p_expo_push_token: token },
        accessToken: activeSession.access_token,
        label: "La desvinculación de notificaciones",
      });
      return null;
    }

    return token;
  });
}

export async function unregisterDeviceToken(accessToken?: string) {
  suspendDeviceTokenRegistration();
  if (Platform.OS === "web") {
    const { unregisterWebPushSubscription } = await import(
      "@/features/notifications/web-push"
    );
    return unregisterWebPushSubscription(accessToken);
  }

  return enqueueDeviceTokenOperation(async () => {
    let tokenAccessToken = accessToken;
    if (!tokenAccessToken) {
      const supabase = requireSupabase();
      const { data, error } = await withDeviceTokenTimeout(
        supabase.auth.getSession(),
        "La sesión para notificaciones",
      );
      if (error) throw error;
      tokenAccessToken = data.session?.access_token;
    }
    if (!tokenAccessToken) return false;

    const token = await withDeviceTokenTimeout(
      getCurrentExpoPushToken({ requestPermission: false }),
      "La desvinculación de notificaciones",
    );
    if (!token) return false;

    const data = await callDeviceTokenRpc<boolean>({
      functionName: "unregister_device_token",
      body: { p_expo_push_token: token },
      accessToken: tokenAccessToken,
      label: "La desvinculación de notificaciones",
    });
    return data === true;
  });
}
