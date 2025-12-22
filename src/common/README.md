# Common Module

This directory contains shared utilities, errors, guards, interceptors, and other common functionality used across the application.

## Usage

Import using the `@common` alias:

```typescript
import { BaseError } from '@common/errors/base.error';
import { ApiKeyGuard } from '@common/guards/api-key.guard';
```

## Structure

```
common/
├── errors/          # Custom error classes
├── guards/          # NestJS guards
├── interceptors/    # NestJS interceptors
├── decorators/      # Custom decorators
├── filters/         # Exception filters
├── utils/           # Utility functions
└── types/           # Shared TypeScript types
```


