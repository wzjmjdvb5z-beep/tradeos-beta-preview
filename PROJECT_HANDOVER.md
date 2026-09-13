# TradeOS project handover

Last updated: 2026-09-13. Read this before continuing; verify the current remote main branch before making changes. Update this file after meaningful work with actual deployment evidence, test results, remaining defects and the next step. Do not treat a proposal as implemented or a successful push as a successful deployment.

## Project and workflow

- Owner: Ben, UK electrician. Building a trade-management app and testing with his partner on a separate phone/account. Keep instructions simple and avoid repeated setup loops.
- Repository: https://github.com/wzjmjdvb5z-beep/tradeos-beta-preview
- Web app: https://wzjmjdvb5z-beep.github.io/tradeos-beta-preview/app/
- Existing Netlify address: https://tradeos-beta-xvt4.netlify.app/app/ returned HTTP 401 during this session; do not send it as a verified public alternative.
- Current code branding is TradeOS. Replacement-name clearance was discussed previously, but this conversation does not establish a final cleared name. Do not rename the product from assumptions.
- GitHub connector authenticated as wzjmjdvb5z-beep and successfully wrote to main. Use the connector if available. HTTPS shell push lacked credentials; browser sign-in failed on the user's phone. Do not repeat that loop or request passwords/tokens in chat.
- Ben explicitly approved publishing these fixes with “Push it live.” Observe applicable current tool permissions for subsequent work.
- Web deployment and Apple/TestFlight release are separate. Pushes triggered Pages, smoke-check, iOS smoke-build and TestFlight workflows; verify each before claiming a release is ready.
- Local history differs from remote because changes were published using GitHub tree/commit APIs. Fetch and base future work on remote main, preserving unrelated local work; do not force-push the local history.

## Published changes and evidence

### aab9df998b8cf0beef16358f9b852ca0e13defb7

Published invoice print/PDF button, workflow refresh listener and employee onboarding. Equivalent source tree to local commits de46ad8 and 7ac9e4e.

- app/commercial-v1.js: invoice detail Print / Save PDF action; listener for tradeos:refresh-workflow reloads quotes/finance.
- app/team-onboarding-v1.js and .css: invitation confirmation, share instructions, pending invitation display, join=employee sign-up copy.
- app/index.html: added assets and cache version.
- JavaScript syntax and diff checks passed; GitHub smoke checks reported success.
- Public app HTML was subsequently verified to include invoice-print-refresh-1 and team-onboarding assets. This proves web delivery, not functional success on iPhone.
- No authenticated end-to-end test of invoice save/print, quote refresh, employee onboarding or permissions was completed. Earlier assistant messages overstated testing.

### b471c4c07563f04fd69fac626c2a86cc58f4acf9

Published sign-up validation and invitation-error surfacing. Local equivalent: 223a762.

- app/tradeos-cloud-static.js: Create account previously bypassed HTML validation and could send blank email. Added reportValidity, email/password checks before signUp, duplicate-submit guard and button disabling.
- bootstrap now checks errors from accept_my_company_invitations instead of silently ignoring them.
- app/index.html loads tradeos-cloud-static.js?v=signup-validation-1.
- Syntax/diff checks and mocked request regression checks passed: missing/invalid email and short passwords do not call signUp; valid email is trimmed/lowercased. No real account was created by tests.
- Deployment and real partner sign-up success were not subsequently confirmed in this conversation. Do not call the onboarding issue resolved yet.

## User-reported problems still requiring follow-through

1. Employee sees Add job but cannot create jobs. Hide unavailable actions and make the employee experience coherent.
2. Team permissions must be clear: employees must not add/remove people or manage invitations, roles or permissions.
3. Employees must not see financial information: quotes, invoices, agreed job values, profit or pay/cost rates. Audit existing pricing-access overrides, screens, data queries and backend policies/RPCs. Hiding buttons alone is insufficient.
4. Intended employee actions: assigned jobs, their time entries and job updates; owner and authorised manager controls remain available within existing role rules.
5. Partner was shown as owner in their account while Ben's invitation stayed pending. A separate workspace was suspected, not proven. Verify authenticated email, memberships, workspace selection and invitation acceptance. Do not delete workspaces or change roles by guessing.
6. Partner reported “anonymous sign ins disabled” on Create account. Blank-email validation bug was found and patched, but the actual partner flow needs confirmation. Do not enable anonymous authentication as a workaround.
7. Invoice creation/save failure was initially reported; adding print/PDF is not proof the save problem was fixed. Test it. Print uses a popup and inline script; investigate CSP and native iOS compatibility if it fails.

## Employee permissions implementation — 2026-09-13

Implemented after the initial handover:
- Root cause: bootstrap loaded every visible company membership without filtering user_id, so an employee could be displayed as the first member (often owner). Now filters the authenticated user before choosing the active membership.
- Employee UI: no Quotes/Finance navigation or financial shortcut/query; no Add job or team-management controls via the corrected role. Team remains a read-only directory with a clear access explanation. Job Value is not rendered for employees.
- Removed the can_view_pricing employee exception in both frontend and private.can_view_pricing. Owner/admin/manager access remains.
- Applied Supabase migration employee_access_manager_financials (source in scripts/employee-access.sql): employees read assigned jobs only; billing table/RPC restricted to managers; hourly_cost column reads revoked on both timesheet tables, with a manager-only weekly cost snapshot RPC. Updated active web callers accordingly.
- Tests: scripts/test-employee-access.cjs passes employee/owner cases with owner first in the mocked membership list, navigation/action checks and financial-query exclusion.
- Live database tests used an existing employee identity in a rollback transaction: no quotes/invoices/payments/rates/profit/snapshots visible, timesheet cost column privilege denied, no unassigned jobs, membership update matched zero rows, invitation/job creation and billing RPC denied. Owner financial RPC and safe weekly reads still succeeded. No user records changed by tests.
- Security advisor reviewed: public document-link RPC and authenticated SECURITY DEFINER warnings remain; leaked-password protection disabled. This is not a comprehensive audit of every RPC. Remediation guidance: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- Web publication is in progress at this checkpoint. Verify employee-access-1 assets on the live app before claiming delivery. Native Apple/TestFlight release unverified; old clients selecting timesheet hourly_cost need the updated build.

## NEXT ACTION — verify employee experience on the partner's phone

The requested employee-permissions change is implemented and tested as above. Verify deployment, then confirm the partner's existing account shows Employee, a read-only Team screen and assigned jobs/time entry without financial sections. Do not create another workspace. Real-device UX and invitation pending-state confirmation are still outstanding. Keep invoice creation/printing verification on the backlog.

Useful source files: app/tradeos-cloud-static.js, modern-ui.js, home-simple.js, product-v2.js, product-clean-v1.js, jobs-clean.js, job-detail-v1.js, pricing-access-v1.js, job-finance-permission-v1.js, commercial-v1.js, team-rates-secure-fix.js, team-onboarding-v1.js.

Supabase project reference visible in the frontend: nynssdxfmjfqgodgynnu. Use the Supabase skill and authorised connection for backend inspection. Never put secrets, session tokens, private customer details or employee credentials in this handover.

## How to resume in a new chat

“Continue TradeOS. Read PROJECT_HANDOVER.md in wzjmjdvb5z-beep/tradeos-beta-preview first. Continue the unfinished employee-permissions work.”

This file is a durable checkpoint, not a guarantee that a new chat automatically loads it. Fetch its latest version and verify current source/deployment state.
