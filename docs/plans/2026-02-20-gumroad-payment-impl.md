# Gumroad Payment Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing PayPal payment system with a Gumroad-based pay-per-use flow, using a feature flag to switch between Strategy A (postMessage + license verify) and Strategy B (webhook + polling).

**Architecture:** The frontend opens a Gumroad overlay, and after the user pays, the backend issues a one-time `payment_token` (UUID stored in DB). This token is passed to the AI generation endpoints, which validate it before calling Claude. Both strategies share this token mechanism — they differ only in *how* payment completion is detected.

**Tech Stack:** React 19 + TypeScript + Vite (frontend), Vercel serverless functions (backend), Supabase PostgreSQL (DB), Node.js `crypto` (HMAC), Gumroad API.

**Design document:** `docs/plans/2026-02-20-gumroad-payment-design.md`

---

## Important Notes Before Starting

### Import paths
All backend files in `api/` use `.js` extensions in import statements even though the source files are `.ts`. Example:
```typescript
import { createSupabaseAdmin } from '../_utils/supabase.js'; // correct
import { createSupabaseAdmin } from '../_utils/supabase';    // WRONG
```

### No test framework
This project has no automated test runner. Each task includes manual verification using `curl` commands. Run them in a terminal with the dev server running (`npm run dev`).

### Test mode
Set `GUMROAD_TEST_MODE=true` in `.env.local` during development to skip real Gumroad API calls. All backend endpoints check this flag.

### Supabase migrations
Migrations live in `supabase/migrations/` which is in `.gitignore`. They must be applied manually via the Supabase dashboard SQL editor (Project → SQL editor → paste and run). Do not try to run them with the Supabase CLI unless it's already configured.

### Feature flag
`VITE_PAYMENT_STRATEGY=A` in `.env.local` activates Strategy A. Change to `B` for Strategy B. Defaults to `A` if not set.

---

## Task 1: DB Migration — Gumroad Payment Tables

**Files:**
- Create: `supabase/migrations/004_gumroad_payment.sql`

### Step 1: Create the migration file

```sql
-- supabase/migrations/004_gumroad_payment.sql

-- Strategy A: track used license keys to prevent replay attacks
CREATE TABLE IF NOT EXISTS used_license_keys (
  license_key   TEXT PRIMARY KEY,
  product_type  TEXT NOT NULL CHECK (product_type IN ('workflow', 'sop')),
  amount_paid   INTEGER NOT NULL, -- in cents
  sale_id       TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Strategy B: short-lived payment sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
  session_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'used', 'expired')),
  product_type    TEXT NOT NULL CHECK (product_type IN ('workflow', 'sop')),
  expected_cents  INTEGER NOT NULL,
  sale_id         TEXT UNIQUE,       -- populated by webhook
  amount_paid     INTEGER,           -- populated by webhook (cents)
  payment_token   TEXT,              -- UUID, populated after webhook validates
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes'
);

-- Shared: prevent payment_token replay across both strategies
CREATE TABLE IF NOT EXISTS used_payment_tokens (
  payment_token TEXT PRIMARY KEY,    -- UUID
  product_type  TEXT NOT NULL,
  node_count    INTEGER,             -- only for sop type
  used_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status
  ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_expires_at
  ON payment_sessions(expires_at);

-- RLS: these tables are backend-only (service role only)
ALTER TABLE used_license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_payment_tokens ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies — all access is via service role key in backend
```

### Step 2: Apply the migration

1. Open the Supabase dashboard for this project
2. Go to **SQL editor**
3. Paste the full SQL above and click **Run**
4. Verify all three tables appear in **Table Editor**: `used_license_keys`, `payment_sessions`, `used_payment_tokens`

### Step 3: Commit

```bash
git add supabase/migrations/004_gumroad_payment.sql
git commit -m "feat: add gumroad payment tables migration"
```

---

## Task 2: payment_token Utility (Shared by A and B)

**Files:**
- Create: `api/_utils/paymentToken.ts`

This utility issues a UUID-based one-time token and validates it. No JWT library needed — the token is a UUID stored in the `used_payment_tokens` table.

### Step 1: Create the file

```typescript
// api/_utils/paymentToken.ts
import { createSupabaseAdmin } from './supabase.js';

export interface TokenPayload {
  payment_token: string; // UUID
  product_type: 'workflow' | 'sop';
  node_count?: number;
}

/**
 * Issues a new one-time payment_token and stores it in used_payment_tokens
 * as "issued but not consumed". The token is consumed when the AI endpoint
 * calls consumePaymentToken().
 *
 * Note: we insert a row now with used_at=NULL so the token exists in the DB.
 * consumePaymentToken() sets used_at to NOW() and rejects already-consumed tokens.
 */
export async function issuePaymentToken(
  productType: 'workflow' | 'sop',
  nodeCount?: number
): Promise<string> {
  const supabase = createSupabaseAdmin();

  // Generate a random UUID as the token
  const token = crypto.randomUUID();

  // Insert with used_at = NULL (not yet consumed)
  const { error } = await supabase
    .from('used_payment_tokens')
    .insert({
      payment_token: token,
      product_type: productType,
      node_count: nodeCount ?? null,
      used_at: null,
    });

  if (error) {
    throw new Error(`Failed to issue payment token: ${error.message}`);
  }

  return token;
}

/**
 * Validates and consumes a payment_token.
 * - Checks the token exists in DB
 * - Checks it has not been consumed (used_at IS NULL)
 * - Checks product_type matches
 * - Sets used_at = NOW() atomically
 *
 * Returns the token payload if valid, throws if invalid.
 */
export async function consumePaymentToken(
  token: string,
  expectedProductType: 'workflow' | 'sop'
): Promise<TokenPayload> {
  if (!token) throw new Error('Missing payment_token');

  const supabase = createSupabaseAdmin();

  // Fetch the token row
  const { data, error } = await supabase
    .from('used_payment_tokens')
    .select('payment_token, product_type, node_count, used_at')
    .eq('payment_token', token)
    .single();

  if (error || !data) {
    throw new Error('Invalid payment token');
  }

  if (data.used_at !== null) {
    throw new Error('Payment token already used');
  }

  if (data.product_type !== expectedProductType) {
    throw new Error('Payment token type mismatch');
  }

  // Mark as consumed
  const { error: updateError } = await supabase
    .from('used_payment_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('payment_token', token)
    .is('used_at', null); // guard against race condition

  if (updateError) {
    throw new Error('Failed to consume payment token');
  }

  return {
    payment_token: token,
    product_type: data.product_type as 'workflow' | 'sop',
    node_count: data.node_count ?? undefined,
  };
}
```

