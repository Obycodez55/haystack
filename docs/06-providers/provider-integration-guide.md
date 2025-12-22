# Provider Integration Guide

**Version:** 1.0  
**Date:** December 2024  
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Paystack Integration](#2-paystack-integration)
3. [Stripe Integration](#3-stripe-integration)
4. [Flutterwave Integration](#4-flutterwave-integration)
5. [Common Patterns](#5-common-patterns)
6. [Error Mapping](#6-error-mapping)

---

## 1. Overview

### 1.1 Integration Model

**Aggregator Model:**
- Customers provide their own provider API keys
- We store keys encrypted (AWS KMS)
- We call provider APIs using customer keys
- Money flows directly to customer's provider account

### 1.2 Adapter Pattern

All providers implement the `IPaymentProvider` interface:

```typescript
interface IPaymentProvider {
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  refundPayment(request: RefundRequest): Promise<RefundResponse>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: any): WebhookEvent;
  healthCheck(): Promise<boolean>;
}
```

### 1.3 Provider Selection

**Priority-Based (V1):**
- Providers have priority (lower number = higher priority)
- Select provider based on priority and currency support
- Fallback to next provider on failure (if enabled)

---

## 2. Paystack Integration

### 2.1 Overview

**Base URL:**
- Test: `https://api.paystack.co`
- Live: `https://api.paystack.co` (same URL, different keys)

**Authentication:**
- Header: `Authorization: Bearer {secret_key}`
- Secret key format: `sk_test_xxx` or `sk_live_xxx`

**Supported Currencies:**
- NGN (Nigeria)
- GHS (Ghana)
- ZAR (South Africa)
- USD (Limited)

**Supported Countries:**
- NG (Nigeria)
- GH (Ghana)
- ZA (South Africa)

**Supported Payment Methods:**
- Card payments
- Bank transfers
- USSD
- Bank account (direct debit)

### 2.2 API Endpoints

#### Initialize Transaction

**Endpoint:** `POST /transaction/initialize`

**Request:**
```json
{
  "email": "customer@example.com",
  "amount": 10000,
  "currency": "NGN",
  "reference": "unique_reference_123",
  "callback_url": "https://merchant.com/callback",
  "metadata": {
    "custom_fields": [
      {
        "display_name": "Customer Name",
        "variable_name": "customer_name",
        "value": "John Doe"
      }
    ]
  },
  "channels": ["card", "bank"]
}
```

**Response:**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/xyz",
    "access_code": "access_code_123",
    "reference": "unique_reference_123"
  }
}
```

**Our Mapping:**
- `reference` → `providerPaymentId`
- `authorization_url` → `authorizationUrl`
- `access_code` → stored in metadata

#### Verify Transaction

**Endpoint:** `GET /transaction/verify/{reference}`

**Request:** No body, reference in URL

**Response:**
```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "id": 1234567890,
    "domain": "test",
    "status": "success",
    "reference": "unique_reference_123",
    "amount": 10000,
    "currency": "NGN",
    "customer": {
      "id": 12345,
      "email": "customer@example.com"
    },
    "authorization": {
      "authorization_code": "AUTH_xxx",
      "bin": "408408",
      "last4": "4081",
      "exp_month": "12",
      "exp_year": "2025",
      "card_type": "visa"
    },
    "paid_at": "2024-12-20T10:30:10.000Z"
  }
}
```

**Status Mapping:**
- `success` → `completed`
- `failed` → `failed`
- `pending` → `pending`
- `abandoned` → `cancelled`

#### Refund Transaction

**Endpoint:** `POST /refund`

**Request:**
```json
{
  "transaction": "unique_reference_123",
  "amount": 5000
}
```

**Response:**
```json
{
  "status": true,
  "message": "Refund processed",
  "data": {
    "transaction": {
      "id": 1234567890,
      "transaction_date": "2024-12-20T10:30:10.000Z",
      "customer_note": null,
      "merchant_note": "Refund for order #123"
    },
    "deducted_amount": 5000,
    "status": "processed"
  }
}
```

### 2.3 Webhook Handling

#### Webhook Endpoint

**URL:** `POST /webhooks/paystack`

**Signature Header:** `x-paystack-signature`

**Signature Verification:**
```typescript
function verifyPaystackSignature(payload: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}
```

**Important:** Must use raw body (string) for signature verification, not parsed JSON.

#### Webhook Payload

```json
{
  "event": "charge.success",
  "data": {
    "id": 1234567890,
    "domain": "test",
    "status": "success",
    "reference": "unique_reference_123",
    "amount": 10000,
    "currency": "NGN",
    "customer": {
      "id": 12345,
      "email": "customer@example.com"
    },
    "authorization": {
      "authorization_code": "AUTH_xxx",
      "bin": "408408",
      "last4": "4081"
    },
    "paid_at": "2024-12-20T10:30:10.000Z",
    "created_at": "2024-12-20T10:30:00.000Z"
  }
}
```

**Event Types:**
- `charge.success` → `payment.completed`
- `charge.failed` → `payment.failed`
- `refund.processed` → `refund.completed`

#### Webhook Retry Policy

- **Max Attempts:** 10
- **Schedule:** Exponential backoff over 2 hours
- **Timeout:** 5 seconds per attempt

### 2.4 Error Handling

**Common Errors:**

| Paystack Error | Our Error Code | HTTP Status |
|---------------|----------------|-------------|
| `Insufficient funds` | `insufficient_funds` | 400 |
| `Invalid card` | `card_declined` | 400 |
| `Card expired` | `card_declined` | 400 |
| `Invalid amount` | `invalid_amount` | 400 |
| `Invalid currency` | `invalid_currency` | 400 |
| `Invalid API key` | `provider_invalid_credentials` | 401 |
| `Rate limit exceeded` | `provider_rate_limit` | 429 |
| `Service unavailable` | `provider_unavailable` | 503 |

### 2.5 Rate Limits

- **Test Mode:** 1,000 requests/hour
- **Live Mode:** 3,000 requests/hour
- **Webhook Retries:** 10 attempts over 2 hours

### 2.6 Provider-Specific Quirks

1. **Test Mode Limits:**
   - Max transaction: ₦50,000
   - Limited test card numbers

2. **Bank Transfers:**
   - Can take 24h+ to confirm
   - Requires webhook for final status

3. **USSD Payments:**
   - Timeout after 5 minutes
   - Customer must complete on phone

4. **Reference Format:**
   - Must be unique per transaction
   - Use our payment ID as reference

5. **Webhook Timing:**
   - Webhooks may arrive before API response
   - Always verify transaction status

---

## 3. Stripe Integration

### 3.1 Overview

**Base URL:**
- Test: `https://api.stripe.com/v1`
- Live: `https://api.stripe.com/v1` (same URL, different keys)

**Authentication:**
- Header: `Authorization: Bearer {secret_key}`
- Secret key format: `sk_test_xxx` or `sk_live_xxx`

**Supported Currencies:**
- 135+ currencies including NGN, USD, EUR, GBP, etc.

**Supported Countries:**
- Global (with country-specific payment methods)

**Supported Payment Methods:**
- Card payments
- Bank transfers (ACH, SEPA)
- Digital wallets (Apple Pay, Google Pay)

### 3.2 API Endpoints

#### Create Payment Intent

**Endpoint:** `POST /payment_intents`

**Request:**
```json
{
  "amount": 10000,
  "currency": "ngn",
  "payment_method_types": ["card"],
  "metadata": {
    "order_id": "order_123",
    "customer_email": "customer@example.com"
  },
  "description": "Order #12345"
}
```

**Response:**
```json
{
  "id": "pi_1234567890",
  "object": "payment_intent",
  "amount": 10000,
  "currency": "ngn",
  "status": "requires_payment_method",
  "client_secret": "pi_1234567890_secret_xxx"
}
```

**Our Mapping:**
- `id` → `providerPaymentId`
- `client_secret` → stored for frontend SDK
- `status` → mapped to our status

#### Retrieve Payment Intent

**Endpoint:** `GET /payment_intents/{id}`

**Response:**
```json
{
  "id": "pi_1234567890",
  "object": "payment_intent",
  "amount": 10000,
  "currency": "ngn",
  "status": "succeeded",
  "payment_method": "pm_1234567890",
  "charges": {
    "data": [
      {
        "id": "ch_1234567890",
        "status": "succeeded",
        "paid": true
      }
    ]
  },
  "created": 1703062800
}
```

**Status Mapping:**
- `requires_payment_method` → `pending`
- `requires_confirmation` → `requires_action`
- `requires_action` → `requires_action`
- `processing` → `processing`
- `succeeded` → `completed`
- `requires_capture` → `processing`
- `canceled` → `cancelled`

#### Create Refund

**Endpoint:** `POST /refunds`

**Request:**
```json
{
  "charge": "ch_1234567890",
  "amount": 5000,
  "reason": "requested_by_customer"
}
```

**Response:**
```json
{
  "id": "re_1234567890",
  "object": "refund",
  "amount": 5000,
  "currency": "ngn",
  "status": "succeeded",
  "charge": "ch_1234567890"
}
```

### 3.3 Webhook Handling

#### Webhook Endpoint

**URL:** `POST /webhooks/stripe`

**Signature Header:** `stripe-signature`

**Signature Verification:**
```typescript
import Stripe from 'stripe';

function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });
    stripe.webhooks.constructEvent(payload, signature, secret);
    return true;
  } catch (error) {
    return false;
  }
}
```

**Important:** Must use raw body (Buffer) for signature verification.

#### Webhook Payload

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "object": "payment_intent",
      "amount": 10000,
      "currency": "ngn",
      "status": "succeeded",
      "charges": {
        "data": [
          {
            "id": "ch_1234567890",
            "paid": true
          }
        ]
      }
    }
  },
  "created": 1703062800
}
```

**Event Types:**
- `payment_intent.succeeded` → `payment.completed`
- `payment_intent.payment_failed` → `payment.failed`
- `charge.refunded` → `refund.completed`

#### Webhook Retry Policy

- **Max Attempts:** 3 (Stripe retries automatically)
- **Schedule:** Exponential backoff
- **Timeout:** 5 seconds per attempt

### 3.4 Error Handling

**Common Errors:**

| Stripe Error | Our Error Code | HTTP Status |
|-------------|----------------|-------------|
| `card_declined` | `card_declined` | 402 |
| `insufficient_funds` | `insufficient_funds` | 402 |
| `expired_card` | `card_declined` | 402 |
| `invalid_amount` | `invalid_amount` | 400 |
| `invalid_api_key` | `provider_invalid_credentials` | 401 |
| `rate_limit` | `provider_rate_limit` | 429 |
| `api_error` | `provider_error` | 500 |

### 3.5 Rate Limits

- **Rolling Window:** 1 second
- **Write Requests:** 25 per second
- **Read Requests:** 100 per second
- **Idempotency:** Use `Idempotency-Key` header

### 3.6 Provider-Specific Quirks

1. **Idempotency:**
   - Must use `Idempotency-Key` header
   - Key valid for 24 hours

2. **Webhook Order:**
   - Webhooks may arrive out of order
   - Always verify current status

3. **Payment Intents:**
   - Two-step process (create + confirm)
   - Can be updated before confirmation

4. **Test Mode:**
   - Use test card numbers
   - Test clock for time-based testing

5. **Currency Format:**
   - Lowercase (e.g., "ngn" not "NGN")
   - Amount in smallest unit (kobo for NGN)

---

## 4. Flutterwave Integration

### 4.1 Overview

**Base URL:**
- Test: `https://api.flutterwave.com/v3`
- Live: `https://api.flutterwave.com/v3` (same URL, different keys)

