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
