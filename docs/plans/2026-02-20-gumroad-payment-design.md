# Gumroad Payment Integration Design

**Date:** 2026-02-20
**Status:** Approved
**Replaces:** PayPal payment integration (`api/paypal/`, `lib/paypal.ts`, `components/PayPalPaymentModal.tsx`)

---

## Background & Motivation

The existing PayPal integration has the following problems:

- Requires maintaining `create-order` and `capture-order` server-side logic
- PayPal has low conversion rates in Asian markets
- Frontend PayPal SDK is heavy and complex to configure
- Most critically: **the AI generation endpoints (`/api/generate-workflow`, `/api/generate-sop`) do not verify payment server-side** — payment is only enforced on the frontend, which is a security gap

This design replaces PayPal with Gumroad as the payment provider, using a feature-flagged dual-strategy approach to safely validate the implementation.

---

## Goals

1. Simplify the payment stack — fewer moving parts, less server-side logic to maintain
2. Fix the security gap: backend must verify a payment token before calling Claude
3. Support pay-per-use pricing: $0.99 for workflow generation, $0.49 × node count for SOP
4. Use a feature flag to safely A/B between two implementation strategies
5. Keep the PayPal code intact during the transition; delete it only after Gumroad is validated

---

## Pricing

| Action | Price |
|--------|-------|
| Generate Workflow | $0.99 (fixed) |
| Generate SOP | $0.49 × node count (variable) |

---

## Feature Flag

A single environment variable controls which strategy is active across both frontend and backend.

```bash
VITE_PAYMENT_STRATEGY=A   # 'A' or 'B'
```

```typescript
// lib/paymentStrategy.ts
export type PaymentStrategy = 'A' | 'B';
export const PAYMENT_STRATEGY: PaymentStrategy =
  (import.meta.env.VITE_PAYMENT_STRATEGY as PaymentStrategy) ?? 'A';
```

The goal is to **start with Strategy A**, validate it in production, and then:
- If A works: delete Strategy B code and the feature flag
- If A fails (e.g. postMessage does not include `license_key`): switch flag to B, validate, then delete Strategy A code

---

## Shared Abstraction

Both strategies implement a common interface so the rest of the app does not need to know which strategy is active.

```typescript
// lib/gumroadPayment.ts

export interface PaymentParams {
  type: 'workflow' | 'sop';
  nodeCount?: number; // required when type === 'sop'
}

export interface PaymentResult {
  payment_token: string; // one-time JWT, 15-minute TTL
}

export interface GumroadPaymentService {
  /**
   * Opens the Gumroad overlay, waits for the user to complete payment,
   * and returns a one-time payment_token to be passed to the AI endpoint.
   * Throws if payment fails or is cancelled.
   */
  pay(params: PaymentParams): Promise<PaymentResult>;
}

export function createPaymentService(strategy: PaymentStrategy): GumroadPaymentService {
  if (strategy === 'A') return new StrategyAService();
  return new StrategyBService();
}
```

The `payment_token` is a short-lived JWT issued by the backend after payment is confirmed. It is passed as a header to `/api/generate-workflow` and `/api/generate-sop`. The backend validates the token before calling Claude. This closes the existing security gap.

---

## Gumroad Products

Two products must be created in the Gumroad dashboard.

### Product 1: Workflow Generation

| Field | Value |
|-------|-------|
| Name | Generate Workflow |
| Price | $0.99 (fixed) |
| Type | Digital Product |
| Custom Fields | `Session ID` (required) |

### Product 2: SOP Generation

| Field | Value |
|-------|-------|
| Name | Generate SOP |
| Price | $0.49+ (Pay What You Want, minimum $0.49) |
| Type | Digital Product |
| Custom Fields | `Session ID` (required) |

The `Session ID` custom field is included in both products. For Strategy A it is not strictly required, but it is included so that both products are symmetrical and Strategy B can be activated without reconfiguring Gumroad.

Dynamic pricing for SOP is passed via the URL parameter `?price=N` where N is cents (integer). Example: 8 nodes × $0.49 = $3.92 → `?price=392`. Gumroad pre-fills this value in the PWYW checkout.

