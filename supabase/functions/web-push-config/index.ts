const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "method not allowed" }, {
      status: 405,
      headers: corsHeaders,
    });
  }

  const publicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
  if (!publicKey) {
    return Response.json({ error: "web push is not configured" }, {
      status: 503,
      headers: corsHeaders,
    });
  }

  return Response.json(
    { publicKey },
    {
      headers: {
        ...corsHeaders,
        "Cache-Control": "private, max-age=3600",
      },
    },
  );
});
