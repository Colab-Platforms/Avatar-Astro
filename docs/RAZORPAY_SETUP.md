# Razorpay Configuration (Checkpoint 3b)

How to configure the Razorpay wallet-recharge integration in each environment. **No real
credentials belong in this repo — ever.** Secrets go in the Render dashboard (backend) and the
local `backend/.env` only.

## Environment variables

### Backend (Render dashboard → Environment, and local `backend/.env`)

| Variable | What it is | Exposure |
|---|---|---|
| `RAZORPAY_KEY_ID` | Key id (`rzp_test_*` or `rzp_live_*`) | Sent to the frontend per-order to open Checkout — publishable by design |
| `RAZORPAY_KEY_SECRET` | API secret paired with the key id; also verifies the Checkout signature | **Backend only. Never in any VITE_ variable, log, or response.** |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you type when creating the webhook in the Razorpay dashboard; verifies `x-razorpay-signature` over the raw body | **Backend only.** |

Behavior when unset: recharge endpoints answer 503 ("top-ups not available") unless the mock
gateway is explicitly enabled (`ALLOW_MOCK_PAYMENTS=true` **and** `NODE_ENV` of
`development`/`test` — impossible in production by design). A missing `RAZORPAY_WEBHOOK_SECRET`
makes webhook verification fail **closed** (every delivery rejected 400) and logs a boot warning.

### Frontend (Vercel → Environment Variables)

| Variable | Value |
|---|---|
| `VITE_RAZORPAY_KEY_ID` | The same key **id** only. Optional fallback — the backend already returns the key id with each order. |

Never create `VITE_` variables for the key secret or webhook secret: anything `VITE_`-prefixed is
bundled into public JavaScript.

## Test mode vs live mode

- Test mode: `rzp_test_*` keys (Razorpay dashboard → toggle "Test Mode" → Settings → API Keys).
  Use these everywhere until go-live. Test cards/UPI: see Razorpay docs ("test card numbers").
- Live mode: `rzp_live_*` keys, generated after KYC/activation. Swap the three backend variables
  on Render and redeploy — no code change. The backend logs a warning at boot if a `rzp_test_*`
  key is seen while `NODE_ENV=production`.
- Keep test and live webhooks separate: one webhook per mode, each with its own secret.

## Webhook configuration (Razorpay dashboard → Settings → Webhooks)

- **URL**: `https://<your-render-backend-domain>/api/payments/razorpay/webhook`
- **Secret**: generate a long random string; set the same value as `RAZORPAY_WEBHOOK_SECRET` on Render.
- **Alert email**: your ops address.
- **Active events** (exactly these are handled; others are acknowledged and recorded):
  - `payment.captured` — credits the wallet (exactly once; safe in any order with the frontend confirm)
  - `payment.failed` — marks the order FAILED (a later capture still credits)
  - `refund.created` — records a `PaymentRefund` (ACTION_REQUIRED, no wallet change)
  - `refund.processed` — updates the recorded refund's provider status
  - `payment.dispute.created` — records a DISPUTE (ACTION_REQUIRED, no wallet change)

The webhook route is mounted **before** `express.json()` with a raw-body parser, because the
HMAC-SHA256 signature is computed over the exact raw bytes. Signature comparison is timing-safe.
Retries are harmless: event ids are deduplicated in `payment_webhook_events`, order crediting is
guarded by a row lock + the ledger's unique idempotency key (`razorpay_payment:<payment_id>`).

## Recovery and reconciliation

- Orders stuck in `CREATED` for 60+ minutes are swept daily (reconciliation job): the sweeper asks
  Razorpay for the order's payments first — a captured payment found there is credited (missed
  webhook + missed confirm recovered), otherwise the order is marked `EXPIRED`.
- Refunds/disputes are **never** auto-debited. They appear under the SUPERADMIN endpoint
  `GET /api/admin/refunds` (filter `?handling=ACTION_REQUIRED`) for human decision — the
  refund-of-spent-coins policy is an open business decision.

## Deployment order (when going live is approved)

1. Apply the schema to production Neon (`prisma db push` — adds `PaymentRefund`,
   `PaymentWebhookEvent`, `EXPIRED` enum value, unique provider ids; all additive).
2. Set the three `RAZORPAY_*` variables on Render (test keys first).
3. Deploy the backend; check boot logs for the Razorpay config lines.
4. Create the webhook in the Razorpay dashboard pointing at the deployed URL; send a test event.
5. Set `VITE_RAZORPAY_KEY_ID` on Vercel (optional) and deploy the frontend.
6. End-to-end test-mode purchase; verify the ledger row, then switch to live keys when approved.

## Rollback

Unset `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` on Render and redeploy → recharge endpoints return
503 immediately; nothing else (chat, wallet spending, admin) depends on Razorpay. Schema changes
are additive and can stay in place. Webhook deliveries fail signature verification closed (or can
be disabled in the Razorpay dashboard).