### Step 2: Update DB schema to allow NULL used_at

The migration in Task 1 already uses `used_at TIMESTAMPTZ DEFAULT NOW()`. We need `used_at` to be nullable. Go back to the Supabase SQL editor and run:

```sql
ALTER TABLE used_payment_tokens
  ALTER COLUMN used_at DROP NOT NULL,
  ALTER COLUMN used_at DROP DEFAULT;
```

### Step 3: Manual verification (after Task 3 is done)

You cannot test this file in isolation — verification happens as part of Task 3 and later tasks.

### Step 4: Commit

```bash
git add api/_utils/paymentToken.ts
git commit -m "feat: add payment_token issue/consume utility"
```

---

## Task 3: Strategy A Backend — `/api/gumroad/verify-license.ts`

**Files:**
- Create: `api/gumroad/verify-license.ts`

This endpoint is called by the frontend after it receives the Gumroad postMessage with a `license_key`. It verifies the key against the Gumroad API, checks the amount, records the key as used, and issues a `payment_token`.

### Step 1: Create the file

```typescript
// api/gumroad/verify-license.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin } from '../_utils/supabase.js';
import { issuePaymentToken } from '../_utils/paymentToken.js';
import { logEvent } from '../_utils/logger.js';

const isTestMode = process.env.GUMROAD_TEST_MODE === 'true';

const PRODUCT_IDS: Record<string, string> = {
  workflow: process.env.GUMROAD_PRODUCT_WORKFLOW_ID || '',
  sop: process.env.GUMROAD_PRODUCT_SOP_ID || '',
};

interface GumroadVerifyResponse {
  success: boolean;
  uses?: number;
  purchase?: {
    price: number;        // in cents
    refunded: boolean;
    disputed: boolean;
    sale_id: string;
    test?: boolean;
  };
  message?: string;
}

async function verifyGumroadLicense(
  productId: string,
  licenseKey: string
): Promise<GumroadVerifyResponse> {
  // In test mode, return a mock success
  if (isTestMode) {
    return {
      success: true,
      uses: 1,
      purchase: {
        price: 99,
        refunded: false,
        disputed: false,
        sale_id: `test-sale-${Date.now()}`,
        test: true,
      },
    };
  }

  const body = new URLSearchParams({
    product_id: productId,
    license_key: licenseKey,
    increment_uses_count: 'false', // we handle deduplication ourselves
  });

  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return response.json() as Promise<GumroadVerifyResponse>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    license_key,
    product_type,
    expected_cents,
  }: {
    license_key?: string;
    product_type?: 'workflow' | 'sop';
    expected_cents?: number;
  } = req.body;

  // Input validation
  if (!license_key || typeof license_key !== 'string') {
    return res.status(400).json({ error: 'Missing license_key' });
  }
  if (!product_type || !['workflow', 'sop'].includes(product_type)) {
    return res.status(400).json({ error: 'Invalid product_type' });
  }
  if (!expected_cents || typeof expected_cents !== 'number' || expected_cents < 1) {
    return res.status(400).json({ error: 'Invalid expected_cents' });
  }

  const productId = PRODUCT_IDS[product_type];
  if (!productId && !isTestMode) {
    console.error(`GUMROAD_PRODUCT_${product_type.toUpperCase()}_ID is not set`);
    return res.status(500).json({ error: 'Payment provider not configured' });
  }

  const ip = req.headers['x-forwarded-for'] as string;

  try {
    // 1. Verify with Gumroad API
    const gumroadResult = await verifyGumroadLicense(productId, license_key);

    if (!gumroadResult.success) {
      await logEvent('webhook', {
        event: 'license_verify_failed',
        license_key: license_key.slice(0, 8) + '...',
        reason: gumroadResult.message,
      }, undefined, ip);
      return res.status(402).json({ error: 'License key is invalid or not found' });
    }

    const purchase = gumroadResult.purchase!;

    // 2. Check not refunded or disputed
    if (purchase.refunded || purchase.disputed) {
      return res.status(402).json({ error: 'This purchase has been refunded or disputed' });
    }

    // 3. Check amount paid is sufficient (Gumroad price is in cents)
    if (purchase.price < expected_cents) {
      await logEvent('webhook', {
        event: 'license_underpaid',
        paid: purchase.price,
        expected: expected_cents,
      }, undefined, ip);
      return res.status(402).json({ error: 'Payment amount does not match' });
    }

    // 4. Record the license key as used (prevent replay)
    const supabase = createSupabaseAdmin();
    const { error: insertError } = await supabase
      .from('used_license_keys')
      .insert({
        license_key,
        product_type,
        amount_paid: purchase.price,
        sale_id: purchase.sale_id,
      });

    if (insertError) {
      // Primary key conflict = already used
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'This license key has already been used' });
      }
      throw insertError;
    }

    // 5. Issue a one-time payment_token
    const paymentToken = await issuePaymentToken(product_type);

    await logEvent('webhook', {
      event: 'license_verify_success',
      product_type,
      sale_id: purchase.sale_id,
      amount_paid: purchase.price,
    }, undefined, ip);

    return res.status(200).json({ payment_token: paymentToken });

  } catch (error) {
    console.error('verify-license error:', error);
    await logEvent('error', {
      context: 'gumroad_verify_license',
      error: String(error),
    }, undefined, ip);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}
```

