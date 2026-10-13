import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.110.0";
import {
  getSupabaseAdminKey,
  getSupabaseUrl,
} from "../_shared/supabase-env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StorageRemover = {
  storage: {
    from(bucket: string): {
      remove(paths: string[]): Promise<{ error: unknown }>;
    };
  };
};

type DeletionPreparation = {
  own_paths: string[] | null;
  removed_group_paths: string[] | null;
};

async function removeMomentFiles(admin: StorageRemover, paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  for (let index = 0; index < uniquePaths.length; index += 100) {
    const batch = uniquePaths.slice(index, index + 100);
    const { error } = await admin.storage.from("moments").remove(batch);
    if (error) throw error;
  }
}

async function keepOnlyUnreferencedPaths(
  admin: SupabaseClient<any>,
  paths: string[],
) {
  const candidates = [...new Set(paths.filter(Boolean))];
  const referenced = new Set<string>();
  for (let index = 0; index < candidates.length; index += 100) {
    const batch = candidates.slice(index, index + 100);
    const { data, error } = await admin
      .from("moments")
      .select("image_path")
      .in("image_path", batch);
    if (error) throw error;
    for (const moment of data ?? []) referenced.add(moment.image_path);
  }
  return candidates.filter((path) => !referenced.has(path));
}

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

    const admin = createClient<any>(getSupabaseUrl(), getSupabaseAdminKey(), {
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

    // This RPC is read-only: ownership changes happen in the profile BEFORE
    // DELETE trigger, in the same transaction as the GoTrue user deletion.
    const { data: preparationRows, error: preparationError } = await admin.rpc(
      "prepare_account_deletion",
      { p_user_id: user.id },
    );
    if (preparationError) throw preparationError;
    const preparation = (preparationRows?.[0] ?? {}) as Partial<
      DeletionPreparation
    >;
    const pathsToRemove = [
      ...(preparation.own_paths ?? []),
      ...(preparation.removed_group_paths ?? []),
    ];
    const uniquePaths = [...new Set(pathsToRemove.filter(Boolean))];

    if (uniquePaths.length > 0) {
      const { error: queueError } = await admin.from("storage_cleanup_queue")
        .upsert(
          uniquePaths.map((imagePath) => ({
            image_path: imagePath,
            source: "account_deletion",
            source_id: user.id,
            status: "pending",
            last_error: null,
          })),
          { onConflict: "image_path" },
        );
      if (queueError) throw queueError;
    }

    // Deleting the GoTrue user also deletes its auth sessions. Do not sign out
    // first: a failed delete must leave the account and its sessions untouched.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      if (uniquePaths.length > 0) {
        await admin
          .from("storage_cleanup_queue")
          .delete()
          .eq("source_id", user.id)
          .in("image_path", uniquePaths);
      }
      return Response.json({ error: deleteError.message }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    // DB rows are gone before files are removed, so cleanup can never delete a
    // path still referenced by a surviving member's moment.
    try {
      const unreferencedPaths = await keepOnlyUnreferencedPaths(
        admin,
        uniquePaths,
      );
      const referencedPaths = uniquePaths.filter((path) =>
        !unreferencedPaths.includes(path)
      );
      if (referencedPaths.length > 0) {
        const { error: referencedQueueError } = await admin
          .from("storage_cleanup_queue")
          .delete()
          .in("image_path", referencedPaths);
        if (referencedQueueError) throw referencedQueueError;
      }
      if (unreferencedPaths.length > 0) {
        const { error: attemptError } = await admin
          .from("storage_cleanup_queue")
          .update({ attempt_count: 1, status: "pending", last_error: null })
          .in("image_path", unreferencedPaths);
        if (attemptError) throw attemptError;
      }
      await removeMomentFiles(admin, unreferencedPaths);
      if (unreferencedPaths.length > 0) {
        const { error: completedQueueError } = await admin
          .from("storage_cleanup_queue")
          .delete()
          .in("image_path", unreferencedPaths);
        if (completedQueueError) throw completedQueueError;
      }
    } catch (cleanupError) {
      if (uniquePaths.length > 0) {
        await admin
          .from("storage_cleanup_queue")
          .update({
            status: "failed",
            last_error: errorMessage(cleanupError).slice(0, 1000),
          })
          .in("image_path", uniquePaths);
      }
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
