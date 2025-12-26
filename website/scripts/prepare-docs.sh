#!/bin/bash
set -e

# Prepare docs for build
# This script assumes docs and OpenAPI spec are already generated and committed
# It just verifies they exist and creates minimal fallbacks if needed

cd "$(dirname "$0")/.."

# Remove symlink if it exists
if [ -L "docs" ]; then
  rm docs
fi

# Verify docs exist (should be committed)
if [ ! -d "docs" ] || [ -z "$(ls -A docs 2>/dev/null)" ]; then
  echo "Warning: docs directory not found or empty. Creating minimal docs structure..."
  rm -rf docs
  mkdir -p docs
  touch docs/.exists
  # Create minimal structure to prevent build errors
  mkdir -p docs/setup
  echo "# Documentation" > docs/README.md
  echo "Documentation will be added here." >> docs/README.md
  echo "---" > docs/setup/redis-setup.md
  echo "title: Redis Setup Guide" >> docs/setup/redis-setup.md
  echo "---" >> docs/setup/redis-setup.md
  echo "" >> docs/setup/redis-setup.md
  echo "# Redis Setup" >> docs/setup/redis-setup.md
  echo "Redis setup documentation." >> docs/setup/redis-setup.md
  echo "---" > docs/setup/database-setup.md
  echo "title: Database Setup Guide" >> docs/setup/database-setup.md
  echo "---" >> docs/setup/database-setup.md
  echo "" >> docs/setup/database-setup.md
  echo "# Database Setup" >> docs/setup/database-setup.md
  echo "Database setup documentation." >> docs/setup/database-setup.md
  echo "✅ Created minimal docs directory"
else
  echo "✅ Docs directory exists"
fi

# Verify OpenAPI spec exists (should be committed)
if [ ! -f "static/openapi.json" ]; then
  echo "Warning: OpenAPI spec not found. Creating empty spec..."
  mkdir -p static
  echo '{"openapi":"3.0.0","info":{"title":"Haystack API","version":"1.0"},"paths":{}}' > static/openapi.json
else
  echo "✅ OpenAPI spec exists"
fi
