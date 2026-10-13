import assert from "node:assert/strict";
// @deno-types="npm:@types/web-push@3.6.4"
import webpush from "npm:web-push@3.6.7";
import { sendWebPushMessages } from "./push-delivery.ts";

Deno.test("legacy untrusted subscriptions never reach the network", async () => {
  const original = webpush.sendNotification;
  let calls = 0;
  webpush.sendNotification = async () => {
    calls++;
    throw new Error("Network must not be called");
  };
  try {
    const result = await sendWebPushMessages([
      {
        id: "private",
        endpoint: "https://127.0.0.1/internal",
        p256dh: "",
        auth: "",
      },
      {
        id: "external",
        endpoint: "https://attacker.invalid/collect",
        p256dh: "",
        auth: "",
      },
    ], { title: "test", body: "test", tag: "test", data: {} });
    assert.equal(calls, 0);
    assert.deepEqual(result, {
      sent: 0,
      staleIds: ["private", "external"],
      failures: [],
    });
  } finally {
    webpush.sendNotification = original;
  }
});

Deno.test("push errors do not expose subscription endpoints or key material", async () => {
  const original = webpush.sendNotification;
  const names = [
    "WEB_PUSH_VAPID_SUBJECT",
    "WEB_PUSH_VAPID_PUBLIC_KEY",
    "WEB_PUSH_VAPID_PRIVATE_KEY",
  ];
  const previous = names.map((name) => Deno.env.get(name));
  for (const name of names) Deno.env.set(name, "test-placeholder");
  let calls = 0;
  webpush.sendNotification = async () => {
    calls++;
    throw new Error("sensitive endpoint and subscription key values");
  };
  try {
    const result = await sendWebPushMessages([
      {
        id: "allowed",
        endpoint: "https://fcm.googleapis.com/fcm/send/test",
        p256dh: "",
        auth: "",
      },
    ], { title: "test", body: "test", tag: "test", data: {} });
    assert.equal(calls, 1);
    assert.deepEqual(result.failures, ["web-push-delivery:network"]);
  } finally {
    webpush.sendNotification = original;
    names.forEach((name, index) => {
      const value = previous[index];
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    });
  }
});