---

## Environment Variables

### Frontend (`.env.local` / Vercel environment)

| Variable | Description |
|----------|-------------|
| `VITE_PAYMENT_STRATEGY` | `'A'` or `'B'`. Defaults to `'A'` if not set. |
| `VITE_GUMROAD_WORKFLOW_PRODUCT_ID` | Gumroad product permalink slug for workflow product |
| `VITE_GUMROAD_SOP_PRODUCT_ID` | Gumroad product permalink slug for SOP product |

### Backend (Vercel environment, server-side only)

| Variable | Description |
|----------|-------------|
| `GUMROAD_PRODUCT_WORKFLOW_ID` | Product ID for server-side verification (same value as frontend permalink) |
| `GUMROAD_PRODUCT_SOP_ID` | Product ID for server-side verification |
| `GUMROAD_SECRET` | Used for HMAC signature verification of webhook payloads (Strategy B only) |
| `PAYMENT_TOKEN_SECRET` | Secret key for signing one-time payment JWTs |
| `GUMROAD_TEST_MODE` | `'true'` to enable mock responses in development |

---

## Strategy A: postMessage + License Key Verification

### How It Works

When a user completes a Gumroad purchase inside the overlay, Gumroad fires a `window.postMessage` event to the parent page. The event data includes `post_message_name: 'sale'` and — based on available evidence — the `license_key` issued for the purchase. Strategy A uses this license key to verify payment server-side without requiring a webhook.

### Data Flow

```
Frontend                          Backend                        Gumroad
   │                                 │                               │
   │  1. User clicks "Generate"       │                               │
   │     Compute expected_cents       │                               │
   │     Open Gumroad overlay:        │                               │
   │     ?wanted=true                 │                               │
   │     &price=CENTS                 │                               │
   │     &Session%20ID=CLIENT_UUID    │                               │
   │ ────────────────────────────────────────────────────────────►   │
   │                                 │           User pays            │
   │◄──────────────────────────────────────────────────────────────  │
   │  2. postMessage fires            │                               │
   │     { post_message_name: 'sale'  │                               │
   │       license_key: 'XXXX-...',   │                               │
   │       price: 99 }                │                               │
   │                                 │                               │
   │  3. POST /api/gumroad/           │                               │
   │     verify-license               │                               │
   │     { license_key,               │                               │
   │       product_type,              │                               │
   │       expected_cents } ─────────►│                               │
   │                                 │  4. POST api.gumroad.com/     │
   │                                 │     v2/licenses/verify ───────►│
   │                                 │◄────────────────────────────  │
   │                                 │     { success: true,          │
   │                                 │       purchase: {             │
   │                                 │         price: 99,            │
   │                                 │         refunded: false,      │
   │                                 │         sale_id: '...' } }    │
   │                                 │                               │
   │                                 │  5. Validate:                 │
   │                                 │     - price >= expected_cents │
   │                                 │     - refunded === false      │
   │                                 │     - INSERT used_license_keys│
   │                                 │       (fails if duplicate)    │
   │                                 │     - Issue payment_token JWT │
   │                                 │                               │
   │◄── { payment_token } ───────────│                               │
   │                                 │                               │
   │  6. POST /api/generate-workflow  │                               │
   │     { prompt,                    │                               │
   │       payment_token } ──────────►│                               │
   │                                 │  7. Verify JWT, mark used     │
   │                                 │     Call Claude API           │
   │◄── { workflow } ────────────────│                               │
```

### Known Risk

The fields included in the Gumroad postMessage payload are not fully documented by Gumroad. The presence of `license_key` in the postMessage data is inferred from community reports and the Gumroad overlay blog post, but has not been officially confirmed. **If `license_key` is absent from the postMessage data, Strategy A cannot work and the flag must be switched to B.**

Detection: during the first few real purchases with Strategy A, log the full postMessage payload to the server. If `license_key` is missing, the strategy will return an error and the flag can be switched without data loss.

### Backend Endpoint

**`POST /api/gumroad/verify-license`**

