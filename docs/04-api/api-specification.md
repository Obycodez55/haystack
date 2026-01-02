---
title: API Specification
---

# API Specification

**Version:** 1.0  
**Date:** December 2024  
**Status:** Draft  
**Base URL:** `https://api.yourapp.com/v1`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Request/Response Format](#3-requestresponse-format)
4. [Error Handling](#4-error-handling)
5. [Rate Limiting](#5-rate-limiting)
6. [Endpoints](#6-endpoints)
7. [Webhooks](#7-webhooks)

---

## 1. Overview

### 1.1 API Versioning

- **Current Version:** v1
- **Version in URL:** `/v1/`
- **Deprecation Policy:** 6 months notice before breaking changes

### 1.2 Base URL

- **Production:** `https://api.yourapp.com/v1`
- **Test:** `https://api-test.yourapp.com/v1`
- **Local:** `http://localhost:3000/v1`

### 1.3 Content Type

- **Request:** `application/json`
- **Response:** `application/json`
- **Character Encoding:** UTF-8

---

## 2. Authentication

### 2.1 API Key Authentication

All API requests require authentication using API keys.

**Header Format:**

```
Authorization: Bearer sk_test_xxx... or sk_live_xxx...
```

**Key Types:**

- **Publishable Keys:** `pk_test_xxx` or `pk_live_xxx` (read-only, future use)
- **Secret Keys:** `sk_test_xxx` or `sk_live_xxx` (full access)

**Test vs Live:**

- Test keys: Access test mode data only
- Live keys: Access live mode data only
- Keys are scoped to tenant and mode

### 2.2 Request Headers

**Required:**

```
Authorization: Bearer sk_test_xxx
Content-Type: application/json
```

**Optional:**

```
Idempotency-Key: unique-key-12345
X-Request-ID: correlation-id-12345
```

---

## 3. Request/Response Format

### 3.1 Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "requestId": "req_1234567890",
    "timestamp": "2024-12-20T10:30:00Z"
  }
}
```

### 3.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "invalid_amount",
    "message": "Amount must be greater than 0",
    "type": "validation_error",
    "details": {
      "field": "amount",
      "value": -100
    },
    "docUrl": "https://docs.yourapp.com/errors/invalid_amount"
  },
  "meta": {
    "requestId": "req_1234567890",
    "timestamp": "2024-12-20T10:30:00Z"
  }
}
```

### 3.3 Pagination

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 4. Error Handling

### 4.1 HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate request (idempotency)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `502 Bad Gateway`: Provider error
- `503 Service Unavailable`: Service temporarily unavailable

### 4.2 Error Code Taxonomy

#### Payment Errors

- `payment_error`: General payment error
- `invalid_amount`: Amount validation failed
- `invalid_currency`: Unsupported currency
- `insufficient_funds`: Customer has insufficient funds
- `card_declined`: Card was declined
- `payment_failed`: Payment processing failed
- `payment_not_found`: Payment ID not found
- `payment_already_processed`: Payment already completed
- `refund_failed`: Refund processing failed
- `refund_not_allowed`: Refund not allowed for this payment

#### Provider Errors

- `provider_error`: General provider error
- `provider_timeout`: Provider request timed out
- `provider_rate_limit`: Provider rate limit exceeded
- `provider_unavailable`: Provider is currently unavailable
- `provider_invalid_credentials`: Invalid provider API keys
- `provider_not_configured`: Provider not configured for tenant

#### Validation Errors

- `validation_error`: General validation error
- `missing_required_field`: Required field is missing
- `invalid_field_value`: Field value is invalid
- `invalid_email`: Email format is invalid
- `invalid_currency`: Currency code is invalid

#### Authentication Errors

- `authentication_error`: General authentication error
- `invalid_api_key`: API key is invalid
- `api_key_expired`: API key has expired
- `api_key_revoked`: API key has been revoked
- `insufficient_permissions`: API key lacks required permissions

#### Tenant Errors

- `tenant_not_found`: Tenant ID not found
- `invalid_currency`: Unsupported currency code
- `invalid_timezone`: Invalid timezone identifier
- `kyc_already_submitted`: KYC already submitted (can resubmit if rejected)
- `kyc_already_approved`: KYC already approved (cannot resubmit)
- `tenant_inactive`: Tenant account is suspended or deleted

#### System Errors

- `internal_server_error`: Unexpected server error
- `database_error`: Database operation failed
- `service_unavailable`: Service temporarily unavailable

### 4.3 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "invalid_amount",
    "message": "Amount must be greater than 0",
    "type": "validation_error",
    "details": {
      "field": "amount",
      "value": -100,
      "constraint": "must be positive"
    },
    "docUrl": "https://docs.yourapp.com/errors/invalid_amount"
  },
  "meta": {
    "requestId": "req_1234567890",
    "timestamp": "2024-12-20T10:30:00Z"
  }
}
```

---

## 5. Rate Limiting

### 5.1 Rate Limits

**Test Mode:**

- 100 requests/hour per API key
- 1,000 requests/day per API key

**Live Mode:**

- 10,000 requests/hour per API key
- 100,000 requests/day per API key

### 5.2 Rate Limit Headers

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9995
X-RateLimit-Reset: 1703062800
```

### 5.3 Rate Limit Exceeded Response

**Status Code:** `429 Too Many Requests`

```json
{
  "success": false,
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please try again later.",
    "type": "rate_limit_error",
    "details": {
      "limit": 10000,
      "remaining": 0,
      "resetAt": "2024-12-20T11:00:00Z"
    }
  }
}
```

---

## 6. Endpoints

### 6.1 Payments

#### Create Payment

**POST** `/payments`

**Request:**

```json
{
  "amount": 10000,
  "currency": "NGN",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "description": "Order #12345",
  "metadata": {
    "orderId": "order_123",
    "customerId": "cust_456"
  },
  "paymentMethod": "card",
  "provider": "paystack",
  "returnUrl": "https://merchant.com/payment/callback"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "pay_1234567890",
    "amount": 10000,
    "currency": "NGN",
    "status": "pending",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "description": "Order #12345",
    "provider": "paystack",
    "providerPaymentId": "ref_abc123",
    "authorizationUrl": "https://checkout.paystack.com/xyz",
    "requiresAction": true,
    "metadata": {
      "orderId": "order_123",
      "customerId": "cust_456"
    },
    "createdAt": "2024-12-20T10:30:00Z",
    "updatedAt": "2024-12-20T10:30:00Z"
  }
}
```

**Validation:**

- `amount`: Required, integer > 0
- `currency`: Required, ISO 4217 code (NGN, USD, EUR, etc.)
- `customerEmail`: Required, valid email format
- `customerName`: Optional, string
- `description`: Optional, string
- `metadata`: Optional, object
- `paymentMethod`: Optional, enum (card, bank_transfer, ussd, mobile_money, qr_code)
- `provider`: Optional, enum (paystack, stripe, flutterwave) - if not provided, uses priority-based selection
- `returnUrl`: Optional, valid URL

#### Get Payment

**GET** `/payments/:id`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "pay_1234567890",
    "amount": 10000,
    "currency": "NGN",
    "status": "completed",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "description": "Order #12345",
    "provider": "paystack",
    "providerPaymentId": "ref_abc123",
    "paymentMethod": "card",
    "metadata": {
      "orderId": "order_123"
    },
    "events": [
      {
        "id": "evt_1",
        "eventType": "status_changed",
        "fromStatus": "pending",
        "toStatus": "processing",
        "createdAt": "2024-12-20T10:30:05Z"
      },
      {
        "id": "evt_2",
        "eventType": "status_changed",
        "fromStatus": "processing",
        "toStatus": "completed",
        "createdAt": "2024-12-20T10:30:10Z"
      }
    ],
    "createdAt": "2024-12-20T10:30:00Z",
    "updatedAt": "2024-12-20T10:30:10Z",
    "completedAt": "2024-12-20T10:30:10Z"
  }
}
```

#### List Payments

**GET** `/payments`

**Query Parameters:**

- `status`: Filter by status (pending, processing, completed, failed, etc.)
- `provider`: Filter by provider (paystack, stripe, flutterwave)
- `currency`: Filter by currency (NGN, USD, etc.)
- `startDate`: Filter by start date (ISO 8601)
- `endDate`: Filter by end date (ISO 8601)
- `customerEmail`: Filter by customer email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "pay_1234567890",
      "amount": 10000,
      "currency": "NGN",
      "status": "completed",
      "customerEmail": "customer@example.com",
      "provider": "paystack",
      "createdAt": "2024-12-20T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Refund Payment

**POST** `/payments/:id/refund`

**Request:**

```json
{
  "amount": 5000,
  "reason": "Customer requested refund"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "ref_1234567890",
    "paymentId": "pay_1234567890",
    "amount": 5000,
    "currency": "NGN",
    "status": "pending",
    "reason": "Customer requested refund",
    "createdAt": "2024-12-20T11:00:00Z"
  }
}
```

**Validation:**

- `amount`: Optional, integer > 0 (if not provided, full refund)
- `reason`: Optional, string

### 6.2 Providers

#### List Providers

**GET** `/providers`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "prov_123",
      "provider": "paystack",
      "mode": "test",
      "isEnabled": true,
      "priority": 1,
      "supportedCurrencies": ["NGN", "GHS", "ZAR", "USD"],
      "supportedCountries": ["NG", "GH", "ZA"],
      "healthStatus": "healthy",
      "successRate": 98.5,
      "createdAt": "2024-12-20T10:00:00Z"
    }
  ]
}
```

