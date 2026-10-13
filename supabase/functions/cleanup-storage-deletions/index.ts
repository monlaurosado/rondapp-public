import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.0";
import {
  getSupabaseAdminKeys,
  getSupabaseLegacyServiceRoleKey,
  getSupabaseSecretKeys,
  getSupabaseUrl,
} from "../_shared/supabase-env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

async function timingSafeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function hasServiceRole(
  req: Request,
  secretKeys: string[],
  legacyServiceRoleKey: string | null,
) {
  const apiKey = req.headers.get("apikey") ?? "";
  if (apiKey) {
    for (const secretKey of secretKeys) {
      if (await timingSafeEqual(apiKey, secretKey)) {
        return true;
      }
    }
  }

  const authorization = req.headers.get("Authorization") ?? "";
  return legacyServiceRoleKey
    ? timingSafeEqual(authorization, `Bearer ${legacyServiceRoleKey}`)
    : false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "method not allowed" }, {
      status: 405,
      headers: corsHeaders,
    });
  }

  const adminKeys = getSupabaseAdminKeys();
  const adminKey = adminKeys[0];
  const secretKeys = getSupabaseSecretKeys();
  const legacyServiceRoleKey = getSupabaseLegacyServiceRoleKey();
  if (!(await hasServiceRole(req, secretKeys, legacyServiceRoleKey))) {
    return Response.json({ error: "service role required" }, {
      status: 403,
      headers: corsHeaders,
    });
  }

  const admin = createClient<any>(getSupabaseUrl(), adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: queued, error: queueError } = await admin
      .from("storage_cleanup_queue")
      .select("image_path,attempt_count")
      .order("created_at")
      .limit(500);
    if (queueError) throw queueError;

    const paths = (queued ?? []).map((row) => row.image_path);
    if (paths.length === 0) {
      return Response.json({ processed: 0, pending: 0 }, {
        headers: corsHeaders,
      });
    }

    const { data: referencedRows, error: referencedError } = await admin
      .from("moments")
      .select("image_path")
      .in("image_path", paths);
    if (referencedError) throw referencedError;
    const referenced = new Set(
      (referencedRows ?? []).map((row) => row.image_path),
    );
    const safePaths = paths.filter((path) => !referenced.has(path));
    const stillReferenced = paths.filter((path) => referenced.has(path));

    if (stillReferenced.length > 0) {
      const { error } = await admin
        .from("storage_cleanup_queue")
        .delete()
        .in("image_path", stillReferenced);
      if (error) throw error;
    }

    let processed = stillReferenced.length;
    for (let index = 0; index < safePaths.length; index += 100) {
      const batch = safePaths.slice(index, index + 100);
      const attemptByPath = new Map(
        (queued ?? []).map((row) => [row.image_path, row.attempt_count]),
      );
      const maxAttempt = Math.max(...batch.map((path) =>
        attemptByPath.get(path) ?? 0
      )) + 1;
      const { error: attemptError } = await admin
        .from("storage_cleanup_queue")
        .update({
          status: "pending",
          attempt_count: maxAttempt,
          last_error: null,
        })
        .in("image_path", batch);
      if (attemptError) throw attemptError;

      const { error: storageError } = await admin.storage.from("moments")
        .remove(batch);
      if (storageError) {
        await admin
          .from("storage_cleanup_queue")
          .update({
            status: "failed",
            last_error: errorMessage(storageError).slice(0, 1000),
          })
          .in("image_path", batch);
        continue;
      }

      const { error: receiptError } = await admin
        .from("moment_storage_deletions")
        .update({ completed_at: new Date().toISOString() })
        .in("image_path", batch);
      if (receiptError) throw receiptError;

      const { error: completedError } = await admin
        .from("storage_cleanup_queue")
        .delete()
        .in("image_path", batch);
      if (completedError) throw completedError;
      processed += batch.length;
    }

    const { count, error: countError } = await admin
      .from("storage_cleanup_queue")
      .select("image_path", { count: "exact", head: true });
    if (countError) throw countError;
    return Response.json({ processed, pending: count ?? 0 }, {
      headers: corsHeaders,
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
