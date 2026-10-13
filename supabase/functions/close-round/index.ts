import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.0";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "../_shared/supabase-env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        global: { headers: { Authorization: authorization } },
      },
    );

    const { roundId } = await req.json();
    if (!roundId || typeof roundId !== "string") {
      return Response.json({ error: "roundId is required" }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase.rpc("close_round", {
      p_round_id: roundId,
    });
    if (error) {
      return Response.json({ error: error.message }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    return Response.json({ data }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
