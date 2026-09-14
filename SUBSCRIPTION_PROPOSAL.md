# Veystead subscription proposal — 14 September 2026

Requested: a trial, then £20/month base plus £15 per additional person up to 10 staff, with higher pricing bands at 10–25, 25–100 and 100+.

Not activated. Existing subscribers and Stripe charges remain unchanged.
Before implementation, Ben must confirm:
- Trial duration (current legacy offer says 14 days).
- Whether £20 includes the owner and whether staff counts include that owner.
- Exact prices/calculation for each larger band and non-overlapping boundaries.
- Whether prices include VAT.
- Existing subscriber treatment.

Implement server-calculated seat counts and enforce plan changes through verified payment webhooks; never trust browser totals or a static checkout link to enforce seat billing. Native purchase eligibility and App Store payment requirements must be reviewed before shipping a purchase flow. Do not expose speculative rates or trial claims to customers.
