#!/bin/bash
set -e

# Script to prepare docs and OpenAPI spec before committing
# This ensures Vercel builds from committed files instead of generating during build

echo "📝 Preparing documentation for commit..."

# Generate OpenAPI spec
echo "Generating OpenAPI specification..."
pnpm docs:generate-openapi

# Generate API reference docs from OpenAPI spec
echo "Generating API reference documentation..."
cd website
npx docusaurus gen-api-docs all

# Copy docs to website/docs
echo "Copying docs to website/docs..."

# Backup api-reference if it exists (it's generated, not copied)
if [ -d "docs/api-reference" ]; then
  echo "Backing up generated API reference..."
  cp -r docs/api-reference /tmp/api-reference.backup
fi

# Remove symlink if it exists
if [ -L "docs" ]; then
  rm docs
fi

# Remove existing docs directory (but preserve api-reference if it exists and is committed)
if [ -d "docs/api-reference" ] && [ -f "docs/api-reference/sidebar.ts" ]; then
  echo "Preserving committed API reference..."
  cp -r docs/api-reference /tmp/api-reference.committed
fi

rm -rf docs

# Copy from root docs directory
if [ -d "../docs" ]; then
  cp -r ../docs docs
  # Restore api-reference - prefer committed version, fallback to generated
  if [ -d "/tmp/api-reference.committed" ]; then
    cp -r /tmp/api-reference.committed docs/api-reference
    rm -rf /tmp/api-reference.committed
    echo "✅ Restored committed API reference"
  elif [ -d "/tmp/api-reference.backup" ]; then
    cp -r /tmp/api-reference.backup docs/api-reference
    rm -rf /tmp/api-reference.backup
    echo "✅ Restored generated API reference"
  fi
  touch docs/.exists
  echo "✅ Docs copied successfully"
else
  echo "⚠️  Warning: ../docs directory not found"
  mkdir -p docs
  # Restore api-reference - prefer committed version, fallback to generated
  if [ -d "/tmp/api-reference.committed" ]; then
    cp -r /tmp/api-reference.committed docs/api-reference
    rm -rf /tmp/api-reference.committed
    echo "✅ Restored committed API reference"
  elif [ -d "/tmp/api-reference.backup" ]; then
    cp -r /tmp/api-reference.backup docs/api-reference
    rm -rf /tmp/api-reference.backup
    echo "✅ Restored generated API reference"
  fi
  touch docs/.exists
fi

echo "✅ Documentation prepared for commit"