### Step 2: Manual verification

Start the dev server (`npm run dev`) and run:

```bash
# Test mode must be on in .env.local: GUMROAD_TEST_MODE=true

# Should return { payment_token: "<uuid>" }
curl -X POST http://localhost:3000/api/gumroad/verify-license \
  -H "Content-Type: application/json" \
  -d '{"license_key":"test-key-123","product_type":"workflow","expected_cents":99}'

# Should return 400
curl -X POST http://localhost:3000/api/gumroad/verify-license \
  -H "Content-Type: application/json" \
  -d '{"product_type":"workflow","expected_cents":99}'
```

Expected first response: `{ "payment_token": "<uuid-string>" }`
Check Supabase: `used_license_keys` should have a row, `used_payment_tokens` should have a row with `used_at = null`.

### Step 3: Commit

```bash
git add api/gumroad/verify-license.ts
git commit -m "feat: add gumroad verify-license endpoint (strategy A)"
```

---

## Task 4: Strategy B Backend — `/api/gumroad/create-session.ts`

**Files:**
- Create: `api/gumroad/create-session.ts`

Called by the frontend before opening the overlay. Creates a pending session in DB and returns the `session_id` to embed in the Gumroad URL.

### Step 1: Create the file

```typescript
// api/gumroad/create-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin } from '../_utils/supabase.js';
import { logEvent } from '../_utils/logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    product_type,
    expected_cents,
  }: {
    product_type?: 'workflow' | 'sop';
    expected_cents?: number;
  } = req.body;

  if (!product_type || !['workflow', 'sop'].includes(product_type)) {
    return res.status(400).json({ error: 'Invalid product_type' });
  }
  if (!expected_cents || typeof expected_cents !== 'number' || expected_cents < 1) {
    return res.status(400).json({ error: 'Invalid expected_cents' });
  }

  const ip = req.headers['x-forwarded-for'] as string;

  try {
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from('payment_sessions')
      .insert({
        product_type,
        expected_cents,
        status: 'pending',
        // expires_at defaults to NOW() + 15 minutes via DB default
      })
      .select('session_id')
      .single();

    if (error || !data) {
      throw error ?? new Error('Failed to create session');
    }

    await logEvent('webhook', {
      event: 'session_created',
      session_id: data.session_id,
      product_type,
      expected_cents,
    }, undefined, ip);

    return res.status(200).json({ session_id: data.session_id });

  } catch (error) {
    console.error('create-session error:', error);
    await logEvent('error', {
      context: 'gumroad_create_session',
      error: String(error),
    }, undefined, ip);
    return res.status(500).json({ error: 'Failed to create payment session' });
  }
}
```

### Step 2: Manual verification

```bash
# Should return { session_id: "<uuid>" }
curl -X POST http://localhost:3000/api/gumroad/create-session \
  -H "Content-Type: application/json" \
  -d '{"product_type":"workflow","expected_cents":99}'
```

Expected: `{ "session_id": "<uuid>" }`
Check Supabase: `payment_sessions` row with `status = 'pending'`.

### Step 3: Commit

```bash
git add api/gumroad/create-session.ts
git commit -m "feat: add gumroad create-session endpoint (strategy B)"
```

---

## Task 5: Strategy B Backend — `/api/gumroad/webhook.ts`

**Files:**
- Create: `api/gumroad/webhook.ts`

Receives Gumroad's POST webhook. Body is `application/x-www-form-urlencoded`. Must verify HMAC signature. Updates the matching session to `paid` and issues a `payment_token`.

### Step 1: Create the file

