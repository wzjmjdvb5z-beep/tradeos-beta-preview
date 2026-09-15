# Veystead subscription model — 15 September 2026

Confirmed launch pricing:

- 14-day free trial.
- £19/month includes the owner.
- £7.99/month for each additional active user.
- Cancel anytime.
- No staff bands at launch.

The app displays a server-calculated total. Checkout independently counts active company members and creates a Stripe subscription with a £19 base line and the correct number of £7.99 licensed seat lines. Browser-provided totals are never trusted.

Production checkout requires the Supabase Edge Function secret `STRIPE_SECRET_KEY` for the live Veystead Stripe account. Keep this key out of source control and browser code.

The native iOS shell continues to hide external web-purchase controls pending App Store payment-rule review. VAT is not calculated automatically until the business confirms its VAT registration and desired tax treatment.