#### Add Provider

**POST** `/providers`

**Request:**

```json
{
  "provider": "paystack",
  "mode": "test",
  "publicKey": "pk_test_xxx",
  "secretKey": "sk_test_xxx",
  "webhookSecret": "whsec_xxx",
  "priority": 1,
  "isEnabled": true
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "prov_123",
    "provider": "paystack",
    "mode": "test",
    "isEnabled": true,
    "priority": 1,
    "createdAt": "2024-12-20T10:00:00Z"
  }
}
```

**Validation:**

- `provider`: Required, enum (paystack, stripe, flutterwave)
- `mode`: Required, enum (test, live)
- `publicKey`: Required, string
- `secretKey`: Required, string
- `webhookSecret`: Optional, string
- `priority`: Optional, integer (default: 0, lower = higher priority)
- `isEnabled`: Optional, boolean (default: true)

#### Update Provider

**PATCH** `/providers/:id`

**Request:**

```json
{
  "priority": 2,
  "isEnabled": false
}
```

**Response:** `200 OK`

#### Delete Provider

**DELETE** `/providers/:id`

**Response:** `204 No Content`

#### Test Provider Connection

**POST** `/providers/:id/test`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "connected": true,
    "provider": "paystack",
    "mode": "test",
    "message": "Connection successful"
  }
}
```

### 6.3 API Keys

#### List API Keys

**GET** `/api-keys`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "key_123",
      "name": "Production Key",
      "keyPrefix": "sk_live_xxx",
      "mode": "live",
      "isActive": true,
      "lastUsedAt": "2024-12-20T10:00:00Z",
      "createdAt": "2024-12-19T10:00:00Z"
    }
  ]
}
```

