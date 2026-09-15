# Veystead Beta — iOS release checklist

Status: pre-TestFlight, working name only.

## Apple identity

- App Store Connect app: Veystead Beta
- Platform: iOS
- Bundle ID: `uk.co.benjaminchurchill.fieldservice`
- Apple Team ID: `622C977A6X`
- Version target: `1.0`

## Automated gates already required

The iOS smoke workflow must pass before a release build is considered ready:

- JavaScript syntax checks
- native mobile bundle generation
- external Stripe purchase CTA suppressed in native iOS
- in-app privacy controls bundled
- account-deletion request flow bundled
- Capacitor privacy manifest present
- registered Bundle ID present in generated Xcode project
- iOS Simulator build succeeds
- unsigned Release build for generic iPhone device succeeds

## TestFlight build pipeline

The manual `Veystead TestFlight release` GitHub Actions workflow is prepared to:

1. generate the Capacitor iOS project;
2. install Apple distribution signing assets from repository secrets;
3. verify the provisioning profile matches the Apple Team and Bundle ID;
4. archive a signed Release build;
5. export an App Store Connect IPA;
6. validate the IPA with App Store Connect; and
7. upload the build to TestFlight.

Signing/API credentials must only be stored as GitHub Actions secrets. Never commit `.p8`, `.p12`, provisioning profile contents, passwords, or private keys to this repository.

## Apple account items still required before first signed upload

- App Store Connect API access/key or another approved upload credential
- Apple Distribution certificate with exportable private key
- App Store Connect distribution provisioning profile for `uk.co.benjaminchurchill.fieldservice`
- signing values installed as GitHub Actions secrets

## TestFlight beta information draft

### Beta description

Veystead Beta is a job-management app for UK trade businesses. It brings customers, quotes, jobs, scheduling and weekly timesheets into one workflow so small trade teams can spend less time on admin.

### What to test

Please test the normal business workflow: sign in, create a customer, prepare a quote, convert the accepted quote into a job, schedule/manage the job, log time using the live timer or manual time entry, submit/review the weekly timesheet, and create an invoice. Report anything confusing, incorrect or slow through the in-app feedback route.

### Review notes draft

Veystead Beta is a free iOS companion to a paid web-based business-management service. The iOS build does not offer purchasing and does not contain a call to action to purchase outside the app. Subscription administration remains on the web service.

The app requires authentication because its core functionality is a private company workspace containing business and customer records. A dedicated App Review demo account must be supplied before submission and must remain active while the build is under review.

Account deletion is available while signed in under `More → Account & privacy → Delete account`. The user can initiate deletion inside the app and is told that the founding-beta process completes the request within seven days.

## Privacy/support URLs

A privacy policy is bundled inside the iOS app. A public privacy-policy URL and support URL must also be entered in App Store Connect before public submission. Prefer the final branded domain once it is available; until then use only a publicly reachable beta URL that has been verified immediately before submission.

## Before external TestFlight review

- install the signed build on at least one physical iPhone
- verify sign-in/session persistence
- test quote → job → timesheet → invoice on the installed build
- test start/stop timer after backgrounding and reopening the app
- test native share sheet where used
- verify external Stripe purchase controls are absent from iOS
- verify `Account & privacy` is visible to signed-in users
- request account deletion only with a disposable test account, then cancel/clean up the request if the beta process allows it
- supply TestFlight contact details and review notes
- supply a dedicated demo account for Apple review

## Before public App Store submission

- lock final product name and app icon
- complete App Store screenshots and description
- verify support and privacy URLs on the final public domain
- complete App Privacy answers so they exactly match the production app and service providers
- complete age rating and required compliance questions
- complete EU DSA trader status if distributing where required
- enable Supabase leaked-password protection before unrestricted public registration
- enable strong account security/MFA on release-critical services
- run the full backend smoke suite and iOS build gates again
- perform a final real-device regression test