```typescript
// api/gumroad/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';
import { createSupabaseAdmin } from '../_utils/supabase.js';
import { issuePaymentToken } from '../_utils/paymentToken.js';
import { logEvent } from '../_utils/logger.js';

// Disable Vercel's automatic body parsing so we can read the raw body
// for HMAC verification.
export const config = {
  api: { bodyParser: false },
};

const isTestMode = process.env.GUMROAD_TEST_MODE === 'true';

/** Read the raw body as a string from the request stream. */
async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** Parse application/x-www-form-urlencoded into a plain object. */
function parseFormBody(raw: string): Record<string, string> {
  const params = new URLSearchParams(raw);
  const result: Record<string, string> = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}

/** Verify the x-gumroad-signature HMAC-SHA256 header. */
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Always respond 200 quickly to Gumroad to prevent retries on logic errors
  // (we do this at the end, but on signature failure we return 200 silently)
  const rawBody = await getRawBody(req);
  const body = parseFormBody(rawBody);

  // 1. Verify HMAC signature (skip in test mode)
  if (!isTestMode) {
    const secret = process.env.GUMROAD_SECRET;
    const signature = req.headers['x-gumroad-signature'] as string;

    if (!secret) {
      console.error('GUMROAD_SECRET is not set');
      return res.status(200).end(); // return 200 to avoid Gumroad retries
    }

    if (!signature || !verifySignature(rawBody, signature, secret)) {
      await logEvent('webhook', { event: 'invalid_signature' });
      return res.status(200).end(); // silent 200 — do not reveal failure to attacker
    }
  }

  // 2. Only process 'sale' events
  if (body.resource_name !== 'sale') {
    return res.status(200).end();
  }

  const sessionId = body['Session ID'];
  const priceStr = body.price;
  const licenseKey = body.license_key;
  const saleId = body.sale_id;
  const refunded = body.refunded === 'true';
  const disputed = body.disputed === 'true';

  if (!sessionId) {
    await logEvent('webhook', {
      event: 'missing_session_id',
      sale_id: saleId,
    });
    return res.status(200).end();
  }

  const pricePaid = parseInt(priceStr, 10);
  const ip = req.headers['x-forwarded-for'] as string;

  const supabase = createSupabaseAdmin();

  try {
    // 3. Fetch the session
    const { data: session, error: fetchError } = await supabase
      .from('payment_sessions')
      .select('session_id, status, expected_cents, expires_at, product_type')
      .eq('session_id', sessionId)
      .single();

    if (fetchError || !session) {
      await logEvent('webhook', {
        event: 'session_not_found',
        session_id: sessionId,
      }, undefined, ip);
      return res.status(200).end();
    }

    // 4. Check session is still valid
    if (session.status !== 'pending') {
      await logEvent('webhook', {
        event: 'session_already_processed',
        session_id: sessionId,
        status: session.status,
      }, undefined, ip);
      return res.status(200).end();
    }

    if (new Date() > new Date(session.expires_at)) {
      await supabase
        .from('payment_sessions')
        .update({ status: 'expired' })
        .eq('session_id', sessionId);
      return res.status(200).end();
    }

    // 5. Check not refunded or disputed
    if (refunded || disputed) {
      await logEvent('webhook', {
        event: 'sale_refunded_or_disputed',
        session_id: sessionId,
        sale_id: saleId,
      }, undefined, ip);
      return res.status(200).end();
    }

    // 6. Check amount paid
    if (isNaN(pricePaid) || pricePaid < session.expected_cents) {
      await logEvent('webhook', {
        event: 'underpayment',
        session_id: sessionId,
        paid: pricePaid,
        expected: session.expected_cents,
      }, undefined, ip);
      return res.status(200).end();
    }

    // 7. Issue payment_token
    const paymentToken = await issuePaymentToken(session.product_type as 'workflow' | 'sop');

    // 8. Update session to paid
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status: 'paid',
        sale_id: saleId,
        amount_paid: pricePaid,
        payment_token: paymentToken,
      })
      .eq('session_id', sessionId)
      .eq('status', 'pending'); // guard against race

    if (updateError) {
      throw updateError;
    }

    await logEvent('webhook', {
      event: 'session_paid',
      session_id: sessionId,
      sale_id: saleId,
      amount_paid: pricePaid,
      product_type: session.product_type,
    }, undefined, ip);

    return res.status(200).end();

  } catch (error) {
    console.error('webhook error:', error);
    await logEvent('error', {
      context: 'gumroad_webhook',
      session_id: sessionId,
      error: String(error),
    }, undefined, ip);
    // Return 200 to prevent Gumroad from retrying on our internal error
    return res.status(200).end();
  }
}
```

### Step 2: Manual verification (test mode)

To test the webhook handler locally without a real Gumroad request, you can POST a fake form-urlencoded payload:

```bash
# With GUMROAD_TEST_MODE=true, signature check is skipped
# First create a session to get a session_id:
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/gumroad/create-session \
  -H "Content-Type: application/json" \
  -d '{"product_type":"workflow","expected_cents":99}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")

echo "Session ID: $SESSION_ID"

# Then simulate a Gumroad webhook:
curl -X POST http://localhost:3000/api/gumroad/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "resource_name=sale" \
  --data-urlencode "Session ID=$SESSION_ID" \
  --data-urlencode "price=99" \
  --data-urlencode "license_key=test-license-key-abc" \
  --data-urlencode "sale_id=test-sale-123" \
  --data-urlencode "refunded=false" \
  --data-urlencode "disputed=false"
```

Expected: HTTP 200 empty response
Check Supabase: `payment_sessions` row should now have `status = 'paid'` and a `payment_token` value.

### Step 3: Commit

```bash
git add api/gumroad/webhook.ts
git commit -m "feat: add gumroad webhook endpoint (strategy B)"
```

---

## Task 6: Strategy B Backend — `/api/gumroad/check-session.ts`

**Files:**
- Create: `api/gumroad/check-session.ts`

Frontend polls this every 1 second after the postMessage fires. Returns the session status and, when paid, the `payment_token`.

### Step 1: Create the file

```typescript
// api/gumroad/check-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin } from '../_utils/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing session id' });
  }

  // Basic UUID format check to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid session id format' });
  }

  try {
    const supabase = createSupabaseAdmin();

    const { data: session, error } = await supabase
      .from('payment_sessions')
      .select('status, payment_token, expires_at')
      .eq('session_id', id)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if pending session has expired
    if (session.status === 'pending' && new Date() > new Date(session.expires_at)) {
      // Mark as expired in DB lazily
      await supabase
        .from('payment_sessions')
        .update({ status: 'expired' })
        .eq('session_id', id);
      return res.status(200).json({ status: 'expired' });
    }

    if (session.status === 'paid') {
      return res.status(200).json({
        status: 'paid',
        payment_token: session.payment_token,
      });
    }

    // pending, used, or expired
    return res.status(200).json({ status: session.status });

  } catch (error) {
    console.error('check-session error:', error);
    return res.status(500).json({ error: 'Failed to check session' });
  }
}
```

### Step 2: Manual verification

Continue from Task 5's test (session should already be `paid`):

```bash
# Use the same SESSION_ID from Task 5
curl "http://localhost:3000/api/gumroad/check-session?id=$SESSION_ID"
```

Expected: `{ "status": "paid", "payment_token": "<uuid>" }`

### Step 3: Commit

```bash
git add api/gumroad/check-session.ts
git commit -m "feat: add gumroad check-session endpoint (strategy B)"
```

---

## Task 7: Feature Flag and Shared Frontend Types

**Files:**
- Create: `lib/paymentStrategy.ts`
- Create: `lib/gumroadPayment.ts`

