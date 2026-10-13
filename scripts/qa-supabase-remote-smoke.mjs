#!/usr/bin/env node

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const prefix = "QA_RONDAPP_REMOTE";
const runId = Date.now().toString(36).slice(-8);
const password = `Rondapp-${runId}-remote-smoke!`;
const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const storagePaths = [];
const createdUserIds = [];

class ExternalBlockerError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExternalBlockerError";
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const adminKey = process.env.SUPABASE_REMOTE_ADMIN_KEY;
  if (!url || !key || !adminKey) {
    throw new Error(
      "Faltan EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY o SUPABASE_REMOTE_ADMIN_KEY para QA remoto.",
    );
  }
  return { url, key, adminKey };
}

function client(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function unwrap(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function step(label, fn) {
  const result = await fn();
  console.log(`PASS ${label}`);
  return result;
}

async function expectFailure(label, fn) {
  try {
    const result = await fn();
    if (result?.error) {
      console.log(`PASS ${label}`);
      return result.error;
    }
  } catch (error) {
    console.log(`PASS ${label}`);
    return error;
  }
  throw new Error(`${label}: se esperaba un rechazo de RLS/validacion.`);
}

async function signUpQaUser({ admin, url, key, label }) {
  const email = `rondappqa${runId}${label}@gmail.com`;
  const username = `qar${runId}${label}`.slice(0, 20);
  const displayName = `QA Remote ${label}`;
  const supabase = client(url, key);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    throw new Error(`admin create user ${label}: ${createError?.message ?? "sin user"}`);
  }
  createdUserIds.push(created.user.id);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new ExternalBlockerError(
      `Supabase remoto no devolvio sesion para ${label}: ${error?.message ?? "sin sesion"}.`,
    );
  }

  unwrap(
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        username,
        display_name: displayName,
        is_age_confirmed: true,
        accepted_terms_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    ),
    `profile ${label}`,
  );

  return {
    id: data.user.id,
    email,
    username,
    displayName,
    client: supabase,
  };
}

function momentPath({ groupId, roundId, userId, momentId }) {
  return `${groupId}/${roundId}/${userId}/${momentId}.jpg`;
}

async function uploadMomentImage(supabase, path) {
  storagePaths.push(path);
  unwrap(
    await supabase.storage.from("moments").upload(path, jpegBytes, {
      contentType: "image/jpeg",
      upsert: false,
    }),
    `upload ${path}`,
  );
}

async function bestEffortCleanup(users, admin) {
  const failures = [];

  if (storagePaths.length > 0) {
    const { error } = await admin.storage.from("moments").remove(storagePaths);
    if (error) failures.push(`storage cleanup: ${error.message}`);
  }

  for (const user of [...users].reverse()) {
    const { error } = await user.client.functions.invoke("delete-account", { body: {} });
    if (error) {
      failures.push(`delete-account ${user.email}: ${error.message}`);
      await user.client.auth.signOut();
    }
  }

  for (const userId of [...createdUserIds].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) {
      failures.push(`admin delete user ${userId}: ${error.message}`);
    }
  }

  return failures;
}

