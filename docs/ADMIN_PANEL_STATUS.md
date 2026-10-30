# Admin panel and dashboard: what is complete and what is not

Honest status as of the last verification. "Local" means verified in a real browser and by automated tests against a
throwaway local database; nothing here has been verified against production.

## Complete (local)

Overview, Users, Astrology Tools (feature switches), Content & Banners (with draft preview), Reports (+CSV),
Settings & Audit Logs (read-only settings, audit log), plus the user dashboard (Home, My Astrology, My Inner Voice,
Devotion & Live, Profile & Settings).

## Partial

| Item | State | What is needed to finish |
|---|---|---|
| Independent switches for AI Guru / Know Your Karma / Sacred Shloka | One shared switch (`ai-chat`) because all three call the same generic `/api/ai/chat` endpoint | Separate endpoints (or a server-side feature tag the client cannot choose) per feature. A client-supplied tag would only look like enforcement |
| Inner Voice admin | Real usage and errors only | Server-side history does not exist; Karma Score, saved shlokas and AI Guru chats live in each user's browser |
| Devotion & Live admin | Live channel status (read-only) and catalogue counts | Bookings do not exist (see below) |
| Integrations | Configured / not configured, masked keys, real failure counts | Live provider test calls, which need credentials and have a cost |

## Not implemented (no data source exists)

| Feature | Why it cannot be finished by a code change alone |
|---|---|
| Shop cart, checkout, orders | There is no cart, order or inventory model. Needs a data model, business rules (stock, shipping, tax, cancellations) and a payment provider. Buttons are disabled with an honest note |
| Puja / chadhawa booking and "Proceed to Offer" | No booking model, no payment, no fulfilment workflow. Buttons are disabled with an honest note |
| Payments, plans, payment verification | No payment provider integrated. Needs provider account, server-side webhook with signature verification and idempotency, order linkage, refund policy |
| Darshan "Notify me when live" | No subscriber store and no notification channel. Button is disabled |
| General editable settings | The only settings are the feature switches. Needs product decisions about which settings should exist |
| Donations | No payment provider. Button is disabled |
| Account-level wishlist | Wishlist is now saved in the browser only (localStorage); an account wishlist needs a server model |

## Changed in this pass (to stop showing invented data)

- The Darshan "Prayer Wall" no longer starts with six fabricated prayers from invented devotees. It starts empty and says
  that prayers stay on the device. (They are still not shared or stored on the server.)
- The invented "N watching" viewer counts are removed from every Live Darshan / Family / Avatar Live page.
- Not changed, but worth knowing: the `/avatar-live` pages are built from static data in `frontend/src/data/liveStreams.ts`,
  including static "live" flags. Real live status exists only on the Darshan pages that use the API.

## Known limits (security)

- Access tokens are stateless and last 1 day. A deactivated account is refused immediately on the server that processed
  the deactivation, and within `ACCOUNT_STATUS_TTL_MS` (default 5 s) on other instances. Signing out in a browser does
  not invalidate a copied token.
- CORS: the backend allows any `localhost` / private-LAN origin in addition to the configured production origin. This is
  convenient for developing against a deployed backend but widens the allowed origins in production; tokens travel in
  headers (not cookies), so it is low risk. Restricting it would break local frontend development against the Render
  backend, so it was left for a decision. A refused origin now gets a 403 (it used to get a 500).

## Activity tracking (added with migration 20261030120000_add_activity_tracking)

One table (usage_events) records everything: feature.request (API calls and their result), feature.opened (a signed-in visitor opened a tool page, NOT proof it was used), auth.register, auth.login (method), auth.login_failed (reason), profile.updated (field names only). Metadata is sanitised (no tokens, passwords, keys, message content). Not tracked because there is nothing to track: saved/removed items (browser-only), orders, bookings, payments. AI Guru, Know Your Karma and Sacred Shloka share one API, so they appear together as ai-chat.

## AI cost tracking and provider balance (migration 20261031120000_add_ai_cost_tracking)

- Each feature request gets ONE usage_events row. If an AI provider was called, the row also stores provider, model, number of provider calls, input/output/total tokens, cost in USD and its basis. Capture wraps global fetch and the default axios instance once (utils/aiUsageCapture.ts), so route files are unchanged. Only response metadata is read; prompts and answers are never stored.
- Cost basis: "actual" = OpenRouter usage.cost (the capture adds usage: {include: true} to OpenRouter chat requests); "estimated" = tokens x a price from AI_PRICING_JSON. No built-in prices exist. No price or no token count means cost is NULL ("Not known"), never 0. A request with several provider calls is summed into one row; it is "actual" only if every costed call was actual.
- Non-AI requests, HTTP 304 and answers marked served-from-cache carry no AI cost. Failed requests keep only a cost the provider actually reported. Old rows stay NULL.
- Views: Customer activity (Provider / Model and Cost columns, provider and cost-type filters, row detail), Reports (Feature cost analytics, cost CSV), AI & integrations (Provider balance). All SUPERADMIN-only.
- Provider balance (official APIs only; page loads read a saved check, only Refresh contacts providers, at most once a minute): OpenRouter GET /api/v1/key gives key-level usage and remaining limit (works with the normal key; verified live read-only on the local stack); GET /api/v1/credits gives account credits but needs a separate management key (OPENROUTER_MANAGEMENT_KEY, not tested live). Groq: no balance API, key verified via GET /models. Sarvam: no balance API and no safe verification call; shown as key set, not verifiable. Balances are never derived from our own cost records.
- Limits: Groq and Sarvam costs are only estimated if you configure prices; Sarvam text-to-speech reports no tokens (counted as a call, cost not known); only fetch and axios calls to openrouter.ai, api.groq.com, api.sarvam.ai and generativelanguage.googleapis.com are captured (google responses are only counted if they use the chat-completions shape).

### Troubleshooting: Provider / Model and Cost show a dash
A dash means no AI provider call was recorded for that request. Verified causes, in order of likelihood:
1. The request failed before reaching a provider, for example the provider key is not set on THAT server (local test mode switches every provider off on purpose, so every AI request returns 503/500 and has no usage).
2. The backend process is older than this change. `npm run local:backend` does not auto-reload and a stale or orphaned process can keep serving the port; an old process records activity with no AI usage. Restart it.
3. The request was cached or answered with HTTP 304, or happened before tracking began (old rows are never back-filled).
Check AI & integrations > "AI usage capture status" (backend `GET /api/admin/costs/diagnostics`): it shows whether capture is installed, which provider keys this server has, and per feature how many requests had AI usage. Set `AI_USAGE_DEBUG=1` to also log one safe line per provider call (flags only, never prompts, keys or user content).
End-to-end proof: `npm run test:pipeline` starts the real server with a stubbed provider network and checks provider, model, tokens, cost, customer attribution and the Admin API for every AI route.
