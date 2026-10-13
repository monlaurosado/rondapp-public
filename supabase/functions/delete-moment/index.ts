import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.0";
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
    const momentId = (payload as { momentId?: unknown })?.momentId;
    if (typeof momentId !== "string" || !momentId) {
      return Response.json({ error: "momentId is required" }, {
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
    const { data: imagePath, error: deleteError } = await scoped.rpc(
      "delete_moment",
      {
        p_moment_id: momentId,
      },
    );
    if (deleteError) {
      const status = deleteError.message.includes("not allowed")
        ? 403
        : deleteError.message.includes("not found")
        ? 404
        : 400;
      return Response.json({ error: deleteError.message }, {
        status,
        headers: corsHeaders,
      });
    }

    const { error: storageError } = await admin.storage.from("moments").remove([
      imagePath,
    ]);
    if (storageError) {
      await admin
        .from("storage_cleanup_queue")
        .update({
          status: "failed",
          last_error: errorMessage(storageError).slice(0, 1000),
        })
        .eq("image_path", imagePath);
      return Response.json(
        {
          deleted: true,
          storageCleanupPending: true,
          warning: errorMessage(storageError),
        },
        { headers: corsHeaders },
      );
    }

    const { error: receiptError } = await admin
      .from("moment_storage_deletions")
      .update({ completed_at: new Date().toISOString() })
      .eq("moment_id", momentId)
      .eq("image_path", imagePath);
    if (receiptError) {
      return Response.json(
        {
          deleted: true,
          storageCleanupPending: true,
          warning: receiptError.message,
        },
        { headers: corsHeaders },
      );
    }

    const { error: durableQueueError } = await admin
      .from("storage_cleanup_queue")
      .delete()
      .eq("image_path", imagePath)
      .eq("source_id", momentId);
    if (durableQueueError) {
      return Response.json(
        {
          deleted: true,
          storageCleanupPending: true,
          warning: durableQueueError.message,
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