async function main() {
  const { url, key, adminKey } = readConfig();
  const admin = client(url, adminKey);

  const users = [];
  let failure = null;

  try {
    const owner = await step("signup owner remoto con sesion", async () => {
      const user = await signUpQaUser({ admin, url, key, label: "owner" });
      users.push(user);
      return user;
    });
    const member = await step("signup member remoto con sesion", async () => {
      const user = await signUpQaUser({ admin, url, key, label: "member" });
      users.push(user);
      return user;
    });
    const outsider = await step("signup outsider remoto con sesion", async () => {
      const user = await signUpQaUser({ admin, url, key, label: "outside" });
      users.push(user);
      return user;
    });

    const groupId = await step("owner crea grupo privado por RPC remoto", async () => {
      const data = unwrap(
        await owner.client.rpc("create_group", { p_name: `${prefix}_${runId}` }),
        "create_group",
      );
      assert(typeof data === "string", "create_group no devolvio uuid.");
      return data;
    });

    const group = await step("owner lee invite code remoto", async () => {
      const data = unwrap(
        await owner.client.from("social_groups").select("*").eq("id", groupId).single(),
        "select group",
      );
      assert(data.invite_code, "El grupo no tiene invite_code.");
      return data;
    });

    await step("outsider no lee grupo privado remoto", async () => {
      const data = unwrap(
        await outsider.client.from("social_groups").select("id").eq("id", groupId),
        "outsider group select",
      );
      assert(data.length === 0, "Outsider pudo leer el grupo.");
    });

    await step("member entra por invite code remoto", async () => {
      const data = unwrap(
        await member.client.rpc("join_group_by_invite", {
          p_invite_code: group.invite_code,
        }),
        "join_group_by_invite",
      );
      assert(data === groupId, "join_group_by_invite devolvio otro grupo.");
    });

    const roundId = randomUUID();
    const ownerMomentId = randomUUID();
    const ownerImagePath = momentPath({
      groupId,
      roundId,
      userId: owner.id,
      momentId: ownerMomentId,
    });

    await step("owner sube imagen remota a Storage privado", () =>
      uploadMomentImage(owner.client, ownerImagePath),
    );

    await step("owner crea ronda + primer momento remoto", async () => {
      const data = unwrap(
        await owner.client.rpc("create_round_with_moment", {
          p_group_id: groupId,
          p_round_id: roundId,
          p_moment_id: ownerMomentId,
          p_image_path: ownerImagePath,
          p_caption: `${prefix} owner`,
          p_drink_type: "prefiero_no_decir",
        }),
        "create_round_with_moment",
      );
      assert(data === roundId, "create_round_with_moment devolvio otra ronda.");
    });

    await step("member lee ronda y momento remoto", async () => {
      const round = unwrap(
        await member.client.from("rounds").select("id").eq("id", roundId).single(),
        "member select round",
      );
      assert(round.id === roundId, "Member no lee la ronda.");
      const moments = unwrap(
        await member.client.from("moments").select("id").eq("round_id", roundId),
        "member select moments",
      );
      assert(moments.length === 1, "Member no lee el momento de owner.");
    });

    await expectFailure("owner no puede votar su propia foto remoto", () =>
      owner.client.rpc("toggle_round_star", { p_moment_id: ownerMomentId }),
    );

    await step("member reacciona remoto", async () => {
      const rows = unwrap(
        await member.client.rpc("toggle_reaction", {
          p_moment_id: ownerMomentId,
          p_type: "fire",
        }),
        "toggle reaction",
      );
      assert(rows[0]?.action === "added", "La reaccion remota no se anadio.");
    });

    await step("member da estrella remota", async () => {
      const rows = unwrap(
        await member.client.rpc("toggle_round_star", {
          p_moment_id: ownerMomentId,
        }),
        "toggle round star",
      );
      assert(rows[0]?.action === "added", "La estrella remota no se anadio.");
    });

    await expectFailure("DML directo de interacciones esta revocado remoto", () =>
      member.client.from("reactions").insert({
        user_id: member.id,
        moment_id: ownerMomentId,
        round_id: roundId,
        group_id: groupId,
        type: "wow",
      }),
    );

    await step("ranking remoto devuelve actividad social", async () => {
      const rows = unwrap(
        await member.client.rpc("get_weekly_leaderboard", {
          p_group_id: groupId,
          p_week_start: new Date().toISOString().slice(0, 10),
        }),
        "get_weekly_leaderboard",
      );
      assert(Array.isArray(rows), "Ranking no devolvio array.");
    });

    await step("member reporta momento remoto", async () => {
      const reportId = unwrap(
        await member.client.rpc("report_moment", {
          p_moment_id: ownerMomentId,
          p_reason: "offensive",
          p_details: `${prefix} smoke`,
        }),
        "report_moment",
      );
      assert(typeof reportId === "string", "Reporte remoto no devolvio uuid.");
    });

    await step("stats privadas remotas usan auth.uid", async () => {
      const ownerStats = unwrap(
        await owner.client.rpc("get_my_profile_stats"),
        "get_my_profile_stats owner",
      );
      const outsiderStats = unwrap(
        await outsider.client.rpc("get_my_profile_stats"),
        "get_my_profile_stats outsider",
      );
      assert(ownerStats.total_moments === 1, "Stats remotas owner no cuentan su momento.");
      assert(outsiderStats.total_moments === 0, "Outsider obtuvo stats de otro usuario.");
    });

    await step("member bloquea owner remoto", async () => {
      unwrap(
        await member.client.from("blocks").insert({
          blocker_id: member.id,
          blocked_id: owner.id,
        }),
        "insert block",
      );
    });

    console.log("PASS Supabase remote smoke completado.");
  } catch (error) {
    failure = error;
  } finally {
    const cleanupFailures = await bestEffortCleanup(users, admin);
    if (cleanupFailures.length > 0) {
      console.error(`FAIL cleanup remoto: ${cleanupFailures.join(" | ")}`);
      failure ??= new Error("El smoke termino, pero no pudo limpiar todos los datos QA.");
    } else if (users.length > 0) {
      console.log("PASS cuentas y datos QA eliminados.");
    }
  }

  if (failure) {
    throw failure;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : error;
  if (error instanceof ExternalBlockerError) {
    console.error(`BLOCKED_EXTERNAL: ${message}`);
    process.exitCode = 2;
  } else {
    console.error(message);
    process.exitCode = 1;
  }
});
