# SoftLedger — architecture

## Structure

```
softledger/
├── index.html        splash / entry screen
├── login.html         auth: log in
├── signup.html         auth: create account
├── dashboard.html      Home — live stats + recent activity
├── customers.html       customer list (from v_customer_balances)
├── add-customer.html    create a customer
├── record-charge.html   create a charge
├── record-payment.html  create a payment
├── transactions.html    combined charge+payment feed
├── store-settings.html  profile: store info + preference toggles
├── reports.html         revenue report (range picker, trend, top customers)
├── css/
│   └── styles.css      brand tokens + overrides Tailwind utilities don't cover
├── js/
│   ├── config.js         Supabase URL/anon key
│   ├── supabase-client.js single shared client instance
│   ├── auth.js            all auth calls (signUp, signIn, signOut, session check)
│   ├── customers.js       customer CRUD + balance reads
│   ├── charges.js         charge creation + today's-total + date-range reads
│   ├── payments.js        payment creation + date-range read
│   ├── transactions.js    combined charge+payment feed reads
│   ├── profile.js         store profile + preference toggles
│   └── utils.js           form validation / UI helpers, no dependencies
├── supabase/
│   └── schema.sql        Phase 1 DB schema (tables, RLS, views) — run this
│                          against the Supabase project before using the app
└── assets/
    └── logo.svg
```

## Decisions and why

- **Multi-page, not SPA.** Each screen is its own HTML file. No router, no framework, no build step. Matches current scope; adding a page means adding a file.
- **Tailwind via CDN script (play-cdn).** No build pipeline yet. When utility usage grows or arbitrary values pile up, swap to the Tailwind CLI with a compiled `styles.css` — the class names in the HTML don't change, only how the CSS is produced.
- **Chart.js via CDN (pinned version), UMD build.** Loaded as a classic `<script>` (not an ES module) alongside Tailwind, so the `Chart` global is available to page scripts. reports.html's revenue trend is live; the dashboard's mini chart is still visual-only — see "Deferred" below. Chosen over Apache ECharts (Apache 2.0, roughly 3x the bundle) and heavier options because the app needs one line chart, and Chart.js (MIT) is already loaded on both pages.
- **ES modules, no bundler.** `<script type="module">` + native `import`. Every JS file has one job (client, auth calls, one module per entity, form helpers). Supabase JS is loaded from a CDN ESM build in `supabase-client.js` only — one place to bump the version.
- **`auth.js` is the only file that calls `supabase.auth.*`.** Pages call `signIn()` / `signUp()` and handle the result; they never touch the Supabase client directly. Keeps the auth API swappable later without touching page markup.
- **One JS module per entity (`customers.js`, `charges.js`, `payments.js`, `transactions.js`, `profile.js`).** Same pattern as `auth.js` — pages import and call these, never `supabase.from(...)` directly. Matches the growth path this doc originally called for.
- **Two tables (`charges`, `payments`), not one.** Their required fields differ (device/duration vs. payment method) enough that a single table would need a pile of nullable columns. A `v_transactions` view unions them for the screens that show both mixed together.
- **Customer balance is computed, not stored.** `v_customer_balances` computes `sum(charges) − sum(payments)` on every read. A cached/denormalized balance column would need a trigger to stay correct and isn't worth it at this scale — revisit only if read volume makes the join too slow.
- **`config.js` isolated.** Keys live in one file so environment swapping (dev/staging project) is a one-file change. Anon key is safe client-side; access control is enforced by Supabase Row Level Security (every table's rows are scoped to `auth.uid()`), not by anything in this repo.

## Deferred (explicitly out of scope this phase)

- **"Charging Now" dashboard stat.** Removed. No screen anywhere has a start/stop-charging control, so there's no session concept to count — adding one would be inventing a feature, not wiring an existing one.
- **Dashboard revenue mini chart.** Still inert. The reports page now has the per-day aggregation it would need, but it isn't wired here.

## Reports definitions

- **Revenue** = sum of `payments.amount` received in the period (cash collected). The dashboard's "Total Revenue (Today)" still sums charges billed, so the two intentionally differ. **Total Charges** = number of charges billed in the period.
- **% change** compares against the immediately preceding period of equal length. If the previous period had no charges the badge shows "—" rather than an undefined percentage.
- **Ranges:** Last 7 days, Last 30 days, This month, all in the browser's local timezone with today included. Trend points are one per day.
- **Top Customers** are ranked by payments collected in the selected period; "View all" expands the preview (top 5) to the full ranked list.
- **Customer avatar upload, Custom charge duration, transaction filters/search, store-info edit modals.** All were already toast stubs before this phase and remain so — the underlying UI to edit them doesn't exist yet.

## Backend

Run `supabase/schema.sql` against the Supabase project referenced in `js/config.js` before using any page beyond login/signup — every data page now expects `customers`, `charges`, `payments`, `profiles`, and the two views to exist. RLS is enabled on every table with `auth.uid() = user_id` (or `= id` for `profiles`) policies; the views are declared `security_invoker = true` so they inherit those policies rather than running with the view owner's privileges.
