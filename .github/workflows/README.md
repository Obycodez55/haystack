# GitHub Actions Workflows

This directory contains CI/CD workflows for the Haystack project.

## Workflows

### `ci.yml` - Main CI Pipeline

Runs on all branches and pull requests. Includes:

- **lint**: ESLint code quality checks
- **format**: Prettier formatting verification
- **build**: TypeScript compilation
- **test**: Unit tests
- **test-e2e**: End-to-end tests
- **coverage**: Test coverage with 70% threshold
- **docker-build**: Docker image build verification
- **security-audit**: Security vulnerability scan (main branch only)

### `pr-checks.yml` - Pull Request Checks

Runs on pull requests to `main` or `staging`. Includes:

- **pr-lint**: Linting and formatting checks
- **pr-test**: Unit and E2E tests
- **pr-coverage**: Coverage report with PR comments
- **pr-build**: Build verification

### `staging.yml` - Staging Branch Checks

Runs on pushes and PRs to `staging` branch. Includes:

- **staging-full-ci**: Complete CI suite (lint, format, build, test, coverage, docker)
- **staging-security-warning**: Security audit (warning only, doesn't block)

### `main.yml` - Main Branch Checks

Runs on pushes and PRs to `main` branch. Includes:

- **main-full-ci**: Complete CI suite (lint, format, build, test, coverage, docker)
- **main-security-audit**: Security audit (required, blocks merge)

## Required Status Checks

### For `main` branch:

- `lint`
- `format`
- `build`
- `test`
- `test-e2e`
- `coverage`
- `docker-build`
- `main-security-audit`

### For `staging` branch:

- `lint`
- `format`
- `build`
- `test`
- `test-e2e`
- `coverage`
- `docker-build`
- `staging-security-warning` (warning only)

## Setup Instructions

1. **Push workflows to repository**

   ```bash
   git add .github/workflows/
   git commit -m "ci: add GitHub Actions workflows"
   git push
   ```

2. **Configure branch protection rules** (in GitHub UI):
   - Go to Settings → Branches
   - Add rules for `main` and `staging`
   - Enable required status checks (see list above)
   - Require pull request reviews (optional)

3. **Verify workflows run**
   - Check Actions tab after pushing
   - Ensure all jobs pass
   - Status checks will appear in branch protection settings

## Environment Variables

Workflows use the following test environment variables:

- `NODE_ENV=test`
- `DATABASE_HOST=localhost`
- `DATABASE_PORT=5432`
- `DATABASE_USERNAME=postgres`
- `DATABASE_PASSWORD=postgres`
- `DATABASE_NAME=haystack_test`
- `REDIS_HOST=localhost`
- `REDIS_PORT=6379`
- `REDIS_DB=1`
- `JWT_SECRET=test-secret-key`
- `JWT_REFRESH_SECRET=test-refresh-secret`

## Coverage Threshold

The project enforces a 70% coverage threshold for:

- Branches
- Functions
- Lines
- Statements

Coverage reports are uploaded as artifacts and can be viewed in the Actions tab.

## Security Audit

- **Staging**: Warning only (doesn't block merge)
- **Main**: Required (blocks merge if moderate+ vulnerabilities found)

## Docker Build

All workflows test Docker image builds to ensure:

- Dockerfile is valid
- Dependencies install correctly
- Image builds successfully

Images are not pushed to a registry in CI (configure separately for deployment).