**Authentication:**
- Header: `Authorization: Bearer {secret_key}`
- Secret key format: `FLWSECK_TEST_xxx` or `FLWSECK_xxx`

**Supported Currencies:**
- All major African currencies
- 34+ countries supported

**Supported Countries:**
- NG, GH, KE, ZA, TZ, UG, etc. (34+ countries)

**Supported Payment Methods:**
- Card payments
- Bank transfers
- USSD
- Mobile money (M-Pesa, MTN, Airtel)
- Bank account (direct debit)

### 4.2 API Endpoints

#### Initialize Payment

**Endpoint:** `POST /charges?type=card`

**Request:**
```json
{
  "card_number": "5531886652142950",
  "cvv": "564",
  "expiry_month": "09",
  "expiry_year": "32",
  "currency": "NGN",
  "amount": 10000,
  "redirect_url": "https://merchant.com/callback",
  "email": "customer@example.com",
  "fullname": "John Doe",
  "tx_ref": "unique_reference_123",
  "meta": {
    "order_id": "order_123"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Charge initiated",
  "data": {
    "id": 1234567890,
    "tx_ref": "unique_reference_123",
    "flw_ref": "FLW_REF_123",
    "device_fingerprint": "fingerprint_123",
    "amount": 10000,
    "currency": "NGN",
    "charged_amount": 10000,
    "app_fee": 150,
    "merchant_fee": 0,
    "processor_response": "Successful",
    "auth_model": "PIN",
    "card": {
      "first_6digits": "553188",
      "last_4digits": "2950",
      "issuer": "MASTERCARD",
      "country": "NG",
      "type": "MASTERCARD",
      "token": "token_123",
      "expiry": "09/32"
    },
    "status": "successful",
    "payment_type": "card",
    "created_at": "2024-12-20T10:30:00.000Z"
  }
}
```

