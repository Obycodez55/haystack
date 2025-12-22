# Haystack - Payment Orchestration Service

> A unified API platform that enables businesses to accept payments through multiple payment providers with a single integration.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey.svg)]()

---

## 🎯 What is Haystack?

Haystack is a payment orchestration service that aggregates multiple payment providers (Paystack, Stripe, Flutterwave) into a single, unified API. It provides intelligent routing, automatic fallback, comprehensive reconciliation, and actionable insights.

### The Problem We Solve

**For E-commerce Businesses:**
- 💸 **Lost Revenue**: 8-10% of potential revenue lost due to payment failures
- ⏱️ **Integration Time**: 3+ months and $15k-30k to integrate multiple providers
- 📊 **Manual Reconciliation**: 4+ hours daily spent matching transactions across providers
- 🔒 **Vendor Lock-in**: Dependent on single provider with no negotiating power

**For Developers:**
- 🔧 **Complex Integration**: Different APIs, webhooks, and error codes for each provider
- 🔄 **Fallback Complexity**: Must build retry logic from scratch
- 🛠️ **Maintenance Burden**: Constant updates as provider APIs change

### Our Solution

- ⚡ **3 Months → 2 Hours**: One integration instead of multiple
- 📈 **8% → 99%+ Success Rate**: Automatic fallback across providers
- ⏰ **4 Hours → 15 Minutes**: Automated reconciliation
- 🔓 **Provider Independence**: Switch providers without code changes

---

## ✨ Key Features

### 🚀 Core Features (MVP)

- **Unified Payment API**: Single integration for multiple providers
- **Intelligent Routing**: Priority-based provider selection
- **Automatic Fallback**: Seamless failover when providers are down
- **Multi-Provider Support**: Paystack, Stripe, and Flutterwave
- **Webhook Infrastructure**: Reliable incoming and outgoing webhooks
- **State Management**: Robust payment state machine with audit trail
- **Multi-Tenancy**: Secure tenant isolation with API key management
- **Team Management**: Role-based access control (Owner, Admin, Developer, Viewer)
- **Dashboard**: Web-based dashboard for payment management
- **Reconciliation**: Automated transaction matching and reporting

### 🔒 Security & Compliance

- API key authentication (publishable/secret keys)
- Test and Live mode separation
- Row-level security for multi-tenancy
- Encrypted provider credentials
- Comprehensive audit logging
- Rate limiting and request validation

---

## 🏗️ Architecture

### Technology Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Queue**: BullMQ
- **Deployment**: AWS (ECS Fargate/EKS, RDS, ElastiCache)

### Architecture Pattern

- **Modular Monolith**: Start simple, extract services later if needed
- **Adapter Pattern**: Unified interface for all payment providers
- **Repository Pattern**: Abstract data access layer
- **Event-Driven**: Webhooks and async job processing

### Module Structure

```
src/
├── modules/
│   ├── auth/          # Authentication & API keys
│   ├── tenant/        # Multi-tenancy
│   ├── payment/       # Payment orchestration
│   ├── provider/      # Provider adapters
│   ├── webhook/       # Webhook handling
│   ├── ledger/         # Transaction ledger
│   └── team/          # Team management
├── common/            # Shared utilities, errors, guards
└── config/            # Configuration modules
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd haystack

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start services (PostgreSQL, Redis)
docker-compose up -d

# Run database migrations
pnpm run migration:run

# Start development server
pnpm run start:dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/haystack

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (for provider credentials)
ENCRYPTION_KEY=your-encryption-key
```

---

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Product Requirements Document](./docs/01-product/PRD.md)** - Product vision and requirements
- **[Technical Architecture](./docs/02-architecture/technical-architecture.md)** - System architecture and design
- **[Database Schema](./docs/02-architecture/database-schema.md)** - Complete database schema
- **[API Specification](./docs/04-api/api-specification.md)** - API endpoints and examples
- **[Provider Integration Guide](./docs/06-providers/provider-integration-guide.md)** - Provider-specific details
- **[Development Roadmap](./docs/03-planning/development-roadmap.md)** - Development timeline

---

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm run start:dev      # Start in watch mode
pnpm run start:debug    # Start in debug mode

# Building
pnpm run build          # Build for production
pnpm run start:prod     # Start production server

# Testing
pnpm run test           # Run unit tests
pnpm run test:watch     # Run tests in watch mode
pnpm run test:cov       # Generate coverage report
pnpm run test:e2e       # Run end-to-end tests

# Code Quality
pnpm run lint           # Run ESLint
pnpm run format         # Format code with Prettier
```

### Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
import { BaseError } from '@common/errors/base.error';
import { PaymentService } from '@modules/payment/payment.service';
import { DatabaseConfig } from '@config/database.config';
```

Available aliases:
- `@common/*` → `src/common/*`
- `@modules/*` → `src/modules/*`
- `@config/*` → `src/config/*`

---

## 🧪 Testing

```bash
# Run all tests
pnpm run test

# Run with coverage
pnpm run test:cov

# Run e2e tests
pnpm run test:e2e
```

---

## 📊 Project Status

**Current Phase**: Phase 1 - Foundation (Weeks 1-2)

- ✅ Project setup and path aliases
- ⏳ Database schema implementation
- ⏳ Authentication & multi-tenancy
- ⏳ API key management

See [Development Roadmap](./docs/03-planning/development-roadmap.md) for detailed timeline.

---

## 🤝 Contributing

This is currently a private project. Contribution guidelines will be added as the project evolves.

---

## 📄 License

UNLICENSED - All rights reserved

---

## 🔗 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Paystack API Docs](https://paystack.com/docs/api)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Flutterwave API Docs](https://developer.flutterwave.com/docs)

---

## 📧 Support

For questions and support, please refer to the documentation or create an issue in the repository.

---

**Built with ❤️ for African businesses**
