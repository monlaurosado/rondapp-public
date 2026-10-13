import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.110.0";
import {
  getSupabaseAdminKey,
  getSupabaseUrl,
} from "../_shared/supabase-env.ts";
import {
  type ExpoPushMessage,
  sendExpoPushMessages,
  sendWebPushMessages,
  type WebPushSubscription,
} from "../_shared/push-delivery.ts";

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
  let claimedRoundId: string | null = null;
  let deliveryStarted = false;

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

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "invalid JSON body" }, {
        status: 400,
        headers: corsHeaders,
      });
    }
    const roundId = (payload as { roundId?: unknown })?.roundId;
    if (typeof roundId !== "string" || !roundId) {
      return Response.json({ error: "roundId is required" }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: round, error: roundError } = await admin
      .from("rounds")
      .select(
        "id,group_id,created_by,group:social_groups(name),creator:profiles(display_name,username)",
      )
      .eq("id", roundId)
      .maybeSingle();
    if (roundError) throw roundError;
    if (!round) {
      return Response.json({ error: "round not found" }, {
        status: 404,
        headers: corsHeaders,
      });
    }
    if (round.created_by !== user.id) {
      return Response.json(
        { error: "only the round creator can notify members" },
        { status: 403, headers: corsHeaders },
      );
    }

    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_round_notification_dispatch",
      { p_round_id: round.id },
    );
    if (claimError) throw claimError;
    if (!claimed) {
      return Response.json(
        { sent: 0, duplicate: true, tickets: [] },
        { headers: corsHeaders },
      );
    }
    claimedRoundId = round.id;

    const [
      { data: memberships, error: membershipsError },
      { data: blocks, error: blocksError },
    ] = await Promise.all([
      admin
        .from("group_members")
        .select("user_id")
        .eq("group_id", round.group_id)
        .eq("muted", false)
        .neq("user_id", user.id),
      admin
        .from("blocks")
        .select("blocker_id,blocked_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    ]);
    if (membershipsError) throw membershipsError;
    if (blocksError) throw blocksError;

    const blockedIds = new Set<string>();
    for (const block of blocks ?? []) {
      blockedIds.add(
        block.blocker_id === user.id ? block.blocked_id : block.blocker_id,
      );
    }
    const recipientIds = (memberships ?? [])
      .map((membership) => membership.user_id)
      .filter((recipientId) => !blockedIds.has(recipientId));

    const [
      { data: tokens, error: tokensError },
      { data: webSubscriptions, error: webSubscriptionsError },
    ] = recipientIds.length === 0
      ? [
        { data: [], error: null },
        { data: [], error: null },
      ]
      : await Promise.all([
        admin
          .from("device_tokens")
          .select("expo_push_token,user_id")
          .in("user_id", recipientIds),
        admin
          .from("web_push_subscriptions")
          .select("id,endpoint,p256dh,auth,user_id")
          .in("user_id", recipientIds),
      ]);
    if (tokensError) throw tokensError;
    if (webSubscriptionsError) throw webSubscriptionsError;

    const creator = Array.isArray(round.creator)
      ? round.creator[0]
      : round.creator;
    const group = Array.isArray(round.group) ? round.group[0] : round.group;
    const creatorName = creator?.display_name ?? creator?.username ?? "Alguien";
    const groupName = group?.name ?? "tu grupo";
    const title = `${creatorName} ha lanzado una ronda`;
    const body = `Entra en "${groupName}" y sube tu momento.`;
    const notificationData = {
      type: "round_created",
      roundId: round.id,
      groupId: round.group_id,
    };
    const messages: ExpoPushMessage[] = (tokens ?? []).map((token) => ({
      to: token.expo_push_token,
      sound: "default",
      title,
      body,
      data: notificationData,
    }));

    const webPushSubscriptions =
      (webSubscriptions ?? []) as WebPushSubscription[];
    if (messages.length > 0 || webPushSubscriptions.length > 0) {
      const { error: markerError } = await admin
        .from("round_notification_dispatches")
        .update({ last_error: "delivery_started" })
        .eq("round_id", round.id)
        .eq("status", "processing");
      if (markerError) throw markerError;
      deliveryStarted = true;
    }

    const [tickets, webDelivery] = await Promise.all([
      sendExpoPushMessages(messages),
      sendWebPushMessages(webPushSubscriptions, {
        title,
        body,
        tag: `round-${round.id}`,
        data: {
          ...notificationData,
          url: `/round/${round.id}`,
        },
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
      console.warn("Some web push deliveries failed", webDelivery.failures);
    }

    const { error: dispatchError } = await admin
      .from("round_notification_dispatches")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("round_id", round.id);
    if (dispatchError) throw dispatchError;

    return Response.json(
      {
        sent: messages.length + webDelivery.sent,
        expoSent: messages.length,
        webSent: webDelivery.sent,
        duplicate: false,
        tickets,
        webFailures: webDelivery.failures.length,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    if (admin && claimedRoundId) {
      const failureKind = deliveryStarted ? "terminal" : "retryable";
      await admin
        .from("round_notification_dispatches")
        .update({
          status: "failed",
          last_error: `${failureKind}:${errorMessage(error)}`.slice(0, 1000),
        })
        .eq("round_id", claimedRoundId);
    }
    return Response.json(
      { error: errorMessage(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