Request body:
```json
{
  "license_key": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "product_type": "workflow",
  "expected_cents": 99
}
```

Logic:
1. Call `POST https://api.gumroad.com/v2/licenses/verify` with `product_id` and `license_key`
2. Check `response.success === true`
3. Check `response.purchase.refunded === false`
4. Check `response.purchase.price >= expected_cents` (prevent underpayment)
5. `INSERT INTO used_license_keys` — if the key is already in the table, return 409 (already used)
6. Issue and return a `payment_token` JWT signed with `PAYMENT_TOKEN_SECRET`, TTL 15 minutes, payload `{ type, used: false }`

Response:
```json
{ "payment_token": "<jwt>" }
```

---

## Strategy B: postMessage Trigger + Webhook Confirmation

### How It Works

The frontend creates a `payment_session` in the backend before opening the overlay. The Gumroad overlay receives the `session_id` as a custom field pre-fill in the URL. When the user completes payment, Gumroad sends a webhook to the backend, which marks the session as paid. Simultaneously, the overlay fires a postMessage to the frontend, which begins polling the backend for the session status.

### Data Flow

```
Frontend                          Backend                        Gumroad
   │                                 │                               │
   │  1. POST /api/gumroad/           │                               │
   │     create-session               │                               │
   │     { product_type,              │                               │
   │       expected_cents } ─────────►│                               │
   │                                 │  INSERT payment_sessions      │
   │                                 │  status='pending'             │
   │◄── { session_id } ──────────────│                               │
   │                                 │                               │
   │  2. Open Gumroad overlay:        │                               │
   │     ?wanted=true                 │                               │
   │     &price=CENTS                 │                               │
   │     &Session%20ID=SESSION_ID ───────────────────────────────►   │
   │                                 │           User pays            │
   │                                 │◄─────────────────────────────  │
   │                                 │  3. POST /api/gumroad/webhook  │
   │                                 │     (form-urlencoded)          │
   │                                 │     req.body['Session ID']     │
   │                                 │     = SESSION_ID               │
   │                                 │     price, license_key,        │
   │                                 │     sale_id, resource_name     │
   │                                 │                               │
   │                                 │  4. Verify HMAC signature      │
   │                                 │     (x-gumroad-signature)      │
   │                                 │     Compare price vs           │
   │                                 │     expected_cents             │
   │                                 │     UPDATE payment_sessions    │
   │                                 │     status='paid'              │
   │                                 │     Issue payment_token JWT    │
   │                                 │     Respond 200 immediately    │
   │                                 │                               │
   │◄─────────────────────────────────────────────────────────────  │
   │  5. postMessage fires            │                               │
   │     { post_message_name: 'sale' }│                               │
   │     Start polling ──────────────►│                               │
   │                                 │                               │
   │  6. GET /api/gumroad/            │                               │
   │     check-session                │                               │
   │     ?id=SESSION_ID  ────────────►│                               │
   │     (every 1s, max 30s)          │  SELECT FROM payment_sessions │
   │◄── { status: 'paid',            │                               │
   │      payment_token } ───────────│                               │
   │                                 │                               │
   │  7. POST /api/generate-workflow  │                               │
   │     { prompt,                    │                               │
   │       payment_token } ──────────►│                               │
   │                                 │  Verify JWT, mark used        │
   │                                 │  Call Claude API              │
   │◄── { workflow } ────────────────│                               │
```

### Backend Endpoints

**`POST /api/gumroad/create-session`**

Request body:
```json
{
  "product_type": "workflow",
  "expected_cents": 99
}
```

Logic:
1. Generate `session_id` (UUID)
2. `INSERT INTO payment_sessions` with `status='pending'`, `expected_cents`, `expires_at = NOW() + 15 minutes`
3. Return `{ session_id }`

---

**`POST /api/gumroad/webhook`**

Headers to check: `x-gumroad-signature` (HMAC-SHA256 of raw body with `GUMROAD_SECRET`)

Gumroad sends the body as `application/x-www-form-urlencoded`. Key fields:

```
resource_name = 'sale'
'Session ID'  = <session_id>
price         = <integer, cents>
license_key   = <string>
sale_id       = <string>
refunded      = 'false'
```

