import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.110.0";
import {
  type ExpoPushMessage,
  sendExpoPushMessages,
  sendWebPushMessages,
  type WebPushSubscription,
} from "../_shared/push-delivery.ts";
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

  let admin: SupabaseClient<any> | null = null;
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

    admin = createClient<any>(getSupabaseUrl(), getSupabaseAdminKey(), {
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

    const [
      { data: tokens, error: tokensError },
      { data: webSubscriptions, error: webSubscriptionsError },
    ] = await Promise.all([
      admin
        .from("device_tokens")
        .select("expo_push_token")
        .eq("user_id", user.id),
      admin
        .from("web_push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", user.id),
    ]);
    if (tokensError) throw tokensError;
    if (webSubscriptionsError) throw webSubscriptionsError;

    const title = "Rondapp · prueba";
    const body =
      "¡Las notificaciones funcionan! Te avisaremos cuando alguien abra una ronda.";
    const messages: ExpoPushMessage[] = (tokens ?? []).map((token) => ({
      to: token.expo_push_token,
      sound: "default",
      title,
      body,
      data: { type: "notification_test" },
    }));
    const subscriptions = (webSubscriptions ?? []) as WebPushSubscription[];
    const [tickets, webDelivery] = await Promise.all([
      sendExpoPushMessages(messages),
      sendWebPushMessages(subscriptions, {
        title,
        body,
        tag: `notification-test-${user.id}`,
        data: { type: "notification_test", url: "/home" },
      }),
    ]);

    if (webDelivery.staleIds.length > 0) {
      const { error: staleDeleteError } = await admin
        .from("web_push_subscriptions")
        .delete()
        .in("id", webDelivery.staleIds);
      if (staleDeleteError) {
        console.warn(
          "Unable to remove stale web push subscriptions",
          staleDeleteError.message,
        );
      }
    }
    if (webDelivery.failures.length > 0) {
      console.warn(
        "Some test web push deliveries failed",
        webDelivery.failures,
      );
    }

    return Response.json(
      {
        sent: messages.length + webDelivery.sent,
        expoSent: messages.length,
        webSent: webDelivery.sent,
        tickets,
        webFailures: webDelivery.failures.length,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: errorMessage(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
