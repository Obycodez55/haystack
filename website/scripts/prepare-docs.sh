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

# Copy docs if they don't exist or are outdated
if [ ! -d "docs" ] || [ ! -f "docs/.exists" ] || [ "../docs" -nt "docs/.exists" ]; then
  echo "Copying docs from ../docs to website/docs..."
  rm -rf docs
  cp -r ../docs docs
  touch docs/.exists
  echo "✅ Docs copied successfully"
else
  echo "✅ Docs are up to date"
fi

# Ensure OpenAPI spec exists
if [ ! -f "static/openapi.json" ]; then
  echo "Warning: OpenAPI spec not found at static/openapi.json"
  echo "Creating empty OpenAPI spec..."
  mkdir -p static
  echo '{"openapi":"3.0.0","info":{"title":"Haystack API","version":"1.0"},"paths":{}}' > static/openapi.json
fi
