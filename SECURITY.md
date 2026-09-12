# TradeOS security

## Current launch architecture

TradeOS is a static web client backed by Supabase Auth, Postgres, Storage and RPC functions. The browser bundle contains a Supabase **publishable** key only. Publishable keys are intended for public clients and are not privileged secrets.

Never commit or expose a Supabase secret key, `service_role` key, database password, private API credential or payment-provider secret in this repository or any browser-delivered asset.

## Data isolation and authorisation

- Row Level Security is enabled on every application table exposed through the `public` schema.
- Company data is scoped through active company membership and role-aware policies.
- Sensitive write workflows use database functions that validate the signed-in user, company membership and the target record before changing data.
- Owner/admin/manager/employee permissions are separated for management workflows.
- Job-note storage is restricted to authenticated members of the company encoded in the storage path.
- Direct browser access to `beta_leads` is explicitly denied.

RLS is defence in depth. New tables, views, functions and storage buckets must be reviewed before they are exposed to the Data API.

## Public quote and invoice links

Customer quote and invoice pages intentionally work without a TradeOS account. They use random UUID share tokens that must match the target document, must not be revoked and must not be expired.

Only the current public RPCs should be executable by anonymous users:

- `get_public_quote_v2`
- `respond_public_quote_v2`
- `get_public_invoice`

Legacy public quote RPCs have been removed from anonymous/authenticated execution grants.

Treat a customer share URL as a bearer link: anyone who receives the complete URL can view that document until the token expires or is revoked. Do not place share URLs in analytics, logs or third-party referrers.

## Billing security

Stripe Checkout is handled by Stripe rather than by browser-side secret keys. Subscription state is synchronized through the `stripe-billing-webhook` Edge Function.

- Stripe webhook signatures are verified before an event is processed.
- Webhook signing secrets are stored encrypted in Supabase Vault and are retrieved only through a service-role-only database function.
- Webhook signing secrets must never be hard-coded in Edge Function source or committed to this repository.
- Sandbox events are prevented from overwriting a company that has already been mapped to live Stripe billing.

## Browser security

The app and customer-document entry pages apply a restrictive Content Security Policy and `no-referrer` policy. Third-party JavaScript is limited to a pinned Supabase client version from jsDelivr; application scripts are served from the same origin.

For production hosting, `_headers` adds HSTS, clickjacking protection, MIME-sniffing protection, CSP headers and no-cache rules for the HTML entrypoints. GitHub Pages does not apply the `_headers` file, so production should use a host that supports these response headers.

Supabase Auth sessions for the SPA are persisted by the Supabase browser client. This means preventing script injection is a critical control. Do not add arbitrary third-party scripts, inline JavaScript, unescaped user HTML or dynamic code execution to authenticated pages.

## Authentication

- Email confirmation and password recovery use Supabase Auth.
- Password-reset pages must use the same approved application origin.
- Leaked-password protection should be enabled in Supabase Auth before unrestricted public signup is opened.
- Any future privileged server or Edge Function must validate authentication and authorisation independently and must never trust client-supplied role/company claims.

## Release checklist

Before each production release:

1. Run Supabase security and performance advisors.
2. Confirm all new public tables have RLS and intentional policies.
3. Review all new `SECURITY DEFINER` functions for explicit authentication/authorisation, a safe fixed `search_path`, and least-privilege execute grants.
4. Confirm no secret/service-role/payment signing keys are present in browser assets, repository history or Edge Function source.
5. Test sign-up/sign-in/reset, company separation, roles, quotes, jobs, timesheets, invoices, public share links, billing state changes and sign-out on mobile and desktop.
6. Verify CSP/security headers on the production hostname.
7. Revoke any share link, account or credential used only for testing.

Security-sensitive changes should be made on a branch, reviewed, verified, and then merged to the production branch.
