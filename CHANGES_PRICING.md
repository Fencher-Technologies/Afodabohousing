# Pricing revision: Test / Essential / Business Class / Elite

## Database (already applied to Supabase)
- `supabase/migrations/20260922000000_axis_plan_pricing.sql`
  - New prices, limits and benefit copy (plan ids unchanged: 1mo=Test, 3mo=Essential, 6mo=Business Class, 12mo=Elite)
  - `subscription_plans.free_boost_days` (Elite = 90)
  - Triggers: Elite activation boosts all listings for 3 months; properties listed in that window are boosted too
  - `manager_subscriptions.status` now allows 'failed'

## Backend (deploy needed)
- `services/subscriptions.py`: upgrade/renewal while active now switches to the new plan and carries over remaining days (was silently doing nothing); new `get_tenant_quota`
- `routers/leases.py`: new tenancies blocked once the plan's tenant limit is reached
- `services/boost.py`: free Elite boosts excluded from boost revenue stats
- `tests/test_plan_limits_and_upgrade.py`: new tests

## Web (deploy needed)
- `src/pages/ManagerSubscription.tsx`, `src/services/subscriptions.ts`: "3 months" instead of "90 days", price follows UGX/USD toggle, new tagline
- `src/pages/Login.tsx`: removed stray `</>` and `)}` that broke the build

## Mobile (new build needed)
- `app/subscription.tsx`, `app/subscription-payment.tsx`, `src/utils/format.ts`: same display fixes

# Support contact numbers
- Phone: +256 394 709 397 · WhatsApp: +256 789 590 007
- Web: `src/pages/Contact.tsx`, `src/components/Footer.tsx`
- Mobile: `app/legal.tsx` (Contact Support screen)
- Web `src/pages/Account.tsx`: "Contact Support" now opens the Contact page (it only opened an email before, so the numbers were never shown)

# Tenant "Request changes" showed "Could not submit" (fixed)
- Cause: the audit log's check constraint did not allow `tenant_rejected` / `manager_rejected`.
  The comment was saved (so the manager saw it), then the audit insert failed, the request
  returned an error, and the manager's notification was never sent.
- `supabase/migrations/20260922000100_agreement_audit_rejection_events.sql` (already applied, live)
- `backend/services/agreements.py`: audit-log failures are logged, never shown to the user
- Web `src/pages/AgreementView.tsx` and mobile `app/agreement-view.tsx`: "Changes submitted successfully"
- Mobile only blames the connection when the request truly never reached the server
- `backend/tests/test_agreement_audit_nonfatal.py`

# Password reset "Site can't be reached" (fixed in code + Supabase settings needed)
- Mobile no longer sends links to `axis://reset-password` (Chrome on Android cannot open it
  from a redirect); every reset link now opens https://axishousings.com/reset-password
- Web builds the link from the current site instead of a possibly stale VITE_SITE_URL
- Backend default reset URL, CORS and render.yaml updated to axishousings.com
- Web reset page: fixed a timing bug that could show "link expired" on a valid link

# Password autofill / saving (fixed)
- Mobile `src/components/InputField.tsx` passed no autofill hints; now forwards
  `autoComplete` / `textContentType`, set on login, register, reset, change-password, accept-invite.
  Also stops screen readers from reading passwords aloud.
- Web: `name`/`autoComplete` on login and signup, plus `src/lib/save-credentials.ts`, which asks
  the browser to save the password after login, signup and reset.

# Email
- `info@axishousings.com` is the only address shown; system emails are also sent from it.

# Reset emails landing in spam / links expiring early
- `src/pages/ResetPassword.tsx` accepts `?token_hash=…&type=recovery` links, so the Supabase
  "Reset Password" template can link to axishousings.com instead of *.supabase.co.
  Deploy this BEFORE changing the email template.
- DNS (DreamHost): add a DMARC record (host `_dmarc`, TXT `v=DMARC1; p=none; rua=mailto:info@axishousings.com`).

# Email notifications for admins, tenants and managers
- `supabase/functions/send-email/index.ts` (already deployed, v2): sends through DreamHost SMTP
  (smtp.dreamhost.com:465 as info@axishousings.com) in a branded layout. It used Resend, which was
  never configured, so no notification email was ever delivered.
  Needs ONE Supabase secret: SMTP_PASSWORD (Edge Functions -> Secrets).