**Our Mapping:**
- `tx_ref` → `providerPaymentId`
- `flw_ref` → stored in metadata
- `status` → mapped to our status

#### Verify Transaction

**Endpoint:** `GET /transactions/{id}/verify`

**Request:** Transaction ID in URL

**Response:**
```json
{
  "status": "success",
  "message": "Transaction fetched successfully",
  "data": {
    "id": 1234567890,
    "tx_ref": "unique_reference_123",
    "flw_ref": "FLW_REF_123",
    "device_fingerprint": "fingerprint_123",
    "amount": 10000,
    "currency": "NGN",
    "charged_amount": 10000,
    "app_fee": 150,
    "merchant_fee": 0,
    "processor_response": "Successful",
    "auth_model": "PIN",
    "card": {
      "first_6digits": "553188",
      "last_4digits": "2950"
    },
    "status": "successful",
    "payment_type": "card",
    "created_at": "2024-12-20T10:30:00.000Z"
  }
}
```

**Status Mapping:**
- `successful` → `completed`
- `failed` → `failed`
- `pending` → `pending`
- `cancelled` → `cancelled`

#### Refund Transaction

**Endpoint:** `POST /refunds`

**Request:**
```json
{
  "id": 1234567890,
  "amount": 5000
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Refund initiated",
  "data": {
    "id": 1234567890,
    "tx_ref": "unique_reference_123",
    "flw_ref": "FLW_REF_123",
    "wallet_id": null,
    "amount_refunded": 5000,
    "status": "successful",
    "destination": "account",
    "meta": {
      "refund_reason": "Customer requested refund"
    },
    "created_at": "2024-12-20T11:00:00.000Z"
  }
}
```

