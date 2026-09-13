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
- Published as aa4b90da30dd39fe7c1d972d1a59dfa3bf5f90f0. Pages deployment run 34765569740 and smoke checks 34765570466 completed successfully. Public app HTML was verified to load employee-access-1 assets. Native Apple/TestFlight workflows were still in progress; old clients selecting timesheet hourly_cost need the updated build. Real-phone UX remains to be confirmed.

## NEXT ACTION — verify job stages and deletion on the owner's phone

Ben confirmed employee permissions work and the schedule seems good. Job deletion and the five stages are now published; see the latest checkpoint below. Next, verify the stage selector and deletion confirmation on his phone using a disposable job. Invoice save/print and instant quote updates still require real-device follow-through before continuing Apple release verification. Do not repeat completed permissions or schedule work.

Useful source files: app/tradeos-cloud-static.js, modern-ui.js, home-simple.js, product-v2.js, product-clean-v1.js, jobs-clean.js, job-detail-v1.js, pricing-access-v1.js, job-finance-permission-v1.js, commercial-v1.js, team-rates-secure-fix.js, team-onboarding-v1.js.

Supabase project reference visible in the frontend: nynssdxfmjfqgodgynnu. Use the Supabase skill and authorised connection for backend inspection. Never put secrets, session tokens, private customer details or employee credentials in this handover.

## How to resume in a new chat

“Continue TradeOS. Read PROJECT_HANDOVER.md in wzjmjdvb5z-beep/tradeos-beta-preview first. Continue from the latest NEXT ACTION and checkpoint.”

This file is a durable checkpoint, not a guarantee that a new chat automatically loads it. Fetch its latest version and verify current source/deployment state.

## Schedule visibility follow-up — 2026-09-13

User confirmed the employee changes work, then reported the schedule showing nothing. Live read-only aggregate inspection found 13 jobs, one dated job, one employee assignment and zero dated employee-assigned jobs. The employee calendar only rendered dated assignments, omitting their undated job; the product cleanup also hid the owner's unscheduled list.

- Schedule now displays undated assigned jobs under Awaiting dates for employees, without editing controls or financial data. Assigned jobs count includes undated assignments. An explicit message explains when no jobs are assigned.
- Owners/managers can see their unscheduled list and Schedule buttons again, with guidance to date and assign jobs. Existing calendar and assignment restrictions are preserved. No job dates, assignments or backend policies were changed.
- Updated schedule-board.js and product-clean-v1.js cache versions to schedule-visibility-1.
- scripts/test-schedule-visibility.cjs passes employee assignment isolation, escaped job titles and owner scheduling controls. Existing employee-access regression also passes; both changed scripts pass syntax checks and git diff passes whitespace checks.
- Published as 5aa898e9cd714ff3c556c631a2745094295a78bb. Pages run 34766537394 and smoke checks 34766540475 completed successfully; public HTML serves schedule-visibility-1 assets. Native iOS/TestFlight release was still in progress. Real-phone confirmation is still needed; if a dated owner job is missing, ask which account/date and diagnose that separately.

## Job deletion and stages — 2026-09-13

Ben confirmed schedule seems good, requested Delete jobs and stages Ready → In progress → Complete → Bill sent → Bill paid.

- Added manager-only job-stage selector and Save stage in job details, plus Delete job with explicit in-page permanent-delete confirmation. Lists refresh after successful changes. Existing Booked jobs display as Ready; new jobs use ready.
- Billing stages are manual tracking labels: they do not send invoices, mark invoice records paid or create payments. Stored separately in job_financials.billing_stage under existing manager RLS so employees continue seeing operational status only (Complete for billed jobs). No automatic invoice-stage sync was implemented.
- Applied migration job_delete_and_workflow_stages, source scripts/job-actions.sql. manage_job is SECURITY INVOKER, checks active owner/admin/manager membership, locks the company-scoped job, updates operational/private billing stages atomically, or deletes assignments and job in one transaction. Existing invoice/time/cost foreign keys prevent deleting financial history. Timer/update/photo foreign keys now RESTRICT deletion instead of CASCADE; blocked deletion rolls back assignment removal. No real jobs were deleted.
- Scheduling edits only dates/people now; change stages through Jobs so schedule edits cannot overwrite billing progression.
- Verification: rollback database tests passed owner stage/billing/reset/delete with temporary assigned job; protected note blocked deletion and retained assignment; employee stage/delete denied and financial rows invisible. scripts/test-job-actions.cjs, test-employee-access.cjs and test-schedule-visibility.cjs pass. JavaScript syntax and whitespace checks pass.
- Security advisors show pre-existing document-link/definer/leaked-password notices; no manage_job finding (invoker, no anonymous execution). Existing remediation links above apply.
- Published as 858b642d64e1b6cf5042fb6ae9a4612e20b6b2c7. On continuation, remote source tree exactly matched local tested tree bc2c2d56c9c10bfaa5e6ac91fc9d0ed17288df83. Public app HTML serves all four job-actions-1 assets; fetched public job-detail-v1.js exactly matches the tested local file. This confirms web delivery.
- GitHub smoke checks 34767345288, iOS smoke build 34767345293 and TestFlight release workflow 34767345231 all completed successfully. App Store Connect processing/tester availability has not been independently checked; do not claim Apple approval.
- Re-ran job actions, employee access and schedule regression checks successfully, plus job-detail syntax and diff whitespace checks. Prior rollback database results remain recorded above; not rerun in this continuation. Real-phone stage selection and deletion confirmation remain to be verified.
