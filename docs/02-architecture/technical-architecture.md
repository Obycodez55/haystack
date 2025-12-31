---
title: Technical Architecture
---

# Technical Architecture Document

**Version:** 1.0  
**Date:** December 2024  
**Status:** Draft

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Patterns](#2-architecture-patterns)
3. [Technology Stack](#3-technology-stack)
4. [Module Design](#4-module-design)
5. [Data Architecture](#5-data-architecture)
6. [Integration Architecture](#6-integration-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Scalability Design](#8-scalability-design)
9. [Deployment Architecture](#9-deployment-architecture)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
                        Internet
                           │
                           ▼
                  ┌─────────────────┐
                  │   CloudFlare    │  (DDoS protection, CDN)
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │  AWS ALB/API GW │  (Load balancer, SSL, WAF)
                  └────────┬────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐  ┌──────▼───────┐  ┌──────▼───────┐
│   NestJS App   │  │  NestJS App  │  │  NestJS App  │  (Auto-scaled)
│   Instance 1   │  │  Instance 2  │  │  Instance N  │
└───────┬────────┘  └──────┬───────┘  └──────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐  ┌──────▼───────┐  ┌──────▼───────┐
│   PostgreSQL   │  │     Redis    │  │   BullMQ     │
│   (RDS Multi-  │  │  ElastiCache │  │   (Amazon    │
│      AZ)       │  │   Cluster    │  │     MQ)      │
└────────────────┘  └──────────────┘  └──────────────┘
```

### 1.2 Component Breakdown

**API Layer:**

- NestJS application (modular monolith)
- RESTful API endpoints
- Webhook receivers
- Health check endpoints

**Business Logic Layer:**

- Payment orchestration service
- Provider adapter factory
- State machine management
- Retry and fallback logic

**Data Layer:**

- PostgreSQL (primary database)
- Redis (caching, locks, idempotency)
- BullMQ (job queue)

**External Integrations:**

- Payment providers (Paystack, Stripe, Flutterwave)
- AWS services (KMS, Secrets Manager, CloudWatch)

### 1.3 Key Design Principles

1. **Modular Monolith**: Start simple, extract services later if needed
2. **Adapter Pattern**: Unified interface for all providers
3. **Repository Pattern**: Abstract data access
4. **Event-Driven**: Webhooks and async job processing
5. **Idempotency**: All operations are idempotent
6. **Security First**: Encryption, audit logs, least privilege

---

## 2. Architecture Patterns

### 2.1 Modular Monolith

**Why:**

- Faster development (solo developer)
- Easier debugging
- Simpler deployment
- Lower infrastructure costs
- Can extract to microservices later

**Structure:**

```
src/
├── modules/
│   ├── payment/          # Payment orchestration
│   ├── provider/         # Provider adapters
│   ├── webhook/          # Webhook handling
│   ├── ledger/           # Transaction ledger
│   ├── auth/             # Authentication
│   └── tenant/           # Multi-tenancy
```

**Future Decomposition:**

- Modules communicate via interfaces (DI)
- Each module has own database tables
- No direct DB access across modules
- Event-driven communication
- Can extract webhook service first (spiky traffic)

### 2.2 Adapter Pattern

**Provider Adapter Interface:**

```typescript
interface IPaymentProvider {
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  refundPayment(request: RefundRequest): Promise<RefundResponse>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: any): WebhookEvent;
}
```

**Benefits:**

- Unified interface for all providers
- Easy to add new providers
- Testable (mock adapters)
- Provider-specific logic isolated

### 2.3 Factory Pattern

**Provider Factory:**

- Creates appropriate adapter based on provider name
- Handles provider configuration
- Manages adapter lifecycle

### 2.4 Repository Pattern

**Data Access Abstraction:**

- Repository interfaces define data operations
- Implementation details hidden from services
- Easy to swap data sources
- Testable (mock repositories)

### 2.5 State Machine Pattern

**Payment State Transitions:**

```
pending → processing → completed
                    → failed
                    → requires_action → completed
                                    → failed
```

**Benefits:**

- Enforces valid state transitions
- Prevents invalid operations
- Clear audit trail

---

## 3. Technology Stack

### 3.1 Backend Framework

**NestJS (TypeScript)**

- **Why:** Enterprise-grade, structured, DI built-in
- **Benefits:** Modular architecture, decorators, guards, interceptors
- **Version:** Latest stable (v10+)

### 3.2 Database

**PostgreSQL 15**

- **Why:** ACID compliance, JSONB support, excellent for financial data
- **Features:** Transactions, foreign keys, indexes, full-text search
- **Deployment:** AWS RDS Multi-AZ

### 3.3 Caching & Queue

**Redis 7**

- **Why:** Fast, supports multiple data structures
- **Use Cases:** Idempotency keys, distributed locks, caching, session storage
- **Deployment:** AWS ElastiCache

**BullMQ / RabbitMQ**

- **Why:** Reliable job processing
- **Use Cases:** Payment retries, webhook delivery, reconciliation jobs
- **Deployment:** AWS MQ or self-hosted

### 3.4 Infrastructure

**AWS Services:**

- **ECS Fargate / EKS:** Container orchestration
- **RDS:** Managed PostgreSQL
- **ElastiCache:** Managed Redis
- **Secrets Manager:** API key storage
- **KMS:** Encryption key management
- **CloudWatch:** Monitoring and logging
- **ALB:** Load balancing

**Docker:**

- Containerization for local development
- Docker Compose for local stack

### 3.5 Development Tools

- **TypeScript:** Type safety
- **ESLint + Prettier:** Code quality
- **Jest:** Testing framework
- **TypeORM / Prisma:** ORM (TBD)
- **Swagger/OpenAPI:** API documentation

---

## 4. Module Design

### 4.1 Payment Module

**Responsibilities:**

- Payment creation and management
- State machine enforcement
- Payment status tracking
- Payment history

**Key Components:**

- `PaymentController`: HTTP endpoints
- `PaymentService`: Business logic
- `PaymentRepository`: Data access
- `PaymentStateMachine`: State transitions
- `PaymentEntity`: Database entity

**Dependencies:**

- Provider Module (for routing)
- Ledger Module (for audit trail)
- Tenant Module (for isolation)

### 4.2 Provider Module

**Responsibilities:**

- Provider adapter management
- Provider factory
- Provider configuration
- Provider health checks

**Key Components:**

- `ProviderFactory`: Creates adapters
- `ProviderService`: Provider orchestration
- `ProviderConfigService`: Configuration management
- `adapters/`: Provider-specific implementations
  - `paystack/`
  - `stripe/`
  - `flutterwave/`
  - `base.adapter.ts`: Base class

**Adapter Structure:**

```
adapters/
├── base.adapter.ts          # Abstract base class
├── paystack/
│   ├── paystack.adapter.ts
│   ├── paystack.types.ts
│   └── paystack.errors.ts
├── stripe/
│   └── stripe.adapter.ts
└── flutterwave/
    └── flutterwave.adapter.ts
```

### 4.3 Webhook Module

**Responsibilities:**

- Receive webhooks from providers
- Verify webhook signatures
- Process webhook events
- Send webhooks to customers

**Key Components:**

- `WebhookController`: Webhook endpoints
- `WebhookService`: Processing logic
- `WebhookProcessor`: Async processing
- `SignatureVerifier`: Signature validation
- `WebhookDeliveryService`: Customer webhooks

### 4.4 Ledger Module

**Responsibilities:**

- Double-entry bookkeeping
- Immutable transaction log
- Balance calculations
- Audit trail

**Key Components:**

- `LedgerService`: Ledger operations
- `LedgerEntryEntity`: Database entity
- `LedgerRepository`: Data access

### 4.5 Auth Module

**Responsibilities:**

- API key authentication
- JWT authentication (for dashboard)
- Password management
- 2FA support

**Key Components:**

- `AuthController`: Auth endpoints
- `AuthService`: Authentication logic
- `ApiKeyGuard`: API key validation
- `JwtStrategy`: JWT validation

### 4.6 Tenant Module

**Responsibilities:**

- Multi-tenancy management
- Tenant isolation
- Row-level security
- Tenant context

**Key Components:**

- `TenantService`: Tenant operations
- `TenantEntity`: Database entity
- `TenantMiddleware`: Request context
- `TenantGuard`: Tenant validation

---

## 5. Data Architecture

### 5.1 Database Schema Overview

**Core Tables:**

- `tenants`: Customer accounts
- `api_keys`: API key management
- `payments`: Payment records
- `payment_events`: State change audit log
- `ledger_entries`: Double-entry ledger
- `webhook_events`: Incoming webhooks
- `provider_configs`: Provider configurations
- `team_members`: Team management
- `audit_logs`: Security audit trail

### 5.2 Data Relationships

```
tenants (1) ──→ (N) api_keys
tenants (1) ──→ (N) payments
tenants (1) ──→ (N) provider_configs
tenants (1) ──→ (N) team_members

payments (1) ──→ (N) payment_events
payments (1) ──→ (N) ledger_entries
payments (1) ──→ (N) webhook_events
```

### 5.3 Caching Strategy

**Redis Usage:**

- **Idempotency Keys:** 24-hour TTL
- **Distributed Locks:** 30-second TTL (with renewal)
- **Payment Status:** 5-minute TTL
- **Provider Health:** 1-minute TTL
- **Rate Limiting:** Sliding window counters

### 5.4 Data Retention

- **Hot Data:** Last 13 months (main database)
- **Warm Data:** 14 months - 7 years (archive database/S3)
- **Cold Data:** > 7 years (compressed S3, Glacier)

---

## 6. Integration Architecture

### 6.1 Provider Integration Flow

```
Customer API Request
    ↓
Payment Service
    ↓
Provider Factory (selects provider)
    ↓
Provider Adapter (Paystack/Stripe/Flutterwave)
    ↓
Provider API (HTTP call)
    ↓
Response Processing
    ↓
Database Update
    ↓
Webhook to Customer
```

### 6.2 Webhook Flow

```
Provider Webhook
    ↓
Webhook Controller (signature verification)
    ↓
Webhook Queue (BullMQ)
    ↓
Webhook Processor (async)
    ↓
Payment Status Update
    ↓
Customer Webhook (if configured)
```

### 6.3 API Design

**RESTful Principles:**

- Resource-based URLs
- HTTP methods (GET, POST, PATCH, DELETE)
- Status codes (200, 201, 400, 401, 404, 500)
- JSON request/response
- API versioning (/v1/)

**Response Format:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  }
}
```

---

## 7. Security Architecture

### 7.1 Authentication

**API Keys:**

- Hashed with bcrypt
- Never logged or exposed
- Rotation capability
- Test vs Live mode separation

**Dashboard Authentication:**

- JWT tokens
- Refresh token mechanism
- 2FA support (TOTP)

### 7.2 Encryption

**At Rest:**

- Provider API keys: Encrypted with AWS KMS
- Database: RDS encryption enabled
- Backups: Encrypted

**In Transit:**

- TLS 1.3 for all connections
- HTTPS only
- Certificate management via AWS Certificate Manager

### 7.3 Access Control

**Row-Level Security:**

- All queries scoped to tenant
- Database-level policies
- Application-level guards

**Role-Based Access Control:**

- Owner: Full access
- Admin: Manage team, live mode
- Developer: Test mode only
- Viewer: Read-only

### 7.4 Audit Logging

**Logged Events:**

- API key creation/revocation
- Provider configuration changes
- Payment creation/refund
- KYC submission/approval
- Team member changes
- Settings changes

**Log Format:**

- Structured JSON logs
- Correlation IDs
- Timestamps
- User/IP tracking

---

## 8. Scalability Design

### 8.1 Horizontal Scaling

**Application:**

- Stateless design (all state in database/Redis)
- Auto-scaling based on CPU/memory
- Load balancer distributes traffic

**Database:**

- Read replicas for reporting queries
- Connection pooling
- Query optimization

**Cache:**

- Redis cluster mode (future)
- Cache warming strategies
- Cache invalidation policies

### 8.2 Performance Optimization

**Database:**

- Proper indexing
- Query optimization
- N+1 query prevention
- Batch operations

**Caching:**

- Aggressive caching of read-heavy data
- Cache-aside pattern
- TTL management

**Async Processing:**

- Webhook processing in background
- Reconciliation jobs in queue
- Retry logic with exponential backoff

### 8.3 Future Microservices Extraction

**Potential Services:**

1. **Webhook Service** (first candidate - spiky traffic)
2. **Background Jobs Service** (async processing)
3. **Analytics Service** (reporting queries)

**Migration Strategy:**

- Design modules as bounded contexts
- Use message queue for inter-service communication
- Gradual extraction, not big bang

---

## 9. Deployment Architecture

### 9.1 AWS Infrastructure

**Compute:**

- ECS Fargate (or EKS)
- Auto-scaling: 2-10 tasks
- Task definition: 1 vCPU, 2GB RAM

**Database:**

- RDS PostgreSQL 15
- Multi-AZ deployment
- Automated backups (7 days)
- Point-in-time recovery

**Cache:**

- ElastiCache Redis 7
- Node type: cache.t4g.medium

**Message Queue:**

- Amazon MQ (RabbitMQ) or SQS + SNS

**Networking:**

- VPC with public/private subnets
- NAT Gateway
- Security groups (least privilege)

**Monitoring:**

- CloudWatch (metrics, logs)
- X-Ray (distributed tracing)
- CloudWatch Alarms

### 9.2 CI/CD Pipeline

**GitHub Actions:**

1. **Lint & Format:** ESLint, Prettier
2. **Tests:** Unit, integration, E2E
3. **Build:** Docker image
4. **Security Scan:** npm audit, Snyk
5. **Deploy:** ECS Fargate update

**Environments:**

- Development
- Staging
- Production

### 9.3 Disaster Recovery

**Backup Strategy:**

- Automated daily backups
- 30-day retention (RDS)
- 7-year retention (S3)
- Cross-region replication (future)

**RTO/RPO:**

- RTO: 1 hour (target)
- RPO: 5 minutes (point-in-time recovery)

---

## Appendix

### A. Architecture Decision Records (ADRs)

**ADR-001: Modular Monolith vs Microservices**

- **Decision:** Start with modular monolith
- **Rationale:** Solo developer, faster development, can extract later
- **Date:** Dec 2024

**ADR-002: PostgreSQL vs MongoDB**

- **Decision:** PostgreSQL
- **Rationale:** ACID compliance, financial data, JSONB support
- **Date:** Dec 2024

**ADR-003: Aggregator vs Facilitator Model**

- **Decision:** Aggregator model
- **Rationale:** No regulatory burden, faster to market, customer trust
- **Date:** Dec 2024

---

**Document Status:** Draft - In Progress  
**Next Review Date:** TBD
