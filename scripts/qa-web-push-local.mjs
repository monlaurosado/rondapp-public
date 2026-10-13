#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

function requireStatusValue(status, name) {
  const match = new RegExp(`^${name}="?([^"\\n]+)"?$`, "m").exec(status);
  if (!match?.[1]) throw new Error(`Falta ${name} en supabase status.`);
  return match[1];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const status = execFileSync("npx", ["supabase", "status", "--output", "env"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const apiUrl = requireStatusValue(status, "API_URL");
const publishableKey = requireStatusValue(status, "PUBLISHABLE_KEY");
const secretKey = requireStatusValue(status, "SECRET_KEY");
const client = createClient(apiUrl, publishableKey);
const admin = createClient(apiUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const suffix = randomUUID();
const email = `web-push-${suffix}@example.com`;
const password = `Qa-${suffix}-A1!`;
let userId = null;
let otherUserId = null;
const otherClient = createClient(apiUrl, publishableKey);

function register(target, endpoint) {
  return target.rpc("register_web_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: "p".repeat(87),
    p_auth: "a".repeat(22),
    p_user_agent: "Rondapp QA",
  });
}

try {
  const { data: authData, error: authError } = await client.auth.signUp({
    email,
    password,
  });
  if (authError) throw authError;
  userId = authData.user?.id ?? null;
  assert(userId && authData.session, "No se creó una sesión QA para Web Push.");

  const endpoint = `https://fcm.googleapis.com/fcm/send/qa-${suffix}`;
  for (const invalidEndpoint of [
    endpoint.replace("https://", "http://"),
    "https://127.0.0.1/internal",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/internal",
    "https://attacker.invalid/collect",
    "https://fcm.googleapis.com.attacker.invalid/path",
    "https://fcm.googleapis.com@attacker.invalid/path",
    "https://fcm.googleapis.com:444/path",
    "https://fcm.googleapis.com/path#fragment",
    "https://fcm.googleapis.com/path\n",
    "https://fcm.googleapis.com/" + "a".repeat(4096),
  ]) {
    const invalid = await register(client, invalidEndpoint);
    assert(invalid.error, "Se aceptó un destino Web Push no permitido.");
  }

  const registered = await client.rpc("register_web_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: "p".repeat(87),
    p_auth: "a".repeat(22),
    p_user_agent: "Rondapp QA",
  });
  if (registered.error) throw registered.error;
  assert(typeof registered.data === "string", "La RPC no devolvió el id de suscripción.");

  const directRead = await client.from("web_push_subscriptions").select("id");
  assert(directRead.error, "Una cuenta autenticada pudo leer suscripciones directamente.");

  const stored = await admin
    .from("web_push_subscriptions")
    .select("id,user_id,endpoint")
    .eq("id", registered.data)
    .single();
  if (stored.error) throw stored.error;
  assert(stored.data.user_id === userId, "La suscripción no pertenece a la cuenta QA.");
  assert(stored.data.endpoint === endpoint, "El endpoint guardado no coincide.");

  const otherAuth = await otherClient.auth.signUp({ email: `other-${email}`, password });
  if (otherAuth.error) throw otherAuth.error;
  otherUserId = otherAuth.data.user?.id ?? null;
  assert(otherUserId && otherAuth.data.session, "No se creó la segunda cuenta QA.");
  assert((await register(otherClient, endpoint)).error, "Otra cuenta pudo apropiarse de una suscripción.");
  const foreignRemoval = await otherClient.rpc("unregister_web_push_subscription", { p_endpoint: endpoint });
  assert(!foreignRemoval.error && foreignRemoval.data === false, "Otra cuenta eliminó una suscripción ajena.");

  const attempts = await Promise.all(Array.from({ length: 15 }, (_, index) => register(client, `${endpoint}-${index}`)));
  assert(attempts.filter((result) => !result.error).length === 9, "El límite de 10 suscripciones falló con registros concurrentes.");
  assert(!(await register(client, endpoint)).error, "No se permite renovar la suscripción existente al alcanzar el límite.");

  const removed = await client.rpc("unregister_web_push_subscription", {
    p_endpoint: endpoint,
  });
  if (removed.error) throw removed.error;
  assert(removed.data === true, "La suscripción Web Push no se eliminó.");

  const removedAgain = await client.rpc("unregister_web_push_subscription", {
    p_endpoint: endpoint,
  });
  if (removedAgain.error) throw removedAgain.error;
  assert(removedAgain.data === false, "La baja Web Push no es idempotente.");

  // These are synthetic subscriptions, never deliver a push to a real provider.
  const cleared = await admin.from("web_push_subscriptions").delete().eq("user_id", userId);
  if (cleared.error) throw cleared.error;

  const emptyTest = await client.functions.invoke("send-test-notification");
  if (emptyTest.error) throw emptyTest.error;
  assert(
    emptyTest.data?.sent === 0 && emptyTest.data?.webSent === 0,
    "La función de prueba no devolvió el resultado vacío esperado.",
  );

  console.log("PASS Web Push RPC QA local");
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (otherUserId) await admin.auth.admin.deleteUser(otherUserId);
}
