# Configuration Module

Centralized configuration management with validation for all services.

## Features

- ✅ **Type-Safe Configuration**: TypeScript interfaces for all configs
- ✅ **Environment Validation**: Joi schema validation on startup
- ✅ **Namespaced Configs**: Organized by service (app, database, redis, etc.)
- ✅ **Multiple Env Files**: Supports `.env.local` and `.env`
- ✅ **Default Values**: Sensible defaults for development

## Configuration Files

### App Config (`app.config.ts`)
- Application name, version, environment
- Port, API version, global prefix

### Database Config (`database.config.ts`)
- PostgreSQL connection settings
- Connection pool configuration
- SSL settings

### Redis Config (`redis.config.ts`)
- Redis connection settings
- TTL defaults
- Retry configuration

### Logging Config (`logging.config.ts`)
- Log level, pretty printing
- File logging settings

### JWT Config (`jwt.config.ts`)
- JWT secrets and expiration times
- Refresh token configuration

## Usage

### Accessing Configuration

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  constructor(private configService: ConfigService) {
    // Access namespaced config
    const appConfig = this.configService.get('app');
    const dbConfig = this.configService.get('database');
    
    console.log(appConfig.name); // 'haystack'
    console.log(dbConfig.host); // 'localhost'
  }
}
```

### Type-Safe Access

```typescript
import { ConfigService } from '@nestjs/config';
import { AppConfig, DatabaseConfig } from '@config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {
    const appConfig = this.configService.get<AppConfig>('app');
    const dbConfig = this.configService.get<DatabaseConfig>('database');
    
    // TypeScript will autocomplete and type-check
    const port = appConfig.port; // number
    const host = dbConfig.host; // string
  }
}
```

## Environment Variables

### Required Variables

```bash
# JWT (required for authentication)
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
```

### Optional Variables (with defaults)

```bash
# App
NODE_ENV=development
APP_NAME=haystack
APP_VERSION=0.0.1
PORT=3000
API_VERSION=v1
GLOBAL_PREFIX=api

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=haystack
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_TTL=3600

# Logging
LOG_LEVEL=info
LOG_PRETTY=true
LOG_FILE_ENABLED=false
LOG_DIR=logs
```

## Validation

Configuration is validated on application startup using Joi schemas. Invalid configurations will cause the application to fail fast with clear error messages.

### Validation Rules

- **NODE_ENV**: Must be 'development', 'staging', or 'production'
- **LOG_LEVEL**: Must be 'error', 'warn', 'info', 'debug', or 'verbose'
- **JWT_SECRET**: Required (no default)
- **JWT_REFRESH_SECRET**: Required (no default)
- **Ports**: Must be valid numbers
- **Booleans**: Must be 'true' or 'false' strings

## Adding New Configuration

1. Create a new config file in `src/config/`:

```typescript
// src/config/my-service.config.ts
import { registerAs } from '@nestjs/config';

export interface MyServiceConfig {
  apiKey: string;
  timeout: number;
}

export default registerAs('myService', (): MyServiceConfig => ({
  apiKey: process.env.MY_SERVICE_API_KEY || '',
  timeout: parseInt(process.env.MY_SERVICE_TIMEOUT || '5000', 10),
}));
```

2. Add validation to `validation.schema.ts`:

```typescript
MY_SERVICE_API_KEY: Joi.string().required(),
MY_SERVICE_TIMEOUT: Joi.number().default(5000),
```

3. Import in `config.module.ts`:

```typescript
import myServiceConfig from './my-service.config';

// In load array:
load: [
  appConfig,
  databaseConfig,
  redisConfig,
  loggingConfig,
  jwtConfig,
  myServiceConfig, // Add here
],
```

4. Export from `index.ts`:

```typescript
export * from './my-service.config';
```

## Environment Files

The module loads environment variables from:
1. `.env.local` (highest priority, typically gitignored)
2. `.env` (fallback)

Create a `.env` file in the project root:

```bash
# .env
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
DATABASE_URL=postgresql://user:password@localhost:5432/haystack
```

## Best Practices

1. **Never commit secrets**: Use `.env.local` for local development secrets
2. **Use defaults**: Provide sensible defaults for development
3. **Validate early**: Let validation catch errors at startup
4. **Type everything**: Use TypeScript interfaces for type safety
5. **Namespace configs**: Group related settings together

## Testing

In tests, you can override configuration:

```typescript
const module = Test.createTestingModule({
  imports: [
    ConfigModule.forRoot({
      load: [
        // Override specific configs
        {
          app: {
            name: 'test-app',
            environment: 'test',
          },
        },
      ],
    }),
  ],
});
```