### Step 1: Create `lib/paymentStrategy.ts`

```typescript
// lib/paymentStrategy.ts

export type PaymentStrategy = 'A' | 'B';

/**
 * Active payment strategy, controlled by VITE_PAYMENT_STRATEGY env var.
 * Strategy A: postMessage + Gumroad license verify API
 * Strategy B: postMessage trigger + webhook + polling
 * Defaults to 'A' if not set.
 */
export const PAYMENT_STRATEGY: PaymentStrategy =
  (import.meta.env.VITE_PAYMENT_STRATEGY as PaymentStrategy) ?? 'A';
```

### Step 2: Create `lib/gumroadPayment.ts`

```typescript
// lib/gumroadPayment.ts

export interface PaymentParams {
  type: 'workflow' | 'sop';
  nodeCount?: number; // Required when type === 'sop'
}

export interface PaymentResult {
  payment_token: string;
}

/**
 * Common interface both strategies implement.
 * Calling pay() opens the Gumroad overlay and resolves when
 * the user has completed payment and a payment_token has been issued.
 * Rejects if payment fails, is cancelled, or times out.
 */
export interface GumroadPaymentService {
  pay(params: PaymentParams): Promise<PaymentResult>;
}

/** Compute the price in cents for a given payment action. */
export function computeCents(params: PaymentParams): number {
  if (params.type === 'workflow') return 99; // $0.99
  if (params.type === 'sop') {
    const count = params.nodeCount ?? 1;
    return Math.round(count * 49); // $0.49 per node
  }
  throw new Error(`Unknown payment type: ${params.type}`);
}

/** Build the Gumroad checkout URL for a given product. */
export function buildGumroadUrl(
  productId: string,
  cents: number,
  sessionId: string
): string {
  const base = `https://${import.meta.env.VITE_GUMROAD_SELLER_HANDLE ?? 'app'}.gumroad.com/l/${productId}`;
  const params = new URLSearchParams({
    wanted: 'true',
    price: String(cents),
    'Session ID': sessionId,
  });
  return `${base}?${params.toString()}`;
}

/** Get the Gumroad product ID for a given payment type. */
export function getProductId(type: 'workflow' | 'sop'): string {
  const ids: Record<string, string> = {
    workflow: import.meta.env.VITE_GUMROAD_WORKFLOW_PRODUCT_ID ?? '',
    sop: import.meta.env.VITE_GUMROAD_SOP_PRODUCT_ID ?? '',
  };
  const id = ids[type];
  if (!id) throw new Error(`VITE_GUMROAD_${type.toUpperCase()}_PRODUCT_ID is not set`);
  return id;
}
```

### Step 3: Commit

```bash
git add lib/paymentStrategy.ts lib/gumroadPayment.ts
git commit -m "feat: add gumroad payment strategy types and shared utilities"
```

---

## Task 8: Strategy A Frontend — `lib/gumroadStrategyA.ts`

**Files:**
- Create: `lib/gumroadStrategyA.ts`

Opens the overlay, listens for postMessage, extracts `license_key`, and calls the backend to verify.

### Step 1: Create the file

```typescript
// lib/gumroadStrategyA.ts
import type { GumroadPaymentService, PaymentParams, PaymentResult } from './gumroadPayment';
import { computeCents, buildGumroadUrl, getProductId } from './gumroadPayment';

export class StrategyAService implements GumroadPaymentService {
  async pay(params: PaymentParams): Promise<PaymentResult> {
    const cents = computeCents(params);
    const productId = getProductId(params.type);
    // Use a local UUID as the session field (not strictly needed for A,
    // but included for symmetry and future debugging)
    const sessionId = crypto.randomUUID();
    const url = buildGumroadUrl(productId, cents, sessionId);

    return new Promise((resolve, reject) => {
      // Open the Gumroad overlay
      const overlayWindow = window.open(url, '_blank', 'width=500,height=650');

      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        clearInterval(closedCheck);
        fn();
      };

      // Listen for Gumroad postMessage
      const onMessage = async (event: MessageEvent) => {
        // Gumroad sends from gumroad.com
        if (!event.origin.includes('gumroad.com')) return;

        let data: Record<string, unknown>;
        try {
          data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        } catch {
          return;
        }

        if (data.post_message_name !== 'sale') return;

        // Log the full payload for validation during initial rollout
        console.info('[StrategyA] postMessage payload:', JSON.stringify(data));

        const licenseKey = data.license_key as string | undefined;

        if (!licenseKey) {
          // Strategy A cannot proceed without license_key in postMessage
          // This is the key unknown — if this fires, switch to Strategy B
          console.error('[StrategyA] license_key missing from postMessage. Switch to Strategy B.');
          settle(() => reject(new Error('STRATEGY_A_NO_LICENSE_KEY')));
          return;
        }

        // Call backend to verify and issue payment_token
        try {
          const response = await fetch('/api/gumroad/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              license_key: licenseKey,
              product_type: params.type,
              expected_cents: cents,
            }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Unknown error' }));
            settle(() => reject(new Error(err.error ?? 'Verification failed')));
            return;
          }

          const { payment_token } = await response.json();
          settle(() => resolve({ payment_token }));
        } catch (err) {
          settle(() => reject(err instanceof Error ? err : new Error('Network error')));
        }
      };

      window.addEventListener('message', onMessage);

      // Detect if user closes the popup without paying
      const closedCheck = setInterval(() => {
        if (overlayWindow?.closed) {
          settle(() => reject(new Error('PAYMENT_CANCELLED')));
        }
      }, 1000);
    });
  }
}
```

### Step 2: Commit

```bash
git add lib/gumroadStrategyA.ts
git commit -m "feat: add gumroad strategy A frontend service"
```

---

## Task 9: Strategy B Frontend — `lib/gumroadStrategyB.ts`

**Files:**
- Create: `lib/gumroadStrategyB.ts`

Creates a backend session, opens the overlay, waits for the postMessage, then polls for webhook confirmation.

### Step 1: Create the file

```typescript
// lib/gumroadStrategyB.ts
import type { GumroadPaymentService, PaymentParams, PaymentResult } from './gumroadPayment';
import { computeCents, buildGumroadUrl, getProductId } from './gumroadPayment';

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 30; // 30 seconds max

