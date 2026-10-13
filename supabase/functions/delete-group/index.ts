import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.110.0";
import {
  getSupabaseAdminKey,
  getSupabasePublishableKey,
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

async function markCleanupFailed(
  admin: SupabaseClient<any>,
  groupId: string,
  imagePaths: string[],
  error: unknown,
) {
  for (let index = 0; index < imagePaths.length; index += 100) {
    const batch = imagePaths.slice(index, index + 100);
    await admin
      .from("storage_cleanup_queue")
      .update({
        status: "failed",
        last_error: errorMessage(error).slice(0, 1000),
      })
      .eq("source", "group_deletion")
      .eq("source_id", groupId)
      .in("image_path", batch);
  }
}

async function removeGroupImages(
  admin: SupabaseClient<any>,
  groupId: string,
  imagePaths: string[],
) {
  for (let index = 0; index < imagePaths.length; index += 100) {
    const batch = imagePaths.slice(index, index + 100);
    const { error: attemptError } = await admin
      .from("storage_cleanup_queue")
      .update({ attempt_count: 1, status: "pending", last_error: null })
      .eq("source", "group_deletion")
      .eq("source_id", groupId)
      .in("image_path", batch);
    if (attemptError) throw attemptError;

    const { error: storageError } = await admin.storage.from("moments").remove(
      batch,
    );
    if (storageError) throw storageError;

    const { error: queueError } = await admin
      .from("storage_cleanup_queue")
      .delete()
      .eq("source", "group_deletion")
      .eq("source_id", groupId)
      .in("image_path", batch);
    if (queueError) throw queueError;
  }
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

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const jwt = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    if (!jwt) {
      return Response.json({ error: "not authenticated" }, {
        status: 401,
        headers: corsHeaders,
      });
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "invalid JSON body" }, {
        status: 400,
        headers: corsHeaders,
      });
    }
    const groupId = (payload as { groupId?: unknown })?.groupId;
    if (typeof groupId !== "string" || !groupId) {
      return Response.json({ error: "groupId is required" }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const url = getSupabaseUrl();
    const admin = createClient<any>(url, getSupabaseAdminKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(jwt);
    if (userError || !user) {
      return Response.json({ error: "not authenticated" }, {
        status: 401,
        headers: corsHeaders,
      });
    }

    const scoped = createClient<any>(url, getSupabasePublishableKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data, error: deleteError } = await scoped.rpc(
      "delete_owned_group",
      { p_group_id: groupId },
    );
    if (deleteError) {
      const status = deleteError.message.includes("only group owner")
        ? 403
        : deleteError.message.includes("not found")
        ? 404
        : 400;
      return Response.json({ error: deleteError.message }, {
        status,
        headers: corsHeaders,
      });
    }

    const imagePaths = Array.isArray(data)
      ? data.filter((path): path is string =>
        typeof path === "string" && path.length > 0
      )
      : [];

    try {
      await removeGroupImages(admin, groupId, imagePaths);
    } catch (cleanupError) {
      await markCleanupFailed(admin, groupId, imagePaths, cleanupError);
      return Response.json(
        {
          deleted: true,
          storageCleanupPending: true,
          warning: errorMessage(cleanupError),
        },
        { headers: corsHeaders },
      );
    }

    return Response.json(
      { deleted: true, storageCleanupPending: false },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: errorMessage(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
