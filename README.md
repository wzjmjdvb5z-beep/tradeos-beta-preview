# TradeOS beta preview

This repository is a **workflow prototype**, not the production TradeOS application.

## Security status

The public GitHub Pages preview is deliberately **local-only**:

- no account sign-in
- no bearer-token persistence
- no authenticated Supabase calls
- no cloud sync
- no real customer/employee data should be entered

The earlier prototype used direct browser-to-Supabase authentication and stored the returned session in `localStorage`. That approach has been disabled and is not the production architecture.

Production TradeOS is being built separately in the private `TradeOs` repository with company-scoped data, RLS and a server-managed authentication/session layer.

## Purpose

This public preview exists only to validate the core workflow with demo data:

`enquiry → quote → job → timesheet → approval → job profit`

See `SECURITY.md` for the security boundary and production requirements.

_Last redeploy trigger: secured preview._