export class StrategyBService implements GumroadPaymentService {
  async pay(params: PaymentParams): Promise<PaymentResult> {
    const cents = computeCents(params);
    const productId = getProductId(params.type);

    // 1. Create a backend session
    const sessionResponse = await fetch('/api/gumroad/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_type: params.type, expected_cents: cents }),
    });

    if (!sessionResponse.ok) {
      throw new Error('Failed to create payment session');
    }

    const { session_id } = await sessionResponse.json();
    const url = buildGumroadUrl(productId, cents, session_id);

    return new Promise((resolve, reject) => {
      const overlayWindow = window.open(url, '_blank', 'width=500,height=650');

      let settled = false;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let attempts = 0;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        clearInterval(closedCheck);
        if (pollTimer) clearInterval(pollTimer);
        fn();
      };

      // Start polling the backend for session status
      const startPolling = () => {
        if (pollTimer) return; // don't double-start
        pollTimer = setInterval(async () => {
          attempts++;

          if (attempts > POLL_MAX_ATTEMPTS) {
            settle(() => reject(new Error('PAYMENT_CONFIRMATION_TIMEOUT')));
            return;
          }

          try {
            const res = await fetch(`/api/gumroad/check-session?id=${session_id}`);
            if (!res.ok) return;

            const data = await res.json();

            if (data.status === 'paid' && data.payment_token) {
              settle(() => resolve({ payment_token: data.payment_token }));
            } else if (data.status === 'expired') {
              settle(() => reject(new Error('PAYMENT_SESSION_EXPIRED')));
            }
            // 'pending' — keep polling
          } catch {
            // network hiccup — keep polling
          }
        }, POLL_INTERVAL_MS);
      };

      // postMessage fires when user completes purchase in overlay
      // Use it to start polling immediately (faster than waiting for next tick)
      const onMessage = (event: MessageEvent) => {
        if (!event.origin.includes('gumroad.com')) return;

        let data: Record<string, unknown>;
        try {
          data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        } catch {
          return;
        }

        if (data.post_message_name !== 'sale') return;
        startPolling(); // webhook should arrive very soon
      };

      window.addEventListener('message', onMessage);

      // Also start polling immediately as fallback
      // (in case postMessage doesn't fire or fires late)
      startPolling();

      // Detect popup closed without paying
      const closedCheck = setInterval(() => {
        if (overlayWindow?.closed && !settled) {
          // Give polling a 3-second grace period after popup closes
          // (user might have closed popup after paying)
          setTimeout(() => {
            if (!settled) {
              settle(() => reject(new Error('PAYMENT_CANCELLED')));
            }
          }, 3000);
          clearInterval(closedCheck);
        }
      }, 1000);
    });
  }
}
```

### Step 2: Commit

```bash
git add lib/gumroadStrategyB.ts
git commit -m "feat: add gumroad strategy B frontend service"
```

---

## Task 10: GumroadPaymentModal Component

**Files:**
- Create: `components/GumroadPaymentModal.tsx`

Replaces `PayPalPaymentModal`. Shows the cost, handles the payment flow using whichever strategy is active, and calls `onSuccess(paymentToken)`.

### Step 1: Create the file

```typescript
// components/GumroadPaymentModal.tsx
import React, { useState } from 'react';
import { X, CreditCard, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { PAYMENT_STRATEGY } from '../lib/paymentStrategy';
import { computeCents } from '../lib/gumroadPayment';
import { StrategyAService } from '../lib/gumroadStrategyA';
import { StrategyBService } from '../lib/gumroadStrategyB';
import type { PaymentParams } from '../lib/gumroadPayment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentToken: string) => void;
  type: 'workflow' | 'sop';
  nodeCount?: number;
  description: string;
}

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_CANCELLED: '已取消付款。',
  PAYMENT_CONFIRMATION_TIMEOUT: '付款確認中，請稍後重試。',
  PAYMENT_SESSION_EXPIRED: '付款工作階段已逾期，請重新嘗試。',
  STRATEGY_A_NO_LICENSE_KEY: '驗證失敗，請聯絡客服。',
};

const paymentService = PAYMENT_STRATEGY === 'A'
  ? new StrategyAService()
  : new StrategyBService();

const GumroadPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  type,
  nodeCount,
  description,
}) => {
  const { theme, t } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const params: PaymentParams = { type, nodeCount };
  const cents = computeCents(params);

  const handlePay = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const result = await paymentService.pay(params);
      onSuccess(result.payment_token);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'UNKNOWN';
      if (code === 'PAYMENT_CANCELLED') {
        // Silent cancel — just reset
        setIsProcessing(false);
        return;
      }
      setError(ERROR_MESSAGES[code] ?? '付款失敗，請重試。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full max-w-sm mx-4 ${theme.bgCard} ${theme.borderRadiusXl} border ${theme.borderColor} ${theme.shadowXl} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-blue-400" />
            <h2 className={`text-sm font-bold ${theme.textPrimary} uppercase tracking-wider`}>
              確認付款
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={`p-1.5 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textMuted} hover:text-white transition-all`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Cost summary */}
          <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight}`}>
            <p className={`text-sm ${theme.textSecondary} mb-3`}>{description}</p>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${theme.textMuted}`}>金額</span>
              <span className={`text-2xl font-bold ${theme.textPrimary}`}>
                {formatUSD(cents)}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className={`p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2`}>
              <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />
              <p className="text-xs text-blue-400">
                等待 Gumroad 付款完成...
              </p>
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                前往 Gumroad 付款 {formatUSD(cents)}
              </>
            )}
          </button>

          <p className={`text-center text-[11px] ${theme.textMuted}`}>
            付款視窗將在新頁面開啟。完成後請回到此頁面。
          </p>
        </div>
      </div>
    </div>
  );
};