- `backend/services/notifications.py`: `notify_admins()` emails every super_admin; PDF-download
  events stay in-app only.
- New admin alerts: manager waiting for approval (`routers/auth.py`), new manager sign-up,
  new property listed (`routers/properties.py`), subscription paid (`services/subscriptions.py`),
  boost purchased (`services/boost.py`).
- `backend/tests/test_admin_notifications.py`

# Push notifications (mobile)
- `supabase/migrations/20260922000200_push_tokens.sql` (already applied): the `push_tokens` table the
  backend read from had never been created, so every push was skipped.
- Backend `services/notifications.py`: batches of 100, returns devices reached, deletes tokens of
  uninstalled apps; `routers/notifications.py`: POST/DELETE /notifications/push-token (moves a phone
  to whichever account signs in); `services/scheduler.py`: rent reminders now push via Expo too.
- Mobile: `expo-notifications` + `expo-device`; `src/lib/push-notifications.ts`,
  `src/hooks/usePushNotifications.ts` (register after sign-in, open Notifications on tap),
  unregister on sign-out (`src/context/auth-context.tsx`), plugin in `app.json`.
- Android needs Firebase (google-services.json + FCM V1 key in EAS); new native build required.

# Android push setup (Firebase)
- `MobileAppAfodabo_v2/google-services.json` added and referenced in `app.json` (android.googleServicesFile).
- The Firebase service-account key is NOT in the repo: upload it to Expo (expo.dev -> project -> Credentials
  -> Android -> FCM V1 service account key). `.gitignore` now blocks such keys; the build workflow fails if one is committed.
- FCM V1 key uploaded to Expo (done). `.github/workflows/expo-build.yml` unchanged.

# Rent reminders, activity notifications and branding
- Reminders had not run since 11 Sep: the timer lives in the Render web service, which sleeps.
  `supabase/migrations/20260922000300_cron_rent_reminders.sql` (applied): pg_cron + pg_net call
  `POST /internal/jobs/run` daily at 06:00 UTC (09:00 Kampala) + a retry at 06:15, authenticated with
  a vault secret via `verify_cron_secret()`. New `backend/routers/jobs.py`.
- `backend/services/scheduler.py`: managers are now reminded about tenants in arrears (they never were),
  tenants get a heads-up 3 days before rent falls due, and both repeat every
  `RENT_REMINDER_INTERVAL_DAYS` (default 7, set in `backend/config.py`).
- `backend/services/notification_copy.py`: all wording in one place, naming people and places
  ("Hello Eric, your tenant Yonah of Kololo is now due…"). Wired into payments and agreements.
  Fixes a bug where a tenant signing told the manager "Landlord/Manager Has Consented".
- Logo: `MobileAppAfodabo_v2/assets/images/notification-icon.png` (white Axis mark for Android,
  tinted #1a4d3a) set in app.json; email header now shows the logo (`public/axis-logo.png`,
  served from axishousings.com). send-email redeployed (v4).

# Receipt dates
- `backend/services/receipts.py`: coverage now continues the rent ledger (effective date + days already
  paid for) instead of starting on the payment date. Tino Eve: 1 Sep - 30 Nov, not 10 Sep - 9 Dec.
- `backend/tests/test_receipt_coverage.py`. 10 existing receipts still hold the old dates (not changed).

# Property limit enforcement
- The website inserted properties directly into Supabase, bypassing the backend quota check.
  `supabase/migrations/20260922000400_enforce_property_plan_limit.sql` (applied) enforces it in the
  database for every route.
- Web: `src/utils/planLimit.ts` + `src/components/PlanLimitDialog.tsx`, wired into ManagerDashboard
  and CreateProperty: "Property limit reached" with an Upgrade subscription button.
- Mobile: `app/create-property.tsx` shows the same prompt with an Upgrade option.

# Sharing a property (marketing)
- Mobile `app/property-detail.tsx`: the shared message had NO link at all. It now ends with
  "View it on Axis: https://axishousings.com/properties/<id>" (and sets the iOS url field).
- Web `src/pages/PropertyDetail.tsx` + `src/utils/shareProperty.ts`: shares title, rent, location and
  the public link, and copies all of it when the browser has no share sheet.
