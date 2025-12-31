# Docker Guide

This guide covers Docker setup, usage, and best practices for the Haystack payment orchestration API.

## Table of Contents

- [Overview](#overview)
- [Development Setup](#development-setup)
- [Testing in Docker](#testing-in-docker)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The project includes Docker configurations for:

- **Development**: Hot reload with PostgreSQL and Redis
- **Testing**: Isolated test environment
- **Production**: Optimized multi-stage build

## Development Setup

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 4GB RAM allocated to Docker

### Quick Start

1. **Start all services:**

   ```bash
   pnpm docker:dev
   ```

2. **Build and start:**

   ```bash
   pnpm docker:dev:build
   ```

3. **View logs:**

   ```bash
   pnpm docker:dev:logs
   ```

4. **Stop services:**

   ```bash
   pnpm docker:dev:down
   ```

5. **Clean up (remove volumes):**
   ```bash
   pnpm docker:dev:clean
   ```

### Services

The development Docker Compose includes:

- **app**: NestJS application with hot reload
- **postgres**: PostgreSQL 16 database
- **redis**: Redis 7 cache

### Hot Reload

The development setup supports hot reload:

- Code changes in `src/` automatically trigger rebuild
- No need to restart containers
- Changes are reflected immediately

### Environment Variables

Create a `.env` file (see `.env.example`) or set environment variables:

```bash
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=haystack
REDIS_HOST=redis
REDIS_PORT=6379
```

### Database Migrations

Migrations can run automatically or manually:

**Automatic (on container start):**

```bash
AUTO_MIGRATE=true pnpm docker:dev
```

**Manual:**

```bash
docker-compose exec app pnpm migration:run
```

### Accessing Services

- **Application**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Volume Mounts

The following directories are mounted for development:

- `./src` → `/app/src` (source code)
- `./test` → `/app/test` (test files)
- `./package.json` → `/app/package.json`
- Config files (tsconfig.json, nest-cli.json, etc.)

`node_modules` and `dist` are excluded to use container's dependencies.

## Testing in Docker

### Running Tests

**All tests:**

```bash
pnpm test:docker
```

**E2E tests only:**

```bash
pnpm test:e2e:docker
```

### Test Services

The test Docker Compose includes:

- **postgres-test**: Isolated test database (port 5433)
- **redis-test**: Isolated test cache (port 6380)
- **test**: Test runner container

### Test Environment

Test containers use:

- Separate database: `haystack_test`
- Separate Redis DB: `1`
- Ephemeral volumes (no persistence)
- Auto-cleanup on shutdown

### Environment Variables

Test containers use:

```bash
NODE_ENV=test
DATABASE_NAME=haystack_test
REDIS_DB=1
WAIT_FOR_DB=true
WAIT_FOR_REDIS=true
```

## Production Deployment

### Building Production Image

```bash
docker build -t haystack:latest .
```

### Running Production Container

```bash
docker run -d \
  --name haystack \
  -p 3000:3000 \
  -e DATABASE_HOST=postgres \
  -e DATABASE_PASSWORD=secure-password \
  -e JWT_SECRET=your-secret \
  haystack:latest
```

### Production Dockerfile Features

- **Multi-stage build**: Smaller final image
- **Non-root user**: Security best practice
- **Health check**: Container health monitoring
- **Optimized layers**: Faster builds and smaller images

### Environment Variables

Required production environment variables:

- `DATABASE_HOST`
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

See `.env.example` for all options.

### Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_HOST: postgres
      # ... other env vars
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    # ... production config

  redis:
    image: redis:7-alpine
    # ... production config
```

## Troubleshooting

### Container Won't Start

**Check logs:**

```bash
docker-compose logs app
```

**Common issues:**

- Database not ready: Wait for health checks
- Port conflicts: Change ports in docker-compose.yml
- Missing environment variables: Check `.env` file

### Hot Reload Not Working

**Check volume mounts:**

```bash
docker-compose exec app ls -la /app/src
```

**Verify file changes:**

- Ensure files are saved
- Check file permissions
- Restart container: `docker-compose restart app`

### Database Connection Issues

**Check database is ready:**

```bash
docker-compose exec postgres pg_isready
```

**Check connection from app:**

```bash
docker-compose exec app pnpm migration:show
```

**Common fixes:**

- Wait for health checks to pass
- Verify `DATABASE_HOST=postgres` (service name)
- Check database credentials

### Redis Connection Issues

**Check Redis is ready:**

```bash
docker-compose exec redis redis-cli ping
```

**Common fixes:**

- Wait for health checks to pass
- Verify `REDIS_HOST=redis` (service name)
- Check Redis password if set

### Migration Issues

**Run migrations manually:**

```bash
docker-compose exec app pnpm migration:run
```

**Check migration status:**

```bash
docker-compose exec app pnpm migration:show
```

**Reset database:**

```bash
docker-compose down -v
docker-compose up -d postgres
docker-compose exec app pnpm migration:run
```

### Performance Issues

**Increase Docker resources:**

- Docker Desktop → Settings → Resources
- Allocate more CPU and RAM

**Check container resources:**

```bash
docker stats
```

### Clean Up

**Remove all containers and volumes:**

```bash
docker-compose down -v
```

**Remove images:**

```bash
docker rmi haystack-app haystack-test
```

**Full cleanup:**

```bash
docker system prune -a --volumes
```

## Best Practices

### 1. Use Health Checks

All services include health checks to ensure dependencies are ready.

### 2. Use Named Volumes

Development uses named volumes for persistence:

- `postgres_data`: Database data
- `redis_data`: Redis data

### 3. Environment Variables

- Use `.env` files for local development
- Never commit `.env` files
- Use secrets management in production

### 4. Resource Limits

Set resource limits in production:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### 5. Security

- Use non-root user in production
- Keep images updated
- Scan images for vulnerabilities
- Use secrets for sensitive data

### 6. Networking

- Use Docker networks for service isolation
- Expose only necessary ports
- Use internal networks for service communication

## Scripts Reference

| Script                  | Description                   |
| ----------------------- | ----------------------------- |
| `pnpm docker:dev`       | Start development environment |
| `pnpm docker:dev:build` | Build and start development   |
| `pnpm docker:dev:down`  | Stop development services     |
| `pnpm docker:dev:logs`  | View application logs         |
| `pnpm docker:dev:clean` | Remove containers and volumes |
| `pnpm test:docker`      | Run tests in Docker           |
| `pnpm test:e2e:docker`  | Run E2E tests in Docker       |

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
