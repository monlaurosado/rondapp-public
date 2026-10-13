// @deno-types="npm:@types/web-push@3.6.4"
import webpush from "npm:web-push@3.6.7";
import { isAllowedWebPushEndpoint } from "./web-push-endpoint.ts";

export type ExpoPushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: Record<string, string>;
};

export type WebPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type WebPushPayload = {
  title: string;
  body: string;
  tag: string;
  data: Record<string, string>;
};

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function statusCode(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return null;
  }
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : null;
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  const tickets: unknown[] = [];
  for (let index = 0; index < messages.length; index += 100) {
    const batch = messages.slice(index, index + 100);
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    const responseText = await expoResponse.text();
    let responsePayload: unknown = responseText;
    try {
      responsePayload = JSON.parse(responseText);
    } catch {
      // Keep the raw body for diagnostics when Expo does not return JSON.
    }
    if (!expoResponse.ok) {
      throw new Error(
        `Expo push failed (${expoResponse.status})`,
      );
    }
    tickets.push(responsePayload);
  }
  return tickets;
}

export async function sendWebPushMessages(
  subscriptions: WebPushSubscription[],
  payload: WebPushPayload,
) {
  const staleIds = subscriptions
    .filter((subscription) => !isAllowedWebPushEndpoint(subscription.endpoint))
    .map((subscription) => subscription.id);
  const allowedSubscriptions = subscriptions.filter((subscription) =>
    isAllowedWebPushEndpoint(subscription.endpoint)
  );
  if (allowedSubscriptions.length === 0) {
    return { sent: 0, staleIds, failures: [] as string[] };
  }

  const vapidDetails = {
    subject: requireEnv("WEB_PUSH_VAPID_SUBJECT"),
    publicKey: requireEnv("WEB_PUSH_VAPID_PUBLIC_KEY"),
    privateKey: requireEnv("WEB_PUSH_VAPID_PRIVATE_KEY"),
  };
  const failures: string[] = [];
  let sent = 0;

  // Filtering also protects subscriptions created before the database policy.
  for (const subscription of allowedSubscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
        {
          vapidDetails,
          TTL: 60 * 60,
          urgency: "high",
          timeout: 10_000,
        },
      );
      sent += 1;
    } catch (error) {
      const code = statusCode(error);
      if (code === 404 || code === 410) {
        staleIds.push(subscription.id);
      } else {
        failures.push(
          `web-push-delivery:${code ?? "network"}`,
        );
      }
    }
  }

  return { sent, staleIds, failures };
}
