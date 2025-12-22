# Modules Directory

This directory contains all application modules following NestJS module structure.

## Usage

Import using the `@modules` alias:

```typescript
import { PaymentService } from '@modules/payment/payment.service';
import { AuthModule } from '@modules/auth/auth.module';
```

## Structure

```
modules/
├── auth/            # Authentication module
├── tenant/          # Multi-tenancy module
├── payment/         # Payment orchestration module
├── provider/        # Provider adapters module
├── webhook/         # Webhook handling module
├── ledger/          # Transaction ledger module
└── team/            # Team management module
```


