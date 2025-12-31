#!/bin/sh
# Docker entrypoint script
# Waits for dependencies and runs migrations if needed

set -e

echo "Starting application entrypoint..."

# Wait for PostgreSQL
if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_PORT" ]; then
  echo "Waiting for PostgreSQL at $DATABASE_HOST:$DATABASE_PORT..."
  timeout=30
  for i in $(seq 1 $timeout); do
    if nc -z "$DATABASE_HOST" "$DATABASE_PORT" >/dev/null 2>&1; then
      echo "PostgreSQL is ready!"
      break
    fi
    if [ $i -eq $timeout ]; then
      echo "Timeout waiting for PostgreSQL"
      exit 1
    fi
    echo "Waiting for PostgreSQL... ($i/$timeout)"
    sleep 1
  done
fi

# Wait for Redis
if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
  echo "Waiting for Redis at $REDIS_HOST:$REDIS_PORT..."
  timeout=30
  for i in $(seq 1 $timeout); do
    if nc -z "$REDIS_HOST" "$REDIS_PORT" >/dev/null 2>&1; then
      echo "Redis is ready!"
      break
    fi
    if [ $i -eq $timeout ]; then
      echo "Timeout waiting for Redis"
      exit 1
    fi
    echo "Waiting for Redis... ($i/$timeout)"
    sleep 1
  done
fi

# Run migrations if AUTO_MIGRATE is set to true
if [ "$AUTO_MIGRATE" = "true" ] && [ "$NODE_ENV" != "test" ]; then
  echo "Running database migrations..."
  pnpm migration:run || {
    echo "Migration failed, but continuing..."
  }
fi

# Execute the main command
echo "Starting application..."
exec "$@"

