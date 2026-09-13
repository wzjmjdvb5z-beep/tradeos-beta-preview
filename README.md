# TradeOS web app and iOS beta

This repository contains the live authenticated web app and the Capacitor iOS shell. It is no longer a local-only demo.

- Web entry: `app/index.html`
- Backend: Supabase Auth, Postgres/RLS, Storage and authenticated RPCs.
- Mobile bundle: `npm run mobile:prepare`; native entry: `mobile/native-entry.js`.
- GitHub Actions checks JavaScript syntax, local assets and workflow regressions. Separate workflows build iOS and upload to TestFlight.
- A successful TestFlight upload is not App Review approval or proof of real-device functionality.

Read `PROJECT_HANDOVER.md` before continuing. Read `RELEASE_READINESS.md` for verified results and outstanding launch requirements; do not call the app production-ready until those requirements are resolved.

## Regression checks

```sh
node scripts/test-commercial-readiness.cjs
node scripts/test-employee-access.cjs
node scripts/test-job-actions.cjs
node scripts/test-schedule-visibility.cjs
```

See `SECURITY.md` for the security architecture. Never commit privileged credentials or real customer test fixtures.