export default GumroadPaymentModal;
```

### Step 2: Commit

```bash
git add components/GumroadPaymentModal.tsx
git commit -m "feat: add GumroadPaymentModal component"
```

---

## Task 11: Update `generate-workflow.ts` to Require payment_token

**Files:**
- Modify: `api/generate-workflow.ts`

Add `payment_token` validation before calling Claude. The token is passed in the `X-Payment-Token` header.

### Step 1: Add token validation

In `api/generate-workflow.ts`, add the following import at the top:

```typescript
import { consumePaymentToken } from './_utils/paymentToken.js';
```

Then, after the existing auth check (after line ~182, before `const { prompt, language = 'zh-TW' } = req.body;`), add:

```typescript
  // Validate payment token (skip in local mode)
  const isLocalMode = !!process.env.VITE_LOCAL_API_KEY || process.env.LOCAL_MODE === 'true';
  if (!isLocalMode) {
    const paymentToken = req.headers['x-payment-token'] as string;
    try {
      await consumePaymentToken(paymentToken, 'workflow');
    } catch (err) {
      return res.status(402).json({
        error: err instanceof Error ? err.message : 'Payment required',
      });
    }
  }
```

### Step 2: Manual verification

```bash
# Should fail with 402 (no token)
curl -X POST http://localhost:3000/api/generate-workflow \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test workflow"}'