Logic:
1. Verify HMAC signature — return 200 immediately if signature is invalid (to avoid Gumroad retries revealing failure)
2. Only process `resource_name === 'sale'`
3. Look up `session_id` from `req.body['Session ID']`
4. Check `payment_sessions.status === 'pending'` and `NOT expired`
5. Check `price >= expected_cents`
6. Check `refunded === 'false'`
7. Issue `payment_token` JWT
8. `UPDATE payment_sessions SET status='paid', sale_id=..., amount_paid=..., payment_token=...`
9. Return HTTP 200 immediately (Gumroad requires this)

---

**`GET /api/gumroad/check-session`**

Query param: `?id=SESSION_ID`

Logic:
1. Look up session by `session_id`
2. If `status === 'paid'` → return `{ status: 'paid', payment_token }`
3. If `status === 'pending'` and not expired → return `{ status: 'pending' }`
4. If expired → return `{ status: 'expired' }`

The frontend polls this endpoint every 1 second after receiving the postMessage. Maximum polling duration is 30 seconds, after which the UI shows a "Payment confirmation in progress — please try again shortly" message.

---

## Shared: payment_token Validation in AI Endpoints

Both strategies issue a `payment_token` JWT. The existing `/api/generate-workflow` and `/api/generate-sop` must be updated to validate this token before calling Claude.

**Token payload:**
```json
{
  "type": "workflow",
  "node_count": null,
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Validation logic (shared utility):**
```typescript
// api/_utils/paymentToken.ts
export function verifyPaymentToken(token: string, expectedType: string): boolean {
  // 1. Verify JWT signature with PAYMENT_TOKEN_SECRET
  // 2. Check expiry
  // 3. Check payload.type matches expectedType
  // 4. Mark token as used in DB to prevent replay
  // Returns true if valid and not yet used
}
```

The token is passed in the `X-Payment-Token` request header:
```
POST /api/generate-workflow
X-Payment-Token: <jwt>
```

---

## Database Schema

```sql
-- Migration: 004_gumroad_payment.sql

-- Strategy A: track used license keys to prevent replay
CREATE TABLE used_license_keys (
  license_key   TEXT PRIMARY KEY,
  product_type  TEXT NOT NULL CHECK (product_type IN ('workflow', 'sop')),
  amount_paid   INTEGER NOT NULL, -- cents
  sale_id       TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Strategy B: short-lived payment sessions
CREATE TABLE payment_sessions (
  session_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'used', 'expired')),
  product_type    TEXT NOT NULL CHECK (product_type IN ('workflow', 'sop')),
  expected_cents  INTEGER NOT NULL,
  sale_id         TEXT UNIQUE,          -- populated by webhook
  amount_paid     INTEGER,              -- populated by webhook
  payment_token   TEXT,                 -- populated after webhook validates
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes'
);