### 4.3 Webhook Handling

#### Webhook Endpoint

**URL:** `POST /webhooks/flutterwave`

**Signature Header:** `verif-hash`

**Signature Verification:**
```typescript
function verifyFlutterwaveSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload) + secret)
    .digest('hex');
  return hash === signature;
}
```

#### Webhook Payload

```json
{
  "event": "charge.completed",
  "data": {
    "id": 1234567890,
    "tx_ref": "unique_reference_123",
    "flw_ref": "FLW_REF_123",
    "device_fingerprint": "fingerprint_123",
    "amount": 10000,
    "currency": "NGN",
    "charged_amount": 10000,
    "app_fee": 150,
    "merchant_fee": 0,
    "processor_response": "Successful",
    "auth_model": "PIN",
    "card": {
      "first_6digits": "553188",
      "last_4digits": "2950"
    },
    "status": "successful",
    "payment_type": "card",
    "created_at": "2024-12-20T10:30:00.000Z",
    "customer": {
      "id": 12345,
      "email": "customer@example.com",
      "name": "John Doe"
    }
  }
}
```

**Event Types:**
- `charge.completed` → `payment.completed`
- `charge.failed` → `payment.failed`
- `refund.completed` → `refund.completed`

#### Webhook Retry Policy

- **Max Attempts:** Not publicly documented (assume 5-10)
- **Schedule:** Exponential backoff
- **Timeout:** 5 seconds per attempt

### 4.4 Error Handling

**Common Errors:**

| Flutterwave Error | Our Error Code | HTTP Status |
|------------------|----------------|-------------|
| `Insufficient funds` | `insufficient_funds` | 400 |
| `Card declined` | `card_declined` | 400 |
| `Invalid card` | `card_declined` | 400 |
| `Invalid amount` | `invalid_amount` | 400 |
| `Invalid API key` | `provider_invalid_credentials` | 401 |
| `Rate limit exceeded` | `provider_rate_limit` | 429 |
| `Service unavailable` | `provider_unavailable` | 503 |

