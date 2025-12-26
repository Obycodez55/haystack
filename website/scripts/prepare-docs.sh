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
if [ ! -d "../docs" ]; then
  echo "Warning: ../docs directory not found. Creating empty docs directory..."
  mkdir -p docs
  touch docs/.exists
  echo "# Documentation" > docs/README.md
  echo "Documentation will be added here." >> docs/README.md
  echo "✅ Created empty docs directory"
else
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
