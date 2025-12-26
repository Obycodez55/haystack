#!/bin/bash
set -e

# Script to prepare docs and OpenAPI spec before committing
# This ensures Vercel builds from committed files instead of generating during build

echo "📝 Preparing documentation for commit..."

# Generate OpenAPI spec
echo "Generating OpenAPI specification..."
pnpm docs:generate-openapi

# Copy docs to website/docs
echo "Copying docs to website/docs..."
cd website

# Remove symlink if it exists
if [ -L "docs" ]; then
  rm docs
fi

# Remove existing docs directory
rm -rf docs

# Copy from root docs directory
if [ -d "../docs" ]; then
  cp -r ../docs docs
  touch docs/.exists
  echo "✅ Docs copied successfully"
else
  echo "⚠️  Warning: ../docs directory not found"
  mkdir -p docs
  touch docs/.exists
fi

echo "✅ Documentation prepared for commit"

