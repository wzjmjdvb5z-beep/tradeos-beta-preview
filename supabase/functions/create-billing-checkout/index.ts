import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_API_KEY") || "";
const BASE_PRICE = "price_1UFow62KmboZvErUIlzYg0Bc";
const SEAT_PRICE = "price_1UFowC2KmboZvErUSSnF9uxx";
const APP_URL = "https://veystead.com/app/";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

function looksUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") || "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "unauthorised" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const companyId = body.company_id;
  const action = body.action === "status" ? "status" : "checkout";
  if (!looksUuid(companyId)) return json({ error: "invalid_company" }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: membership, error: memberError } = await db.from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .maybeSingle();
  if (memberError) return json({ error: "membership_lookup_failed" }, 500);
  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) return json({ error: "forbidden" }, 403);
  if (action === "status") return json({ ready: Boolean(STRIPE_SECRET_KEY) });
  if (!STRIPE_SECRET_KEY) return json({ error: "billing_not_configured" }, 503);

  const [{ data: members, error: countError }, { data: billing, error: billingError }] = await Promise.all([
    db.from("company_members").select("user_id").eq("company_id", companyId).eq("active", true),
    db.from("company_billing").select("status,trial_ends_at,stripe_customer_id,stripe_subscription_id").eq("company_id", companyId).maybeSingle(),
  ]);
  if (countError || billingError) return json({ error: "billing_lookup_failed" }, 500);
  if (billing?.stripe_subscription_id && ["trialing", "active", "past_due"].includes(billing.status)) {
    return json({ error: "subscription_already_exists" }, 409);
  }

  const activeUsers = Math.max(1, new Set((members || []).map((row) => row.user_id)).size);
  const additionalUsers = Math.max(0, activeUsers - 1);
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("success_url", `${APP_URL}?billing=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${APP_URL}?billing=cancelled`);
  form.set("client_reference_id", companyId);
  form.set("line_items[0][price]", BASE_PRICE);
  form.set("line_items[0][quantity]", "1");
  if (additionalUsers > 0) {
    form.set("line_items[1][price]", SEAT_PRICE);
    form.set("line_items[1][quantity]", String(additionalUsers));
  }
  const trialEnd = billing?.trial_ends_at ? new Date(billing.trial_ends_at).getTime() : 0;
  if (trialEnd > Date.now() + 48 * 60 * 60 * 1000) {
    form.set("subscription_data[trial_end]", String(Math.floor(trialEnd / 1000)));
  }
  form.set("subscription_data[metadata][company_id]", companyId);
  form.set("subscription_data[metadata][active_users_at_checkout]", String(activeUsers));
  form.set("metadata[company_id]", companyId);
  form.set("metadata[active_users_at_checkout]", String(activeUsers));
  if (billing?.stripe_customer_id) form.set("customer", billing.stripe_customer_id);
  else if (authData.user.email) form.set("customer_email", authData.user.email);

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
      "Idempotency-Key": `veystead-checkout-${companyId}-${activeUsers}`,
    },
    body: form,
  });
  const session = await stripeResponse.json();
  if (!stripeResponse.ok || !session?.url) {
    console.error("Stripe checkout error", stripeResponse.status, session?.error?.type || "unknown");
    return json({ error: "checkout_creation_failed" }, 502);
  }
  return json({ url: session.url, active_users: activeUsers, additional_users: additionalUsers });
});