#### Create API Key

**POST** `/api-keys`

**Request:**

```json
{
  "name": "Production Key",
  "mode": "live"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "key_123",
    "name": "Production Key",
    "key": "sk_live_xxx...", // Only shown once!
    "keyPrefix": "sk_live_xxx",
    "mode": "live",
    "isActive": true,
    "createdAt": "2024-12-20T10:00:00Z"
  }
}
```

**Note:** The full key is only returned once on creation. Store it securely.

#### Revoke API Key

**POST** `/api-keys/:id/revoke`

**Request:**

```json
{
  "reason": "Security concern"
}
```

**Response:** `200 OK`

### 6.4 Webhooks (Customer Configuration)

#### List Webhook Endpoints

**GET** `/webhooks/endpoints`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "wh_123",
      "url": "https://merchant.com/webhooks",
      "subscribedEvents": ["payment.completed", "payment.failed"],
      "isActive": true,
      "totalDeliveries": 150,
      "successfulDeliveries": 148,
      "failedDeliveries": 2,
      "lastDeliveryAt": "2024-12-20T10:00:00Z",
      "createdAt": "2024-12-19T10:00:00Z"
    }
  ]
}
```

#### Create Webhook Endpoint

**POST** `/webhooks/endpoints`

**Request:**

```json
{
  "url": "https://merchant.com/webhooks",
  "subscribedEvents": [
    "payment.completed",
    "payment.failed",
    "payment.refunded"
  ]
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "wh_123",
    "url": "https://merchant.com/webhooks",
    "secret": "whsec_xxx...", // Only shown once!
    "subscribedEvents": [
      "payment.completed",
      "payment.failed",
      "payment.refunded"
    ],
    "isActive": true,
    "createdAt": "2024-12-20T10:00:00Z"
  }
}
```

#### Update Webhook Endpoint

**PATCH** `/webhooks/endpoints/:id`

**Request:**

```json
{
  "subscribedEvents": ["payment.completed"],
  "isActive": false
}
```

**Response:** `200 OK`

#### Delete Webhook Endpoint

**DELETE** `/webhooks/endpoints/:id`

**Response:** `204 No Content`

#### List Webhook Delivery Logs

**GET** `/webhooks/endpoints/:id/deliveries`

**Query Parameters:**

- `status`: Filter by status (pending, delivered, failed)
- `page`: Page number
- `limit`: Items per page

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "del_123",
      "eventType": "payment.completed",
      "status": "delivered",
      "httpStatusCode": 200,
      "attemptNumber": 1,
      "createdAt": "2024-12-20T10:00:00Z",
      "deliveredAt": "2024-12-20T10:00:01Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

### 6.5 Statistics

#### Get Statistics

**GET** `/statistics`

**Query Parameters:**

- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `currency`: Filter by currency

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalVolume": 5000000,
    "totalTransactions": 500,
    "successRate": 98.5,
    "averageAmount": 10000,
    "byProvider": {
      "paystack": {
        "volume": 3000000,
        "transactions": 300,
        "successRate": 99.0
      },
      "stripe": {
        "volume": 1500000,
        "transactions": 150,
        "successRate": 98.0
      },
      "flutterwave": {
        "volume": 500000,
        "transactions": 50,
        "successRate": 97.0
      }
    },
    "byStatus": {
      "completed": 490,
      "failed": 8,
      "pending": 2
    },
    "byCurrency": {
      "NGN": 4000000,
      "USD": 1000000
    }
  }
}
```

