#!/bin/bash
# Prepare docs for dev server by using symlink (faster, single source of truth)
cd "$(dirname "$0")/.."

# Remove copied docs if they exist
if [ -d "docs" ] && [ ! -L "docs" ]; then
  rm -rf docs
fi

# Create symlink if it doesn't exist
if [ ! -L "docs" ]; then
  echo "Creating symlink to ../docs..."
  ln -s ../docs docs
  echo "✅ Symlink created"
fi

