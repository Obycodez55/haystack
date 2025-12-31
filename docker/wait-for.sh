#!/bin/sh
# Generic wait script for services
# Usage: wait-for.sh host port [timeout]

set -e

host="$1"
port="$2"
timeout="${3:-30}"

echo "Waiting for $host:$port to be ready..."

for i in $(seq 1 $timeout); do
  if nc -z "$host" "$port" >/dev/null 2>&1; then
    echo "$host:$port is ready!"
    exit 0
  fi
  echo "Waiting for $host:$port... ($i/$timeout)"
  sleep 1
done

echo "Timeout waiting for $host:$port"
exit 1

