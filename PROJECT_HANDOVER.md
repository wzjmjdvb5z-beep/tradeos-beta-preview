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

## Release readiness pass — 13 September 2026

Ben requested a fully ready app. See RELEASE_READINESS.md for evidence and launch gates. Fixed inline invoice print blocked by CSP, stale commercial refresh/navigation race and void invoice display. Added commercial regression tests to CI with existing employee/schedule/job suites. Quote-to-invoice VAT/discount/idempotency rollback test passed without retaining test records. Previous Apple workflow upload steps verified individually; Apple availability/approval is not established. Corrected obsolete README. Publication of release-readiness-1 needs confirmation. Invoice printing now uses the existing manager-only business profile for trader/contact/VAT/bank/terms fields, with escaping regression coverage. Next verify native print/PDF and profile completeness, then real-device release gates. Do not label this fully launch-ready.

Publication evidence: release-readiness-1 published as 0b13ddb389e78cb596c989f2822af1cff8d12d44. Public HTML version and exact served commercial-v1.js verified. Smoke workflow 34780998659 passed. Pages 34780997941 and iOS/TestFlight 34780998668 / 34780998630 were in progress at check; served web assets are already current. No overdue pending account-deletion requests found by aggregate query, but processing still unverified. Full launch remains blocked by RELEASE_READINESS.md gates.

## Device/build checkpoint

Ben confirms he uses both Safari and TestFlight. Run 34780998630 for 0b13ddb389e78cb596c989f2822af1cff8d12d44 completed successfully, including validation and TestFlight upload. Push-run defaults identify version 1.0 build 17. Availability after Apple processing is not independently verified. Ask him to use 1.0 (17) or newer when testing the latest invoice print fix, and compare the same invoice in Safari. Do not treat use of both platforms as confirmation that all checks passed.

## Native invoice popup failure — 13 September 2026

Ben supplied a TestFlight screenshot showing the popup error after Print / Save PDF; he then confirmed Safari works. Native window.open is unavailable; do not ask him to enable popups in the installed app. Replaced native path with a local Capacitor InvoiceExport plugin that renders paginated A4 PDF and presents UIActivityViewController (Save to Files / Print). Temporary PDF is removed when sharing finishes or cancels; no public link or external upload is created. Native installer registers a custom bridge controller in generated storyboard and app target; both build workflows invoke installer after cap sync. Web popup printing remains. Commercial regression verifies native bridge gets invoice HTML without calling window.open. All four JS regressions pass; Swift build/upload and actual iPhone PDF layout pending. Native changes require a new TestFlight build. Preserve Safari as user-confirmed working.

Native export publication verified: commit 00c010b97e6798a28832c57ac86ab5b674f631a1. JavaScript smoke 34781598205 and iOS simulator/device builds 34781598191 passed. TestFlight 1.0 (18), run 34781598219, completed archive, signing/export, Apple validation and upload successfully. Apple processing/tester availability remains unverified. Ben confirmed Safari printing works. Next: install build 18 when available and check invoice PDF share sheet (Save to Files / Print), PDF contents/layout and cancel/retry on the actual phone. No need to ask Ben to change popup settings in the installed app.

## Build 18 native registration regression

Ben's screenshot reports InvoiceExport not implemented on iOS. Root cause confirmed against actual @capacitor/cli 8.5.2 template: SceneDelegate constructs CAPBridgeViewController directly, bypassing the patched storyboard. Installer now also replaces the scene root with TradeOSViewController. Tested twice against the real template to confirm correct/idempotent installation. Added simulator launch gate in both iOS and TestFlight workflows: real webview must report InvoiceExport available and write a success sentinel; missing controller/bridge fails before upload. Pending build/runtime results. Safari printing remains confirmed working; do not ask user to enable native popups or treat build 18 as fixed.

## 14 September continuation — build 19 registration verified

User asked to continue fixing native export. Confirmed commit 1efd30482fb3b199895cae9e6142228fc1ca146a completed both workflows: iOS run 34782209057 passed actual simulator registration and device compilation; TestFlight run 34782209045 (1.0 build 19) passed runtime registration gate, archive/export, Apple validation and upload. Release job log explicitly reports InvoiceExport registered at 21:02:13Z and UPLOAD SUCCEEDED with no errors at 21:10:07Z on 13 September. Native SceneDelegate registration defect now verified fixed in running simulator; full real-device PDF generation/layout and Save to Files/Print remain unconfirmed. Apple processing/tester availability cannot be inferred from upload. Next tell Ben to select 1.0 (19) when available and test invoice Print / Save PDF; build 18 is faulty, Safari is user-confirmed working. No new code change or redundant build was needed in this continuation.

## Performance pass — 14 September 2026

Ben reports whole-app lag. Found feedback loops: modern-ui rewrites icons/More navigation every observer pass; home-simple rebuilds panel even when stats unchanged; product-clean reassigns unchanged heading text; no-op class writes awaken broad observers; job-detail rechecks auth for already-enhanced lists. Added identity/content guards, meaningful-attribute mutation filtering and job-card early return. No financial/session cache added and no backend permission changes. All four existing regression suites pass. New Playwright synthetic browser test measures idle DOM mutations before/after and checks stats refresh and secondary navigation. Local Chromium download unavailable so run on performance-check branch before promoting main. New build required for native UI changes; invoice build19 registration fix preserved.

Performance verification: candidate 408334603bb60761c514f302fff5c2be2a54ad04 passed GitHub browser/syntax/regression/asset check 34810201091 before fast-forward publication to main. Actual Chromium synthetic Home/navigation fixture measured baseline 1708 DOM mutations per idle second versus 0 after fix. Dynamic metrics and secondary navigation update checks passed. This is not a whole-app or real-device latency benchmark. TestFlight build 20 run 34810282914 and iOS 34810282896 started after promotion; completion and Apple availability pending. Pages run 34810282227 started. Next verify served performance-1 assets and let Ben compare navigation/scrolling on web and build20 when available; keep existing native invoice runtime gate.
