#!/bin/bash
# Prepare docs for build by copying from source instead of using symlink
# This fixes Docusaurus build issues with symlinks

cd "$(dirname "$0")/.."

# Remove symlink if it exists
if [ -L "docs" ]; then
  rm docs
fi

# Copy docs if they don't exist or are outdated
if [ ! -d "docs" ] || [ "../docs" -nt "docs" ]; then
  echo "Copying docs from ../docs to website/docs..."
  cp -r ../docs docs
  echo "✅ Docs copied successfully"
else
  echo "✅ Docs are up to date"
fi

