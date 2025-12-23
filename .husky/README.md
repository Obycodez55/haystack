# Husky Git Hooks

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## Pre-commit Hook

The `pre-commit` hook runs `lint-staged` before each commit, which:

- Runs ESLint with auto-fix on staged TypeScript files
- Formats staged files with Prettier
- Only processes files that are staged for commit (not all files)

## Configuration

- **lint-staged config**: See `package.json` → `lint-staged`
- **Husky setup**: Automatically initialized via `pnpm install` (via `prepare` script)

## Bypassing Hooks

If you need to bypass hooks in an emergency (not recommended):

```bash
git commit --no-verify -m "your message"
```

## Adding New Hooks

To add a new hook:

```bash
# Create a new hook file
echo "your-command" > .husky/hook-name

# Make it executable
chmod +x .husky/hook-name
```

## Troubleshooting

If hooks aren't running:

1. Ensure Husky is initialized: `pnpm exec husky`
2. Check hook file permissions: `ls -la .husky/`
3. Verify Git hooks path: `git config core.hooksPath` (should be `.husky`)
