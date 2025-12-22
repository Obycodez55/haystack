# Common Module

Global module that provides shared services and utilities used across the application.

## Overview

The Common Module is a **global module** that registers:
- **Configuration**: Centralized, validated configuration for all services
- **Logging**: Structured logging with Pino, correlation IDs, and sensitive data filtering

## Structure

```
src/common/
├── common.module.ts    # Main module (global)
├── logging/            # Logging module
│   ├── services/
│   ├── middleware/
│   ├── interceptors/
│   └── ...
└── index.ts            # Public exports
```

## Usage

### Import in AppModule

```typescript
import { CommonModule } from '@common';

@Module({
  imports: [CommonModule],
  // ...
})
export class AppModule {}
```

### Using Services

All services from CommonModule are available globally via dependency injection:

```typescript
import { LoggerService } from '@common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
  ) {
    this.logger.setContext('PaymentService');
  }
}
```

## Available Services

### LoggerService

Structured logging with correlation IDs and sensitive data filtering.

```typescript
import { LoggerService } from '@common';

this.logger.log('Payment processed', { paymentId, amount });
this.logger.error('Payment failed', error, { paymentId });
```

See [Logging README](./logging/README.md) for full documentation.

### ConfigService

Access validated configuration:

```typescript
import { ConfigService } from '@nestjs/config';

const appConfig = this.configService.get('app');
const dbConfig = this.configService.get('database');
```

See [Config README](../config/README.md) for full documentation.

### CorrelationMiddleware

HTTP middleware for correlation ID tracking. Automatically applied in AppModule.

## Module Registration

The CommonModule is registered in `AppModule`:

```typescript
// src/app.module.ts
import { CommonModule } from '@common';

@Module({
  imports: [CommonModule], // Global module
  // ...
})
export class AppModule {}
```

Since it's global, you don't need to import it in other modules - all its exports are available everywhere.

## Adding New Common Services

To add a new common service:

1. Create the service in `src/common/`:

```typescript
// src/common/my-service/my-service.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyService {
  // ...
}
```

2. Create a module for it:

```typescript
// src/common/my-service/my-service.module.ts
import { Module } from '@nestjs/common';
import { MyService } from './my-service.service';

@Module({
  providers: [MyService],
  exports: [MyService],
})
export class MyServiceModule {}
```

3. Import in `common.module.ts`:

```typescript
import { MyServiceModule } from './my-service/my-service.module';

@Global()
@Module({
  imports: [ConfigModule, LoggingModule, MyServiceModule],
  exports: [ConfigModule, LoggingModule, MyServiceModule],
})
export class CommonModule {}
```

4. Export from `common/index.ts`:

```typescript
export * from './my-service';
```

## Best Practices

1. **Keep it common**: Only add services that are used across multiple modules
2. **Global scope**: CommonModule is global, so be mindful of what you export
3. **Type safety**: Use TypeScript interfaces for all configurations
4. **Documentation**: Document all services and their usage