### 6.6 Tenant Management

#### Get Tenant Profile

**GET** `/tenant/profile`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "tenant_123",
    "name": "John Doe",
    "email": "john@example.com",
    "isEmailVerified": true,
    "status": "active",
    "companyName": "Acme Corp",
    "companyRegistrationNumber": "RC123456",
    "businessAddress": "123 Main St, Lagos, Nigeria",
    "phone": "+2348012345678",
    "defaultCurrency": "NGN",
    "timezone": "Africa/Lagos",
    "createdAt": "2024-12-19T10:00:00Z",
    "updatedAt": "2024-12-20T10:00:00Z"
  }
}
```

**Status Values:**

- `active`: Tenant account is active
- `suspended`: Tenant account is suspended
- `deleted`: Tenant account is deleted

#### Update Tenant Profile

**PATCH** `/tenant/profile`

**Request:**

```json
{
  "name": "John Doe",
  "companyName": "Acme Corp",
  "companyRegistrationNumber": "RC123456",
  "businessAddress": "123 Main St, Lagos, Nigeria",
  "phone": "+2348012345678"
}
```

**Validation:**

- `name`: Optional, string
- `companyName`: Optional, string
- `companyRegistrationNumber`: Optional, string
- `businessAddress`: Optional, string
- `phone`: Optional, string (E.164 format recommended)

**Response:** `200 OK`

**Error Codes:**

- `tenant_not_found`: Tenant ID not found
- `tenant_inactive`: Tenant account is suspended or deleted

#### Get Tenant Settings

**GET** `/tenant/settings`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "defaultCurrency": "NGN",
    "timezone": "Africa/Lagos"
  }
}
```

#### Update Tenant Settings

**PATCH** `/tenant/settings`

**Request:**

```json
{
  "defaultCurrency": "USD",
  "timezone": "America/New_York"
}
```

**Validation:**

- `defaultCurrency`: Optional, ISO 4217 code (NGN, USD, EUR, GBP, KES, GHS, ZAR)
- `timezone`: Optional, IANA timezone identifier (e.g., "Africa/Lagos", "America/New_York")

**Response:** `200 OK`

**Error Codes:**

- `invalid_currency`: Unsupported currency code
- `invalid_timezone`: Invalid timezone identifier
- `tenant_not_found`: Tenant ID not found
- `tenant_inactive`: Tenant account is suspended or deleted

#### Submit KYC

**POST** `/tenant/kyc`

**Request:**

```json
{
  "companyName": "Acme Corp",
  "companyRegistrationNumber": "RC123456",
  "businessAddress": "123 Main St, Lagos, Nigeria",
  "metadata": {
    "additionalInfo": "Any additional data"
  }
}
```