-- Shared: track payment_token usage to prevent replay
CREATE TABLE used_payment_tokens (
  token_jti    TEXT PRIMARY KEY,  -- JWT ID claim
  product_type TEXT NOT NULL,
  used_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX idx_payment_sessions_expires_at ON payment_sessions(expires_at);

-- Cleanup job: expire stale sessions (run via pg_cron or Supabase scheduled function)
-- DELETE FROM payment_sessions WHERE expires_at < NOW() AND status = 'pending';
```

---

## Error Handling

### User-Facing Error States

| Situation | UI Message |
|-----------|------------|
| Overlay closed without paying | Reset button to "Generate" state silently |
| postMessage missing `license_key` (Strategy A) | "Verification failed. Please contact support." + log full payload |
| License key already used | "This key has already been used. Please purchase again." |
| Amount paid is less than expected | "Payment amount does not match. Please contact support." |
| Gumroad verify API unreachable | "Could not verify payment. Please try again." |
| Polling timeout after 30s (Strategy B) | "Payment confirmed, but activation is taking longer than expected. Please try again in a moment." |
| Webhook never arrives (Strategy B) | Same as polling timeout — Gumroad retries for ~15 min |
| `payment_token` expired | "Your payment session expired. Please generate again." |
| `payment_token` already used | "This session was already used. Please generate again." |
| AI call fails after valid payment | Return 503 and do NOT mark `payment_token` as used, allowing one retry |

### Race Condition: User Closes Page After Paying

If the user pays in the overlay but closes the browser before the `payment_token` is used:

- **Strategy A**: The `license_key` has not been inserted into `used_license_keys`, so the user can re-open the app and pay again. The old license key cannot be reused because it was never recorded (it will be accepted if entered manually). For MVP this is acceptable — amounts are small and one key maps to one legitimate purchase.
- **Strategy B**: The `payment_session` exists in the DB with `status='paid'` and a `payment_token`, but the token was never used. The `session_id` is stored only in the frontend's React state (not persisted to localStorage). The user cannot recover the session on page reload. Acceptable for MVP — they must purchase again.

Neither strategy attempts to recover interrupted sessions. The rationale: transaction values are low ($0.99–$5), and the complexity of a recovery flow (e.g., per-user pending sessions) outweighs the benefit.

---

## Testing Strategy

Gumroad has no sandbox environment. Use the following approach:

### Development (local)

Set `GUMROAD_TEST_MODE=true`. In this mode:

- **Strategy A**: `/api/gumroad/verify-license` returns a mock success response without calling the Gumroad API
- **Strategy B**: An additional development-only endpoint `POST /api/gumroad/dev-trigger?session_id=X` simulates a webhook by directly updating the session to `paid`. This endpoint must not be deployed to production (guarded by `GUMROAD_TEST_MODE` check).

### Staging / First Real Test

Create a Gumroad product priced at $0.01 to test the full payment flow end-to-end with a real charge. Verify:
1. Overlay opens correctly
2. postMessage fires on purchase
3. Strategy A: `license_key` is present in postMessage data (the key validation point)
4. Strategy B: Webhook arrives with correct `Session ID` custom field
5. `payment_token` is issued and accepted by AI endpoints

### Production Validation of Strategy A

After the first 5–10 real purchases with Strategy A active:
- Check backend logs for postMessage payload structure
- Confirm `license_key` is consistently present
- If confirmed → proceed to clean up Strategy B code

---

## Files to Create

```
lib/paymentStrategy.ts
lib/gumroadPayment.ts
lib/gumroadStrategyA.ts
lib/gumroadStrategyB.ts
components/GumroadPaymentModal.tsx
api/gumroad/verify-license.ts       (Strategy A)
api/gumroad/create-session.ts       (Strategy B)
api/gumroad/webhook.ts              (Strategy B)
api/gumroad/check-session.ts        (Strategy B)
api/_utils/paymentToken.ts          (Shared)
supabase/migrations/004_gumroad_payment.sql
```

## Files to Modify

```
api/generate-workflow.ts   — add payment_token validation
api/generate-sop.ts        — add payment_token validation
App.tsx                    — replace PayPalPaymentModal with GumroadPaymentModal
```

## Files to Delete (after Gumroad is validated)

```
api/paypal/create-order.ts
api/paypal/capture-order.ts
api/_utils/paypal.ts
lib/paypal.ts
components/PayPalPaymentModal.tsx
```

Note: The `transactions` table's `stripe_payment_id` column is a legacy artifact (likely renamed from an earlier Stripe draft). It can be renamed to `payment_reference` in a future migration or left as-is since it is nullable and not actively used.

---

## Open Questions (to resolve during implementation)

1. **Does Gumroad postMessage include `license_key`?** — Cannot be answered without a real purchase. This is the critical unknown that determines whether Strategy A is viable. Log the full postMessage payload on the first test purchase.

2. **Does Gumroad enforce the `price` minimum server-side for PWYW?** — Research says yes ($0.49 minimum for SOP product), but confirm during testing that a user cannot pay $0.01 for a $3.92 SOP.

3. **HMAC secret location** — The `GUMROAD_SECRET` for Strategy B HMAC verification must be set in Gumroad's dashboard under Webhooks settings. Confirm that Gumroad exposes this secret in the current dashboard UI.