# Should succeed (test mode: get a token first)
TOKEN=$(curl -s -X POST http://localhost:3000/api/gumroad/verify-license \
  -H "Content-Type: application/json" \
  -d '{"license_key":"any-test-key","product_type":"workflow","expected_cents":99}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['payment_token'])")

curl -X POST http://localhost:3000/api/generate-workflow \
  -H "Content-Type: application/json" \
  -H "X-Payment-Token: $TOKEN" \
  -d '{"prompt":"a simple chat bot workflow"}'

# Same token should fail the second time (already consumed)
curl -X POST http://localhost:3000/api/generate-workflow \
  -H "Content-Type: application/json" \
  -H "X-Payment-Token: $TOKEN" \
  -d '{"prompt":"a simple chat bot workflow"}'
```

Expected: first call 200 with workflow JSON; second call 402 "Payment token already used".

### Step 3: Commit

```bash
git add api/generate-workflow.ts
git commit -m "feat: require payment_token in generate-workflow endpoint"
```

---

## Task 12: Update `generate-sop.ts` to Require payment_token

**Files:**
- Modify: `api/generate-sop.ts`

Same pattern as Task 11.

### Step 1: Add token validation

In `api/generate-sop.ts`, add import:

```typescript
import { consumePaymentToken } from './_utils/paymentToken.js';
```

After the auth check, before `const { workflow, language = 'zh-TW' } = req.body;`, add:

```typescript
  const isLocalMode = !!process.env.VITE_LOCAL_API_KEY || process.env.LOCAL_MODE === 'true';
  if (!isLocalMode) {
    const paymentToken = req.headers['x-payment-token'] as string;
    try {
      await consumePaymentToken(paymentToken, 'sop');
    } catch (err) {
      return res.status(402).json({
        error: err instanceof Error ? err.message : 'Payment required',
      });
    }
  }
```

### Step 2: Commit

```bash
git add api/generate-sop.ts
git commit -m "feat: require payment_token in generate-sop endpoint"
```

---

## Task 13: Update `App.tsx` — Swap PayPalPaymentModal for GumroadPaymentModal

**Files:**
- Modify: `App.tsx`

### Step 1: Update imports

In `App.tsx`, replace:
```typescript
import PayPalPaymentModal from './components/PayPalPaymentModal';
import { WORKFLOW_COST, SOP_COST_PER_NODE } from './lib/paypal';
```
With:
```typescript
import GumroadPaymentModal from './components/GumroadPaymentModal';
```

### Step 2: Remove PayPal-specific state

Remove the `selectedTopup` and PayPal-specific state that is no longer needed. The `showPaymentModal`, `pendingAction`, `pendingPrompt`, `paymentAmount`, and `paymentDescription` state variables can stay — they're reused.

### Step 3: Update `handleGenerate` and `handleGenerateInstructions`

The current flow sets `showPaymentModal = true` and waits for `handlePaymentSuccess`. Change `handlePaymentSuccess` to accept a `paymentToken` and pass it to the generation function:

Replace the `handlePaymentSuccess` function:
```typescript
const handlePaymentSuccess = async (paymentToken: string) => {
  setShowPaymentModal(false);

  if (pendingAction === 'workflow') {
    await executeWorkflowGeneration(pendingPrompt, paymentToken);
  } else if (pendingAction === 'sop') {
    await executeInstructionsGeneration(paymentToken);
  }

  setPendingAction(null);
  setPendingPrompt('');
  setPaymentAmount(0);
  setPaymentDescription('');
};
```

### Step 4: Update `executeWorkflowGeneration` to accept and send the token

```typescript
const executeWorkflowGeneration = async (prompt: string, paymentToken?: string) => {
  setIsLoading(true);
  setConfirmation(null);
  try {
    const provider = getAIProvider(aiProvider);
    const result = await provider.generateWorkflow(prompt, language, paymentToken);
    // ... rest unchanged
  }
};
```

Check `services/ai` to see how `generateWorkflow` calls the backend, and add `paymentToken` as an extra header there.

### Step 5: Replace the JSX for the payment modal

Find the `{showPaymentModal && <PayPalPaymentModal ... />}` block and replace with:

```tsx
{showPaymentModal && (
  <GumroadPaymentModal
    isOpen={showPaymentModal}
    onClose={handlePaymentCancel}
    onSuccess={handlePaymentSuccess}
    type={pendingAction || 'workflow'}
    nodeCount={pendingAction === 'sop' ? workflow.nodes.length : undefined}
    description={paymentDescription}
  />
)}
```

### Step 6: Verify visually

Run `npm run dev`, open the app, click "Generate Workflow". Confirm:
1. GumroadPaymentModal appears with correct price ($0.99)
2. Clicking "前往 Gumroad 付款" opens a new tab/window to the Gumroad product URL
3. In test mode, after paying, the workflow generates successfully

### Step 7: Commit

```bash
git add App.tsx
git commit -m "feat: swap PayPalPaymentModal for GumroadPaymentModal in App"
```

---

## Task 14: Update AI Service Layer to Send payment_token Header

**Files:**
- Modify: `services/ai.ts` (or wherever `generateWorkflow` and `generateAgentInstructions` make fetch calls)

### Step 1: Find the fetch calls

Run:
```bash
grep -n "generate-workflow\|generate-sop" services/ai.ts
```

Add the `X-Payment-Token` header to both fetch calls:

```typescript
// In the generateWorkflow fetch call:
headers: {
  'Content-Type': 'application/json',
  ...(paymentToken && { 'X-Payment-Token': paymentToken }),
},
```

Update the function signatures to accept `paymentToken?: string`.

### Step 2: Verify end-to-end

With `GUMROAD_TEST_MODE=true`:
1. Open app in browser
2. Click "Generate Workflow"
3. Modal appears → click pay → new window opens
4. Simulate Gumroad response (in test mode, the verify-license endpoint accepts any key)
5. Workflow generates successfully

### Step 3: Commit

```bash
git add services/ai.ts
git commit -m "feat: pass payment_token header in AI service calls"
```

---

## Task 15: Add `.env.local` Variables

**Files:**
- Modify: `.env.local` (not committed — add to `.env.example` instead)

### Step 1: Update `.env.local`

Add to your local `.env.local`:

```bash
# Gumroad payment strategy
VITE_PAYMENT_STRATEGY=A
VITE_GUMROAD_SELLER_HANDLE=yourname      # your Gumroad username
VITE_GUMROAD_WORKFLOW_PRODUCT_ID=abcde   # short permalink slug from Gumroad dashboard
VITE_GUMROAD_SOP_PRODUCT_ID=fghij

# Backend (also add to Vercel environment settings)
GUMROAD_PRODUCT_WORKFLOW_ID=abcde
GUMROAD_PRODUCT_SOP_ID=fghij
GUMROAD_SECRET=                           # from Gumroad webhook settings (Strategy B only)
GUMROAD_TEST_MODE=true                    # remove or set to false in production
```

### Step 2: Update `.env.example` if it exists, or create it

```bash
# .env.example — safe to commit, no real values
VITE_PAYMENT_STRATEGY=A
VITE_GUMROAD_SELLER_HANDLE=
VITE_GUMROAD_WORKFLOW_PRODUCT_ID=
VITE_GUMROAD_SOP_PRODUCT_ID=
GUMROAD_PRODUCT_WORKFLOW_ID=
GUMROAD_PRODUCT_SOP_ID=
GUMROAD_SECRET=
GUMROAD_TEST_MODE=true
```

### Step 3: Commit the example file

```bash
git add .env.example
git commit -m "docs: add gumroad env variable examples"
```

---

## Task 16: Final End-to-End Validation

Before declaring done, run through this checklist:

### Strategy A smoke test (with `VITE_PAYMENT_STRATEGY=A`, `GUMROAD_TEST_MODE=true`)

- [ ] GumroadPaymentModal shows correct price for workflow ($0.99)
- [ ] GumroadPaymentModal shows correct price for SOP (e.g., 5 nodes = $2.45)
- [ ] Clicking pay opens a new window with the correct Gumroad URL
- [ ] In test mode, verify-license endpoint returns a `payment_token`
- [ ] Workflow generates after successful payment
- [ ] SOP generates after successful payment
- [ ] Using the same `payment_token` twice returns 402
- [ ] Console logs show `[StrategyA] postMessage payload:` (to confirm it's running A)

### Strategy B smoke test (switch to `VITE_PAYMENT_STRATEGY=B`)

- [ ] Same UX as A (modal, popup window)
- [ ] create-session is called before opening the overlay (check Network tab)
- [ ] After simulating a webhook with the session_id, poll returns `paid`
- [ ] Workflow generates after successful payment

### Commit final validation

```bash
git commit --allow-empty -m "chore: gumroad payment integration complete, ready for production test"
```

---

## Post-Validation Cleanup (do after first real purchases confirm Strategy A works)

Once Strategy A is confirmed in production with real purchases:

```bash
# Delete Strategy B files
rm api/gumroad/create-session.ts
rm api/gumroad/webhook.ts
rm api/gumroad/check-session.ts
rm lib/gumroadStrategyB.ts

# Delete PayPal files
rm api/paypal/create-order.ts
rm api/paypal/capture-order.ts
rm api/_utils/paypal.ts
rm lib/paypal.ts
rm components/PayPalPaymentModal.tsx

# Remove PayPal SDK dependency from package.json
npm uninstall @paypal/react-paypal-js

# Remove feature flag from lib/paymentStrategy.ts
# (hardcode to Strategy A directly in gumroadPayment.ts)

git add -A
git commit -m "chore: remove PayPal and Strategy B after Gumroad Strategy A validated"
```