- WhatsApp/Facebook/X link previews: the site is an SPA, so every property showed the same generic
  text and a missing image. `api/preview.js` (Vercel function) + a crawler-only rewrite in
  `vercel.json` serve per-property Open Graph tags with the listing's first photo; humans are
  forwarded to the listing. `public/og-image.png` created as the fallback card.

# Country codes on phone fields
- `backend/phone.py`: every number was forced to +256, so anyone outside Uganda could not sign up.
  Any country code is now accepted; a local number still defaults to Uganda, so existing accounts
  and logins are unchanged. Tests in `tests/test_phone_normalization.py`.
- Shared country list: `src/utils/countries.ts` and `MobileAppAfodabo_v2/src/utils/countries.ts`
  (East Africa first; +1 resolves to the US).
- Web `src/components/ui/phone-input.tsx`, used on Login, PhoneSignin, PhoneAuth, ForgotPin,
  EditProfile (both fields), Onboarding and GettingStarted.
- Mobile `src/components/PhoneField.tsx` (searchable country modal), used on register, phone-auth,
  phone-signin, forgot-pin, accept-invite and edit-profile (both fields).

# Subscription flipping between active and expired
- `backend/services/subscriptions.py`: the "current subscription" query ignored status, so a
  cancelled row with a future expiry could win. Only 'active'/'grace' rows count now.
- Web `src/components/DashboardLayout.tsx` and mobile `src/context/auth-context.tsx`: a failed
  request (offline, or the backend waking up) set the plan to null, which the apps show as expired.
  The last known plan is now kept, and cached on mobile so a restart shows it immediately.

# Phone/PIN sign-up and sign-in removed
- Deleted: web PhoneAuth/PhoneOtp/PhonePinSetup/PhoneSignin/ForgotPin/ChangePin pages and routes,
  mobile phone-auth/phone-otp/phone-pin-setup/phone-signin/forgot-pin/change-pin screens, the
  hidden phone blocks in login/register, the "link phone" sections and Change PIN buttons.
