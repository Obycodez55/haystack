# Config Module

This directory contains configuration modules for database, Redis, application settings, etc.

## Usage

Import using the `@config` alias:

```typescript
import { DatabaseConfig } from '@config/database.config';
import { RedisConfig } from '@config/redis.config';
```

## Structure

```
config/
├── database.config.ts    # PostgreSQL configuration
├── redis.config.ts       # Redis configuration
├── app.config.ts         # Application configuration
└── validation.ts         # Environment variable validation
```


