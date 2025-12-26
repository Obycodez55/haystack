#!/bin/bash
set -e

# Generate OpenAPI spec before building docs
echo "Generating OpenAPI specification..."
cd "$(dirname "$0")/../.."

# Check if pnpm is available and the script exists
if command -v pnpm >/dev/null 2>&1 && [ -f "package.json" ]; then
  pnpm docs:generate-openapi || {
    echo "Warning: Failed to generate OpenAPI spec. Continuing with existing spec if available."
  }
else
  echo "Warning: pnpm not available or package.json not found. Skipping OpenAPI generation."
fi

# Prepare docs for build by copying from source instead of using symlink
# This fixes Docusaurus build issues with symlinks
cd "$(dirname "$0")/.."

# Remove symlink if it exists
if [ -L "docs" ]; then
  rm docs
fi

# Check if source docs directory exists
# Try multiple possible paths for Vercel build context
# We're currently in the website directory, so check relative to that
DOCS_SOURCE=""
if [ -d "../docs" ] && [ ! -L "../docs" ] && [ "$(ls -A ../docs 2>/dev/null)" ]; then
  # ../docs exists, is not a symlink, and has content
  DOCS_SOURCE="../docs"
elif [ -d "../../docs" ] && [ ! -L "../../docs" ] && [ "$(ls -A ../../docs 2>/dev/null)" ]; then
  # ../../docs exists, is not a symlink, and has content
  DOCS_SOURCE="../../docs"
fi

if [ -z "$DOCS_SOURCE" ]; then
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
  # Copy docs if they don't exist or are outdated
  if [ ! -d "docs" ] || [ ! -f "docs/.exists" ] || [ "$DOCS_SOURCE" -nt "docs/.exists" ]; then
    echo "Copying docs from $DOCS_SOURCE to website/docs..."
    rm -rf docs
    # Use absolute path to avoid issues with relative paths
    ABS_DOCS_SOURCE="$(cd "$(dirname "$DOCS_SOURCE")" && pwd)/$(basename "$DOCS_SOURCE")"
    cp -r "$ABS_DOCS_SOURCE" docs
    touch docs/.exists
    echo "✅ Docs copied successfully"
  else
    echo "✅ Docs are up to date"
  fi
fi

# Ensure OpenAPI spec exists
# The spec should have been generated above, but check if it exists
if [ ! -f "static/openapi.json" ]; then
  echo "Warning: OpenAPI spec not found at static/openapi.json"
  echo "Checking if it was generated in the parent directory..."
  if [ -f "../website/static/openapi.json" ]; then
    echo "Found OpenAPI spec in parent, copying..."
    mkdir -p static
    cp ../website/static/openapi.json static/openapi.json
  elif [ -f "../../website/static/openapi.json" ]; then
    echo "Found OpenAPI spec in grandparent, copying..."
    mkdir -p static
    cp ../../website/static/openapi.json static/openapi.json
  else
    echo "Creating empty OpenAPI spec..."
    mkdir -p static
    echo '{"openapi":"3.0.0","info":{"title":"Haystack API","version":"1.0"},"paths":{}}' > static/openapi.json
  fi
fi