- The backend /auth/phone/* endpoints are still there but nothing calls them.

# Country pickers everywhere
- Also on: PropertyForm (manager phone), Contact, SuperAdminDashboard (create manager),
  ManagerDashboard (both tenant forms), Register and AcceptInvite.

# Loading speed
- `supabase/migrations/20260922000500_perf_keepalive_indexes.sql` (applied): 10-minute keep-alive
  ping so the backend never sleeps, indexes for per-screen lookups, and 5 duplicate indexes dropped.

# Boost pricing (standard rate card)
- `supabase/migrations/20260922000600_boost_pricing.sql` (applied): Basic 14 days UGX 4,000,
  Standard 30 days UGX 8,000, Premium 90 days UGX 12,000 (new). The old 7-day package became the
  500 UGX "Test — 1 day", listed last. Boosts are charged in UGX only.
- `src/pages/BoostPage.tsx`: stale fallback prices (15k/25k/45k) replaced, "UGX" shown with each
  price, and the default duration now follows the packages on offer (it was fixed at 7 days,
  which no longer exists and would have left the selector blank).

# Multi-currency
- `backend/services/forex.py`: the fallback rate table was inverted and had no UGX entry, so any
  conversion without the live rate service produced nonsense. Rebuilt on a USD base with UGX pinned
  at 1 USD = 4,000 UGX; unknown currencies are now left alone instead of being treated as 1:1.
- `supabase/migrations/20260922000700_profiles_display_currency.sql` (applied):
  `profiles.display_currency` (default UGX) = the currency a manager's totals are reported in.
- `backend/routers/reports.py`: /reports/summary and /reports/rent-collection convert each tenancy
  from its own currency into that one before adding, and return `currency` + `mixed_currencies`.
  Previously UGX and KES amounts were added together and shown with no currency at all.
  Tests: `backend/tests/test_report_currency.py`.
- Web `ManagerReports`: totals now show their currency code, with a note when the portfolio is mixed.
  Mobile reports use the same code.
- Web `PropertyForm`: a rent-currency selector (the country's currency is the default, not a cage).
- `MobileAppAfodabo_v2/src/data/countries.ts`: currency list shows "UGX", not "UGX (local)".
- Receipts already follow the property's currency (property -> lease -> payment -> receipt); verified.

# Final pass: currency settings, SEO, cleanup
- `backend/services/forex.py`: UGX now follows live rates like every other currency; 4,000 per USD
  is only the fallback when the rate service cannot be reached.
- Reporting currency is now editable: `display_currency` on the profile, set from web Edit Profile
  (`src/utils/currencies.ts` + SearchableSelect) and mobile Edit Profile
  (`src/components/CurrencyField.tsx`), saved through PATCH /auth/profile (validated as a 3-letter code).
- Web `PropertyForm` has a rent-currency selector; currency list covers the world, not just East Africa.
- Em dashes removed from user-facing copy: boost package labels are now "Basic (2 weeks)" etc.,
  and the Test plan benefit reads "For testing payments only: lasts 1 day".
- SEO: rewritten `index.html` (title, description, keywords, canonical, robots directives,
  Open Graph, Twitter cards, theme-color and JSON-LD for Organization, WebSite with SearchAction,
  and SoftwareApplication); `src/lib/seo.ts` sets per-page title, description, canonical, social tags
  and JSON-LD (the SPA served identical tags on every route); applied to Home, Properties,
  PropertyDetail (with Residence + Offer schema per listing), About, Contact and Getting Started;
  `api/sitemap.js` builds sitemap.xml from live listings (routed in vercel.json); robots.txt lists the
  sitemap and keeps crawlers out of private areas.
- `package.json`: `npm run types:generate` refreshes the generated Supabase types, which are stale and
  are the source of the remaining TypeScript warnings (the build itself does not type-check).

# Floating WhatsApp button (web)
- `src/components/WhatsAppButton.tsx`, mounted in `src/App.tsx`: opens a chat with
  +256 789 590 007 with a short opening line prefilled. Shown on public pages only (hidden under
  /dashboard, /account, /manager, /tenant, /admin), sits below dialogs (z-40) and uses an inline
  SVG mark, so it adds no extra request.

# Contact number correction + site address
- WhatsApp is +256 789 590 007 everywhere (floating button, Footer, Contact page, mobile Contact
  Support, and the Organization schema). The earlier +256 201 004 789 is not on WhatsApp.
- The live site answers at www.axishousings.com (the bare address redirects there), so canonical
  URLs, share links, reset links, sitemap and email links now use the www form.

# Vercel deployment failure (functions removed)
- Deployments were failing (GitHub deployment status "failure" at 21:18 on 22 Sep), so the old build
  stayed live and none of the web changes appeared. The repo itself builds cleanly: `npm install`
  plus `npm run build` succeed on a fresh clone of main.
- The only build surface that exists on Vercel but not locally is `api/`, so those two functions have
  been parked in `docs/vercel-functions/` and `vercel.json` is back to its original contents.
- sitemap.xml is now written during the build by `scripts/generate-sitemap.mjs` (wired into the
  build script). It never fails the build: without database credentials it writes the static pages only.
- Lost for now: per-property WhatsApp/Facebook preview cards. Shared links show the generic Axis card.
  To restore, move `docs/vercel-functions/preview.js.txt` to `api/preview.js` and re-add the crawler
  rewrite, once someone can read the deployment log.

# Phone number on web sign-up
- `/signup` is served by `src/pages/EmailSignup.tsx`, which never asked for a phone number, while the
  mobile app did. It now has the same country-picker phone field, required, sent to the backend
  (which already accepted and stored `phone` on signup).
- `src/pages/Register.tsx` is dead code: `/register` redirects to `/signup`.

# Hero overlay + web property page parity
- `src/index.css`: hero wash lightened again (0.72/0.40 -> 0.58/0.28).
- `src/pages/PropertyDetail.tsx`:
  * The save (heart) button only changed local state, so saving was forgotten on refresh. It now uses
    the same bookmarks API as the mobile app, updates instantly and rolls back if the save fails.
    Signed-out visitors are sent to sign in.
  * Added a "WhatsApp the manager" button with the listing name and link prefilled, as on mobile.
  * The page reads `rent_amount`, but the SEO description and listing schema were reading
    `monthly_rent`, so the price was missing from both. Fixed, including the rent period.
- `src/utils/shareProperty.ts`: accepts `rent_amount` as well, so shared messages include the price.

# Hero grey wash (the real cause)
- `.duotone-img` blended hero photos with `mix-blend-mode: luminosity` over a navy panel, which
  strips their colour entirely: that was the grey look, not the gradient I lightened earlier.
  Now a light wash (6% grayscale, 96% opacity) with the colour kept.
- `.page-hero-shade` (About, Contact, Properties, Terms, Privacy, Explore) lightened: 0.74/0.66/0.94
  down to 0.50/0.40/0.72.
- Home page hero gradient lightened: 100/80/60 down to 85/55/35.

# Hero headline legibility
- The red italic line sits on a bright sunset sky: measured 1.9:1 contrast, where large text needs
  3:1. Darkening the whole photo was the old workaround, and it made the image dull.
- `src/pages/Index.tsx`: a reading scrim behind the copy only (dark on the left, gone by the middle),
  so the building stays bright. Top-to-bottom gradient eased to 92/55/30.
- `.hero-accent` in `src/index.css`: the italic line uses a brighter tint of the brand red (#F2564F)
  plus a soft shadow, reaching roughly 4:1 over the scrim.
- Hero accent eased from #F2564F to #E8423C (closer to brand red, still 3.5:1 over the scrim), and the
  gap between the menu and the overline reduced (pt-40 -> pt-24/28, overline margin mb-6 -> mb-4).

# Android build workflow
- `.github/workflows/expo-build.yml`: the `android-actions/setup-android@v3` step began failing after
  GitHub updated the runner image. Replaced with a step that points at the Android SDK already
  installed on the runner (falling back through ANDROID_SDK_ROOT, ANDROID_HOME and the standard path),
  so the build no longer depends on that action.
- Gradle memory raised (-Xmx4g, daemon off) because push notifications pull in Firebase.

# Web/mobile property page parity, round 2
- Mobile hid nothing when a manager had no phone or email: it announced "Phone not provided" to
  visitors. Those rows are now hidden, as on the web.
- The quick stats row showed "Yes / Parking" where the web shows Sitting Rooms. Mobile now shows the
  same three figures with the same labels (Bedrooms, Bathrooms, Sitting Rooms); parking stays in
  Amenities, where the web lists it.
- Badges now match the web in order and wording: Boosted first, then the property type, then
  "Available Now"/"Occupied", then Inactive.
- Currency choice when listing a property was a fixed list of eight on both apps. Both now offer every
  currency in `utils/currencies.ts`, with the country's own first, shown as "KES - Kenyan Shilling".

# Logo
- The client's logo is used exactly as supplied (no recolouring, no rearranging, no white knocked out).
  Source: the stacked Axis / house / "Housing Made Easy" artwork; only the flat white margin around it
  was trimmed so it sits correctly in layouts.
- Web: `src/assets/axis-logo-official.png` replaces the old wide lockup in the navbar, footer, login,
  sign-up, register, accept-invite, forgot-password and About pages. The footer sits on the dark brand
  colour, so the logo is shown on a white rounded panel.
- Web assets regenerated from it: `public/axis-logo.png` (email header), `public/favicon.png`,
  `public/favicon.ico` (16-256px), `public/og-image.png` (share card, logo on white).
- Mobile: `axis-icon.png` (app icon), `axis-adaptive.png` (Android, with safe-zone padding),
  `axis-favicon.png`, both splash images, and the BrandMark artwork. `BrandMark` now renders the one
  logo everywhere and puts a white panel behind it on dark headers instead of using a recoloured copy.
- Exception, unavoidable: the Android *notification* icon must be a flat white silhouette; Android
  renders it as a mask, so a full-colour logo would appear as a grey square. It stays as the white
  house mark from the same logo.

# Logo, second pass (higher resolution file)
- All assets regenerated from the sharper 1536x1024 artwork: web logo, email header, favicon (.png
  and multi-size .ico), share card, mobile app icon, Android adaptive icon, both splash screens and
  the in-app BrandMark.
- Spacing fixed: the navbar was 64px tall with a 56px logo, so the mark was wedged against the edges
  and the tagline was unreadable. The bar is now 96px with a 64px logo. Auth pages use h-16 with a
  little space beneath, and the footer's white panel has more padding.