### 4.5 Rate Limits

- **Not Publicly Documented**
- **Estimated:** ~100 requests/minute
- **Recommendation:** Implement token bucket rate limiter

### 4.6 Provider-Specific Quirks

1. **Webhook Timing:**
   - Webhooks may arrive before API response
   - Always verify transaction status

2. **Currency Conversion:**
   - Flutterwave handles conversion
   - Fees apply for conversion

3. **Settlement:**
   - T+1 or T+2 (not instant)
   - Varies by country

4. **Test Mode:**
   - Some countries blocked in test mode
   - Limited test card numbers

5. **Reference Format:**
   - `tx_ref` must be unique
   - Use our payment ID as `tx_ref`

---

## 5. Common Patterns

### 5.1 Provider Selection

```typescript
async selectProvider(
  tenantId: string,
  currency: string,
  amount: number
): Promise<ProviderConfig> {
  const providers = await this.getEnabledProviders(tenantId, currency);
  
  // Sort by priority (lower = higher priority)
  const sorted = providers.sort((a, b) => a.priority - b.priority);
  
  // Filter by health status
  const healthy = sorted.filter(p => p.healthStatus === 'healthy');
  
  return healthy[0] || sorted[0]; // Fallback to first if none healthy
}
```

### 5.2 Error Mapping

```typescript
function mapProviderError(
  provider: string,
  error: any
): PaymentError {
  const errorMap = {
    paystack: mapPaystackError,
    stripe: mapStripeError,
    flutterwave: mapFlutterwaveError,
  };
  
  return errorMap[provider](error);
}
```

### 5.3 Retry Logic

```typescript
async executeWithRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        1000 * Math.pow(2, attempt - 1) + Math.random() * 1000,
        10000
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}
```

### 5.4 Health Check

```typescript
async healthCheck(provider: string, config: ProviderConfig): Promise<boolean> {
  try {
    const adapter = this.factory.create(provider, config);
    const healthy = await adapter.healthCheck();
    
    // Update health status in database
    await this.updateHealthStatus(provider, healthy);
    
    return healthy;
  } catch (error) {
    await this.updateHealthStatus(provider, false);
    return false;
  }
}
```

---

## 6. Error Mapping

### 6.1 Unified Error Codes

| Our Error Code | Paystack | Stripe | Flutterwave |
|---------------|----------|--------|-------------|
| `insufficient_funds` | `Insufficient funds` | `insufficient_funds` | `Insufficient funds` |
| `card_declined` | `Card declined` | `card_declined` | `Card declined` |
| `invalid_amount` | `Invalid amount` | `invalid_amount` | `Invalid amount` |
| `invalid_currency` | `Invalid currency` | `invalid_currency` | `Invalid currency` |
| `provider_timeout` | `Timeout` | `timeout` | `Timeout` |
| `provider_rate_limit` | `Rate limit` | `rate_limit` | `Rate limit exceeded` |
| `provider_unavailable` | `Service unavailable` | `api_error` | `Service unavailable` |

### 6.2 Error Response Format

```typescript
interface ProviderError {
  code: string;
  message: string;
  providerCode?: string; // Original provider error code
  providerMessage?: string; // Original provider error message
  retryable: boolean;
}
```

---

## Appendix

### A. Test Credentials

**Paystack Test Cards:**
- Success: `4084084084084081`
- Insufficient Funds: `4084084084084085`
- Card Declined: `4084084084084082`

**Stripe Test Cards:**
- Success: `4242424242424242`
- Insufficient Funds: `4000000000009995`
- Card Declined: `4000000000000002`

**Flutterwave Test Cards:**
- Success: `5531886652142950`
- Insufficient Funds: `5531886652142951`
- Card Declined: `5531886652142952`

### B. Webhook Testing

**Local Testing:**
- Use ngrok: `ngrok http 3000`
- Use localtunnel: `lt --port 3000`
- Update webhook URL in provider dashboard

**Test Webhook Payloads:**
- Use provider's webhook testing tools
- Use Postman/Insomnia to send test webhooks
- Verify signature generation

---

**Document Status:** Draft - Ready for Review  
**Next Steps:** Implement adapters, test with provider sandboxes


