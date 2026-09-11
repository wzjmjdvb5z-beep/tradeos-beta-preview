# TradeOS beta preview security

## Scope

This public repository is a workflow prototype only. It must not be used with real customer, employee, payroll, financial or commercially sensitive data.

## Current controls

The GitHub Pages build is intentionally local-only. Authentication and cloud sync are disabled. The page CSP blocks network connections (`connect-src 'none'`) and JavaScript is loaded only from this origin.

On load, the beta removes the legacy `tradeos_beta_session` key from both `localStorage` and `sessionStorage`.

## Historical issue

An earlier beta implementation authenticated directly against Supabase from browser JavaScript and persisted the returned auth session in `localStorage`. This made bearer tokens readable by JavaScript running in the same origin and was unsuitable for production TradeOS.

That login path has been removed from the public beta.

## Production requirements

Production TradeOS must not reintroduce browser-persisted bearer tokens. The production authentication layer should use:

- server-managed sessions
- `HttpOnly`, `Secure`, appropriately scoped `SameSite` cookies
- CSRF protection for state-changing cookie-authenticated requests
- strict Content Security Policy and security headers
- company-scoped authorization on every sensitive operation
- Supabase/Postgres RLS as defence in depth, not as a substitute for application authorization
- separate owner/admin/manager/employee permissions
- no service-role key or privileged secret in browser bundles
- auditable approval actions for timesheets, invoices and payments
- secure session rotation, expiry and revocation

Security changes should be reviewed before the production app accepts real user data.
