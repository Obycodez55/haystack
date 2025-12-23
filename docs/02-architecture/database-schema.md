---
title: Database Schema
---

# Database Schema Documentation

**Version:** 1.0  
**Date:** December 2024  
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Table Definitions](#3-table-definitions)
4. [Indexes](#4-indexes)
5. [Constraints](#5-constraints)
6. [Migrations](#6-migrations)
7. [Data Types & Standards](#7-data-types--standards)

---

## 1. Overview

### 1.1 Database Technology

- **Database:** PostgreSQL 15
- **Deployment:** AWS RDS Multi-AZ
- **ORM:** TypeORM or Prisma (TBD)
- **Migration Tool:** TypeORM Migrations or Prisma Migrate

### 1.2 Design Principles

- **Multi-tenancy:** All tables include `tenant_id` for isolation
- **Audit Trail:** Immutable event logs for all state changes
- **Money Handling:** Amounts stored as integers (smallest currency unit)
- **Idempotency:** Unique constraints on idempotency keys
- **Soft Deletes:** Consider for critical tables (future enhancement)

### 1.3 Naming Conventions

- **Tables:** `snake_case`, plural (e.g., `payment_events`)
- **Columns:** `snake_case` (e.g., `tenant_id`, `created_at`)
- **Foreign Keys:** `{table}_id` (e.g., `payment_id`)
- **Indexes:** `idx_{table}_{column(s)}`
- **Constraints:** `unique_{table}_{column(s)}` or descriptive names

---

## 2. Entity Relationship Diagram

```
┌─────────────┐
│   tenants   │
└──────┬──────┘
       │
       ├──────────┬──────────┬──────────┬──────────┐
       │          │          │          │          │
┌──────▼──────┐ ┌─▼──────┐ ┌─▼──────┐ ┌─▼──────┐ ┌─▼──────┐
│  api_keys   │ │payments│ │provider│ │  team  │ │  kyc   │
│             │ │        │ │ configs │ │members │ │submissions│
└─────────────┘ └───┬────┘ └─────────┘ └─────────┘ └─────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
┌───────▼──────┐ ┌─▼──────┐ ┌─▼──────┐
│payment_events│ │ledger  │ │webhook │
│              │ │entries │ │ events │
└──────────────┘ └────────┘ └────────┘
```

---

## 3. Table Definitions

### 3.1 Tenants Table

**Purpose:** Customer accounts/organizations

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  
  -- KYC Information
  kyc_status VARCHAR(50) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected', 'not_required')),
  kyc_submitted_at TIMESTAMP,
  kyc_approved_at TIMESTAMP,
  kyc_rejected_reason TEXT,
  
  -- Business Information
  company_name VARCHAR(255),
  company_registration_number VARCHAR(100), -- CAC number for Nigeria
  business_address TEXT,
  phone VARCHAR(50),
  
  -- Settings
  default_currency VARCHAR(3) DEFAULT 'NGN',
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP, -- Soft delete
  
  -- Indexes
  CONSTRAINT unique_tenant_email UNIQUE(email)
);

CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_kyc_status ON tenants(kyc_status);
CREATE INDEX idx_tenants_created ON tenants(created_at DESC);
```

### 3.2 API Keys Table

**Purpose:** API key management for tenant authentication

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Key Information
  key_hash VARCHAR(255) NOT NULL UNIQUE, -- bcrypt hash of full key
  key_prefix VARCHAR(20) NOT NULL, -- For display (pk_live_xxx, sk_test_xxx)
  name VARCHAR(255), -- User-friendly name
  
  -- Mode
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('test', 'live')),
  
  -- Usage Tracking
  last_used_at TIMESTAMP,
  last_used_ip INET,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP, -- Optional expiration
  
  -- Indexes
  CONSTRAINT unique_key_hash UNIQUE(key_hash)
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_tenant_mode ON api_keys(tenant_id, mode);
CREATE INDEX idx_api_keys_active ON api_keys(is_active, mode);
```

### 3.3 Payments Table

**Purpose:** Main payment transaction records

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Idempotency
  idempotency_key VARCHAR(255),
  
  -- Amount (stored as integers in smallest currency unit)
  amount BIGINT NOT NULL CHECK (amount > 0), -- e.g., 10000 = 100.00 NGN
  currency VARCHAR(3) NOT NULL, -- ISO 4217 (NGN, USD, EUR, etc.)
  
  -- Status
  status VARCHAR(50) NOT NULL CHECK (status IN (
    'pending',
    'processing',
    'requires_action',
    'completed',
    'failed',
    'cancelled',
    'refunded',
    'partially_refunded'
  )),
  
  -- Provider Information
  provider_name VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255), -- ID from provider (e.g., Paystack reference)
  provider_response JSONB, -- Raw provider response for debugging
  
  -- Customer Information
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  
  -- Payment Method
  payment_method VARCHAR(50) CHECK (payment_method IN ('card', 'bank_transfer', 'ussd', 'mobile_money', 'qr_code')),
  
  -- Metadata
  description TEXT,
  metadata JSONB, -- Custom metadata from customer
  
  -- Routing Information
  attempted_providers TEXT[], -- Track all providers tried (for fallback)
  selected_provider_reason TEXT, -- Why this provider was selected
  fallback_enabled BOOLEAN DEFAULT FALSE,
  
  -- Failure Information
  failure_reason TEXT,
  failure_code VARCHAR(100), -- Standardized error code
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_idempotency UNIQUE(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX idx_payments_created ON payments(created_at DESC);
CREATE INDEX idx_payments_provider ON payments(provider_name);
CREATE INDEX idx_payments_provider_id ON payments(provider_name, provider_payment_id);
CREATE INDEX idx_payments_customer_email ON payments(customer_email);
CREATE INDEX idx_payments_status_created ON payments(status, created_at DESC);
```

### 3.4 Payment Events Table

**Purpose:** Immutable audit log of all payment state changes

```sql
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  
  -- Event Information
  event_type VARCHAR(50) NOT NULL, -- 'status_changed', 'provider_called', 'webhook_received', etc.
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  
  -- Provider Information
  provider_name VARCHAR(50),
  provider_event_id VARCHAR(255), -- Provider's event ID if applicable
  
  -- Event Data
  metadata JSONB, -- Additional event data
  error_message TEXT, -- If event represents an error
  
  -- Source
  source VARCHAR(50) CHECK (source IN ('api', 'webhook', 'polling', 'retry', 'manual')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX idx_payment_events_created ON payment_events(created_at DESC);
CREATE INDEX idx_payment_events_type ON payment_events(event_type);
CREATE INDEX idx_payment_events_provider ON payment_events(provider_name, provider_event_id);
```

### 3.5 Ledger Entries Table

**Purpose:** Double-entry bookkeeping for all financial transactions

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL, -- Nullable for non-payment entries
  
  -- Account Information
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'revenue', 'expense')),
  account_name VARCHAR(100) NOT NULL, -- 'customer_balance', 'platform_revenue', 'provider_fee', etc.
  
  -- Amount (Double-entry: debit/credit)
  debit_amount BIGINT DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount BIGINT DEFAULT 0 CHECK (credit_amount >= 0),
  currency VARCHAR(3) NOT NULL,
  
  -- Entry Information
  entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('payment', 'refund', 'fee', 'settlement', 'adjustment')),
  description TEXT,
  
  -- Reference
  reference_id VARCHAR(255), -- External reference (provider transaction ID, etc.)
  
  -- Timestamps (Immutable)
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);
CREATE INDEX idx_ledger_payment ON ledger_entries(payment_id);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_account ON ledger_entries(account_type, account_name);
CREATE INDEX idx_ledger_entry_type ON ledger_entries(entry_type);
```

### 3.6 Webhook Events Table

**Purpose:** Store all webhooks received from providers

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL,
  
  -- Event Information
  event_id VARCHAR(255) NOT NULL, -- Provider's event ID
  event_type VARCHAR(100) NOT NULL, -- 'payment.completed', 'payment.failed', etc.
  payload JSONB NOT NULL, -- Raw webhook payload
  signature VARCHAR(500), -- Provider's signature for verification
  
  -- Processing Status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  processing_attempts INT DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMP,
  
  -- Payment Association
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_provider_event UNIQUE(provider_name, event_id)
);

CREATE INDEX idx_webhook_processed ON webhook_events(processed, created_at);
CREATE INDEX idx_webhook_provider ON webhook_events(provider_name);
CREATE INDEX idx_webhook_payment ON webhook_events(payment_id);
CREATE INDEX idx_webhook_tenant ON webhook_events(tenant_id);
CREATE INDEX idx_webhook_unprocessed ON webhook_events(processed, created_at) WHERE processed = FALSE;
```

### 3.7 Provider Configs Table

**Purpose:** Store encrypted provider API keys and configuration

```sql
CREATE TABLE provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Provider Information
  provider_name VARCHAR(50) NOT NULL CHECK (provider_name IN ('paystack', 'stripe', 'flutterwave', 'monnify', 'paypal', 'quickteller')),
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('test', 'live')),
  
  -- Credentials (Encrypted with AWS KMS)
  public_key_encrypted TEXT, -- Encrypted public key
  secret_key_encrypted TEXT, -- Encrypted secret key
  webhook_secret_encrypted TEXT, -- Encrypted webhook secret
  
  -- Settings
  is_enabled BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0, -- For routing logic (lower = higher priority)
  supported_currencies TEXT[], -- Currencies this provider supports for this tenant
  supported_countries TEXT[], -- Countries this provider supports
  
  -- Health & Status
  last_health_check_at TIMESTAMP,
  health_status VARCHAR(50) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
  success_rate DECIMAL(5,2), -- Last 24h success rate
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_tenant_provider UNIQUE(tenant_id, provider_name, mode)
);

CREATE INDEX idx_provider_configs_tenant ON provider_configs(tenant_id);
CREATE INDEX idx_provider_configs_enabled ON provider_configs(tenant_id, is_enabled, mode);
CREATE INDEX idx_provider_configs_priority ON provider_configs(tenant_id, priority, is_enabled);
```

### 3.8 Team Members Table

**Purpose:** Team/organization member management

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID, -- Reference to users table (if separate) or email
  
  -- Member Information
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  
  -- Role
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
  
  -- Invitation
  invitation_token VARCHAR(255) UNIQUE,
  invitation_sent_at TIMESTAMP,
  invitation_expires_at TIMESTAMP,
  accepted_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
  
  -- Permissions (JSONB for flexibility)
  permissions JSONB, -- Additional permissions beyond role
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  removed_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_tenant_email UNIQUE(tenant_id, email)
);

CREATE INDEX idx_team_members_tenant ON team_members(tenant_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_status ON team_members(tenant_id, status);
CREATE INDEX idx_team_members_invitation ON team_members(invitation_token) WHERE invitation_token IS NOT NULL;
```

### 3.9 Customer Webhook Endpoints Table

**Purpose:** Customer webhook endpoint configuration

```sql
CREATE TABLE customer_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Endpoint Information
  url TEXT NOT NULL,
  secret VARCHAR(255) NOT NULL, -- For HMAC signature generation
  
  -- Event Subscriptions
  subscribed_events TEXT[] NOT NULL, -- ['payment.completed', 'payment.failed', etc.]
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Statistics
  total_deliveries INT DEFAULT 0,
  successful_deliveries INT DEFAULT 0,
  failed_deliveries INT DEFAULT 0,
  last_delivery_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_webhook_endpoints_tenant ON customer_webhook_endpoints(tenant_id);
CREATE INDEX idx_webhook_endpoints_active ON customer_webhook_endpoints(tenant_id, is_active);
```

### 3.10 Webhook Delivery Logs Table

**Purpose:** Track webhook deliveries to customers

```sql
CREATE TABLE webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint_id UUID NOT NULL REFERENCES customer_webhook_endpoints(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Delivery Information
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  signature VARCHAR(500) NOT NULL, -- HMAC signature
  
  -- Delivery Status
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  http_status_code INT,
  response_body TEXT,
  
  -- Retry Information
  attempt_number INT DEFAULT 1,
  max_attempts INT DEFAULT 7,
  next_retry_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP
);

CREATE INDEX idx_webhook_delivery_endpoint ON webhook_delivery_logs(endpoint_id);
CREATE INDEX idx_webhook_delivery_status ON webhook_delivery_logs(status, next_retry_at);
CREATE INDEX idx_webhook_delivery_payment ON webhook_delivery_logs(payment_id);
CREATE INDEX idx_webhook_delivery_retry ON webhook_delivery_logs(status, next_retry_at) WHERE status IN ('pending', 'retrying');
```

### 3.11 Audit Logs Table

**Purpose:** Security audit trail for all sensitive actions

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID, -- User who performed action
  
  -- Action Information
  action VARCHAR(100) NOT NULL, -- 'payment.created', 'api_key.revoked', 'provider.added', etc.
  resource_type VARCHAR(50) NOT NULL, -- 'payment', 'api_key', 'provider', 'team_member'
  resource_id UUID,
  
  -- Request Information
  ip_address INET,
  user_agent TEXT,
  request_id UUID, -- Correlation ID
  
  -- Action Details
  metadata JSONB, -- Full details of action
  changes JSONB, -- Before/after for updates
  
  -- Result
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);
```

### 3.12 KYC Submissions Table

**Purpose:** Store KYC documents and information

```sql
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Submission Information
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  
  -- Documents (S3 URLs)
  cac_certificate_url TEXT,
  directors_id_urls TEXT[], -- Array of ID document URLs
  proof_of_address_url TEXT,
  bank_statement_url TEXT,
  
  -- Review Information
  reviewed_by UUID, -- Admin user ID
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_kyc_tenant ON kyc_submissions(tenant_id);
CREATE INDEX idx_kyc_status ON kyc_submissions(status);
```

---

## 4. Indexes

### 4.1 Performance-Critical Indexes

All indexes are defined above with table definitions. Key indexes:

- **Tenant isolation:** All tables have `idx_{table}_tenant` for multi-tenancy
- **Status queries:** `idx_payments_tenant_status`, `idx_webhook_processed`
- **Time-based queries:** `idx_payments_created`, `idx_payment_events_created`
- **Provider lookups:** `idx_payments_provider_id` (composite)
- **Retry jobs:** `idx_webhook_delivery_retry` (partial index)

### 4.2 Index Maintenance

- Monitor index usage with `pg_stat_user_indexes`
- Consider partial indexes for filtered queries
- Review and optimize quarterly

---

## 5. Constraints

### 5.1 Foreign Key Constraints

- All foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` appropriately
- Payments cascade delete (audit trail preserved in events)
- Webhook events set null on payment delete (preserve webhook history)

### 5.2 Check Constraints

- Status fields use CHECK constraints for valid values
- Amount fields check for positive values
- Mode fields restricted to 'test'/'live'

### 5.3 Unique Constraints

- `unique_idempotency` on payments (tenant_id + idempotency_key)
- `unique_provider_event` on webhook_events (provider_name + event_id)
- `unique_tenant_provider` on provider_configs (tenant_id + provider_name + mode)

---

## 6. Migrations

### 6.1 Migration Strategy

- Use TypeORM Migrations or Prisma Migrate
- One migration per logical change
- Include both `up` and `down` migrations
- Test migrations on staging before production

### 6.2 Migration Naming

Format: `{timestamp}-{description}.ts`

Examples:
- `1701234567890-CreateTenantsTable.ts`
- `1701234567891-CreatePaymentsTable.ts`
- `1701234567892-AddPaymentMethodColumn.ts`

### 6.3 Initial Migration Order

1. tenants
2. api_keys
3. provider_configs
4. payments
5. payment_events
6. ledger_entries
7. webhook_events
8. customer_webhook_endpoints
9. webhook_delivery_logs
10. team_members
11. kyc_submissions
12. audit_logs

---

## 7. Data Types & Standards

### 7.1 Money Handling

- **Amount:** `BIGINT` (stored in smallest currency unit)
  - NGN: kobo (100 kobo = 1 NGN)
  - USD: cents (100 cents = 1 USD)
  - JPY: yen (no decimal places)
- **Currency:** `VARCHAR(3)` (ISO 4217 codes)

### 7.2 Timestamps

- All tables have `created_at` and `updated_at`
- Use `TIMESTAMP DEFAULT NOW()`
- Use `updated_at` trigger for automatic updates

### 7.3 UUIDs

- All primary keys use `UUID DEFAULT gen_random_uuid()`
- Foreign keys reference UUIDs
- Better for distributed systems and security

### 7.4 JSONB

- Used for flexible metadata
- Indexed with GIN indexes for queries
- Examples: `payments.metadata`, `webhook_events.payload`

### 7.5 Text Fields

- Use `TEXT` for variable-length strings
- Use `VARCHAR(n)` for fixed-length strings with known max
- Use `JSONB` for structured data

---

## Appendix

### A. Sample Queries

**Get payments for tenant:**
```sql
SELECT * FROM payments 
WHERE tenant_id = $1 
ORDER BY created_at DESC 
LIMIT 50;
```

**Get payment with events:**
```sql
SELECT p.*, 
       json_agg(pe.*) as events
FROM payments p
LEFT JOIN payment_events pe ON pe.payment_id = p.id
WHERE p.id = $1 AND p.tenant_id = $2
GROUP BY p.id;
```

**Get unprocessed webhooks:**
```sql
SELECT * FROM webhook_events
WHERE processed = FALSE
ORDER BY created_at ASC
LIMIT 100;
```

### B. Maintenance Queries

**Archive old data:**
```sql
-- Move payments older than 13 months to archive
INSERT INTO payments_archive 
SELECT * FROM payments 
WHERE created_at < NOW() - INTERVAL '13 months';
```

**Cleanup expired idempotency keys:**
```sql
-- Idempotency handled in Redis, but cleanup old payment records
DELETE FROM payments 
WHERE idempotency_key IS NOT NULL 
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status IN ('completed', 'failed', 'cancelled');
```

---

**Document Status:** Draft - Ready for Review  
**Next Steps:** Create migration files, test schema, add sample data