**Validation:**

- `companyName`: Required, string
- `companyRegistrationNumber`: Required, string
- `businessAddress`: Required, string
- `metadata`: Optional, object

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "pending",
    "submittedAt": "2024-12-20T10:30:00Z",
    "approvedAt": null,
    "rejectedReason": null
  }
}
```

**Status Values:**

- `pending`: KYC submitted, awaiting review
- `approved`: KYC approved (cannot resubmit)
- `rejected`: KYC rejected (can resubmit with new information)

**Error Codes:**

- `kyc_already_submitted`: KYC already submitted (can resubmit if rejected)
- `kyc_already_approved`: KYC already approved (cannot resubmit)
- `tenant_not_found`: Tenant ID not found
- `tenant_inactive`: Tenant account is suspended or deleted

**Note:** If KYC was previously rejected, you can resubmit with updated information. The previous rejection reason will be cleared.

#### Get KYC Status

**GET** `/tenant/kyc/status`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "approved",
    "submittedAt": "2024-12-19T10:00:00Z",
    "approvedAt": "2024-12-20T10:00:00Z",
    "rejectedReason": null
  }
}
```

**Status Values:**

- `pending`: KYC submitted, awaiting review
- `approved`: KYC approved
- `rejected`: KYC rejected (can resubmit)

**Error Codes:**

- `tenant_not_found`: Tenant ID not found
- `tenant_inactive`: Tenant account is suspended or deleted

---

## 7. Webhooks

### 7.1 Webhook Events

We send webhooks to your configured endpoints when events occur.

**Available Events:**

- `payment.completed`: Payment successfully completed
- `payment.failed`: Payment failed
- `payment.refunded`: Payment refunded
- `payment.partially_refunded`: Payment partially refunded
- `payment.requires_action`: Payment requires customer action

### 7.2 Webhook Payload

**Headers:**

```
X-Webhook-Signature: t=1703062800,v1=signature...
X-Webhook-Id: evt_1234567890
```

**Body:**

```json
{
  "id": "evt_1234567890",
  "type": "payment.completed",
  "data": {
    "object": "payment",
    "id": "pay_1234567890",
    "amount": 10000,
    "currency": "NGN",
    "status": "completed",
    "customerEmail": "customer@example.com",
    "provider": "paystack",
    "providerPaymentId": "ref_abc123",
    "createdAt": "2024-12-20T10:30:00Z",
    "completedAt": "2024-12-20T10:30:10Z"
  },
  "created": 1703062800
}
```

### 7.3 Webhook Signature Verification

**Algorithm:** HMAC-SHA256

**Example (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const [timestamp, signatureValue] = signature.split(',');
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureValue),
    Buffer.from(expectedSignature),
  );
}
```

### 7.4 Webhook Retry Policy

We retry failed webhook deliveries with exponential backoff:

1. Immediate
2. 1 minute later
3. 5 minutes later
4. 30 minutes later
5. 2 hours later
6. 6 hours later
7. 24 hours later

After 7 failed attempts, the webhook is marked as failed and you'll receive an email notification.

### 7.5 Webhook Response

**Success:** Return `200 OK` with any response body

**Failure:** Return any non-2xx status code to trigger retry

**Timeout:** We wait up to 10 seconds for response

---

## Appendix

### A. Idempotency

**Header:** `Idempotency-Key: unique-key-12345`

- Use the same idempotency key for retries
- Idempotency window: 24 hours
- Same request with same key returns cached response

### B. Request IDs

**Header:** `X-Request-ID: correlation-id-12345`

- Include in all requests for correlation
- Returned in response `meta.requestId`
- Use for support/debugging

### C. Supported Currencies

**V1 Supported:**

- NGN (Nigerian Naira)
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- GHS (Ghanaian Cedi)
- ZAR (South African Rand)
- KES (Kenyan Shilling)

### D. Supported Payment Methods

**V1 Supported:**

- `card`: Credit/debit card payments
- `bank_transfer`: Bank transfer payments

**V2+ (Planned):**

- `ussd`: USSD payments
- `mobile_money`: Mobile money payments
- `qr_code`: QR code payments

---

**Document Status:** Draft - Ready for Review  
**Next Steps:** Generate OpenAPI/Swagger spec, create SDK examples
