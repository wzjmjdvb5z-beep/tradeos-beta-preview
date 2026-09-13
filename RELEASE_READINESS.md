# Release readiness — 13 September 2026

Status: not yet approved for unrestricted public launch. Continue stabilising existing features. Ben requested a fully ready app, not additional feature expansion.

## Verified

- Employee-role and financial restrictions, schedule visibility and protected job deletion: existing regression suites pass. Ben previously confirmed employee and schedule experience works.
- Quote/invoice database rollback test: created a disposable quote with two £50 units, 20% VAT, 10% discount and an unselected optional extra; net £90, VAT £18, total £108. Invoice and invoice item matched. Repeated invoice creation returned the same ID. Transaction rolled back; no real records remained. This tests RPC business logic with an owner JWT claim in SQL, not a browser session or full RLS audit.
- Commercial regressions: external print trigger and retry, HTML escaping, void invoice status, latest-response-wins refresh and navigation race checks pass.
- Print fix removes inline JavaScript blocked by the inherited app CSP. It retains browser popup printing; installed iOS WKWebView print/PDF behaviour still needs verification.
- GitHub CI now runs the four regression scripts alongside existing syntax and asset checks.
- Previous TestFlight run 34767345231: archive, export, App Store validation and upload steps all succeeded. New code requires a new build. Processing, tester assignment and review status have not been checked in App Store Connect.

## Required before launch

1. Verify a complete real-device journey on Safari and the installed current iOS build: sign-in/password reset, owner quote create/edit and immediate totals/list refresh, customer acceptance, job assignment/scheduling, employee hours, owner approval, invoice create/reopen, print or PDF export, sent/payment status, sign-out. Use disposable records and do not send test invoices to real customers.
2. Confirm invoice output includes the trader's business identity/contact and applicable VAT/payment details. The direct print template now loads the existing manager-only business profile and includes business/contact, registration, bank and terms fields when configured. Actual profile completeness and final output must be checked on a device.
3. Verify account-deletion fulfilment. The current `request_account_deletion` RPC records a seven-day request. A processing/notification workflow has not been verified; queuing a request is not proof of deletion.
4. Complete the security release checks in SECURITY.md, including public-link expiry/revocation, cross-company negative cases and deployment headers. GitHub Pages does not apply `_headers`. The current advisor reports 3 anonymous and 47 authenticated definer-function notices and disabled leaked-password protection; these are review items, not proof of exploits. Do not remove intentional public document access blindly.
5. Verify App Store Connect build processing, tester access, metadata/screenshots/privacy answers and review access. Confirm the final product name against prior clearance work; current code is TradeOS Beta. Do not restart naming from assumptions.
6. Confirm operational ownership for support, deletion requests, backup/restore and incident response. Verify any live subscription workflow separately before charging testers.

Apple submission guidance: https://developer.apple.com/app-store/review/guidelines/
Supabase password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
Definer review guidance: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
Public RPC review guidance: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Next action

Verify publication of release-readiness-1, then verify trader details in invoice output and native print/PDF support. Keep real-device and App Store Connect evidence separate from automated checks. No public launch approval claimed.
