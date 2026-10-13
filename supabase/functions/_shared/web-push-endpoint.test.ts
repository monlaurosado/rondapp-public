import assert from "node:assert/strict";
import { isAllowedWebPushEndpoint } from "./web-push-endpoint.ts";

export const validPushEndpoints = [
  "https://fcm.googleapis.com/fcm/send/qa-aB_12:opaque",
  "https://updates.push.services.mozilla.com/wpush/v2/qa-aB_12",
  "https://web.push.apple.com/qa-aB_12",
  "https://wns2-db5p.notify.windows.com/w/?token=qa%2Ftoken",
];

export const invalidPushEndpoints = [
  "https://127.0.0.1/internal-endpoint",
  "https://169.254.169.254/metadata",
  "https://[::1]/internal-endpoint",
  "https://attacker.invalid/collect",
  "https://fcm.googleapis.com.attacker.invalid/fcm/send/token",
  "https://fcm.googleapis.com@attacker.invalid/collect",
  "https://attacker.invalid@fcm.googleapis.com/fcm/send/token",
  "https://fcm.googleapis.com:8443/fcm/send/token",
  "https://fcm.googleapis.com./fcm/send/token",
  "https://fcm.googleapis.com\\@attacker.invalid/collect",
  "http://fcm.googleapis.com/fcm/send/token",
  "https://fcm.googleapis.com/fcm/send/token#fragment",
  "https://fcm.googleapis.com/fcm/send/token\n",
  "https://fcm.googleapis.com/with space",
  "https://fcm.googleapis.com/" + "a".repeat(4096),
  "https://push.apple.com/qa-token",
  "https://evilpush.apple.com/qa-token",
  "https://evilnotify.windows.com/qa-token",
];

Deno.test("browser push endpoints are accepted", () => {
  for (const endpoint of validPushEndpoints) {
    assert.equal(isAllowedWebPushEndpoint(endpoint), true, endpoint);
  }
});

Deno.test("untrusted and ambiguous destinations are rejected", () => {
  for (const endpoint of [...invalidPushEndpoints, null, undefined, 1]) {
    assert.equal(isAllowedWebPushEndpoint(endpoint), false);
  }
});
