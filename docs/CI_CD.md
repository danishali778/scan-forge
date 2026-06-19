# ScopeForge CI/CD Pipeline Guide

## 1. Purpose

This document defines the first GitHub CI/CD strategy for ScopeForge.

The goal is not only to make GitHub show a green check. The goal is to prove that every pull
request preserves the important production boundaries we designed:

- Backend code is lint-clean and test-covered.
- Database migrations can build a fresh database from zero to latest.
- Frontend code still compiles.
- Docker images still build.
- The core service stack can boot.
- Secrets are not accidentally committed.
- Hosted Supabase credentials are protected and only used in trusted workflows.

## 2. CI vs CD

CI means Continuous Integration.

CI runs on every pull request and push. It answers:

```text
Can this code safely merge into the shared codebase?
```

CD means Continuous Delivery or Deployment.

CD runs after merge, on protected branches, tags, or manual approval. It answers:

```text
Can this known-good build be released to staging or production?
```

For ScopeForge, PR CI must not depend on hosted Supabase credentials. PR CI should use mocked
Supabase in tests and temporary GitHub Actions Postgres for migrations.

Hosted Supabase smoke tests belong in CD or manual workflows because they need real secrets.

## 3. First 7 CI Checks

These are the first seven checks we should put in the main GitHub Actions CI pipeline.

| # | Check | Purpose | Runs On |
|---|---|---|---|
| 1 | Python lint with Ruff | Catch import, style, unused-code, and common static issues. | Pull requests and pushes |
| 2 | Backend pytest suite | Validate auth, RBAC, sessions, runtime, agents, evidence, memory, replay, analytics. | Pull requests and pushes |
| 3 | Alembic migration test | Prove a clean Postgres database can migrate to latest schema. | Pull requests and pushes |
| 4 | Web TypeScript/Vite build | Prove frontend code compiles. | Pull requests and pushes |
| 5 | Docker image build | Prove API, worker, runtime, and web images can be built. | Pull requests and pushes |
| 6 | Docker Compose health smoke | Prove the local service stack boots and health endpoints respond. | Pull requests and pushes |
| 7 | Secret scan | Block committed tokens, `.env` values, API keys, service keys, and private keys. | Pull requests and pushes |

These seven checks are enough for a strong first public GitHub pipeline.

Later, we can add coverage thresholds, dependency vulnerability scanning, SBOM generation, image
signing, and deployment automation.

## 4. CI Flow Diagram

```mermaid
flowchart TD
    A[Pull Request or Push] --> B[Checkout Repository]
    B --> C[Backend Quality Job]
    B --> D[Database Migration Job]
    B --> E[Frontend Build Job]
    B --> F[Docker Build Job]
    B --> G[Secret Scan Job]

    C --> C1[Ruff Check]
    C --> C2[Pytest]

    D --> D1[Start Temporary Postgres]
    D1 --> D2[Alembic Upgrade Head]

    E --> E1[Install Node Dependencies]
    E1 --> E2[TypeScript and Vite Build]

    F --> F1[Build API Image]
    F --> F2[Build Worker Image]
    F --> F3[Build Runtime Image]
    F --> F4[Build Web Image]

    F --> H[Compose Health Smoke]
    H --> H1[Start Redis Runtime API Worker]
    H1 --> H2[Check API /health]
    H1 --> H3[Check Runtime /health]

    G --> G1[Scan Git Tree for Secrets]

    C2 --> Z[Merge Allowed]
    D2 --> Z
    E2 --> Z
    H3 --> Z
    G1 --> Z
```

## 5. Check Details

### 5.1 Ruff Check

Command:

```powershell
.\.venv\Scripts\python.exe -m ruff check apps/api/app apps/api/tests infra/migrations scripts services/worker services/runtime
```

GitHub Actions Linux equivalent:

```bash
python -m ruff check apps/api/app apps/api/tests infra/migrations scripts services/worker services/runtime
```

This should fail the PR if:

- imports are unsorted,
- unused variables exist,
- obvious Python issues are present,
- migration or script files violate the project lint rules.

### 5.2 Backend Pytest Suite

Command:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

GitHub Actions Linux equivalent:

```bash
python -m pytest
```

The backend tests currently use:

- mocked Supabase Auth,
- fake queue client,
- fake runtime client,
- in-memory storage adapter,
- SQLite for fast unit/integration tests.

The test suite covers:

- auth and CSRF behavior,
- RBAC and API token auth,
- project/scope/session persistence,
- worker/session lifecycle logic,
- runtime and tool calls,
- agent orchestration and approvals,
- evidence, findings, reports,
- memory and embeddings with fake providers,
- replay and analytics.

CI should not call the real hosted Supabase project in this check.

### 5.3 Alembic Migration Test

Command:

```powershell
.\.venv\Scripts\python.exe -m alembic -c infra/migrations/alembic.ini upgrade head
```

GitHub Actions Linux equivalent:

```bash
python -m alembic -c infra/migrations/alembic.ini upgrade head
```

This job should start a temporary Postgres service in GitHub Actions:

```text
postgres:16
database: scopeforge_test
user: postgres
password: postgres
```

The CI `DATABASE_URL` should point to that temporary database:

```text
postgresql+psycopg://postgres:postgres@localhost:5432/scopeforge_test
```

This proves:

- every migration imports correctly,
- every table/index/FK can be created,
- old migrations were not accidentally broken,
- the schema can be rebuilt from scratch.

This migration check does not prove hosted Supabase network access. Hosted Supabase migrations are
manual or CD checks.

### 5.4 Web Build

Commands:

```bash
cd apps/web
npm ci
npm run build
```

If `package-lock.json` is not committed yet, use `npm install` initially, then commit the lockfile
and switch CI to `npm ci`.

This proves:

- TypeScript compiles,
- Vite build succeeds,
- frontend dependencies are installable,
- shared UI code is not broken.

Even while the frontend is not fully implemented, keeping this check prevents silent frontend drift.

### 5.5 Docker Image Build

Recommended images to build:

```bash
docker build -f apps/api/Dockerfile -t scopeforge-api:ci .
docker build -f services/worker/Dockerfile -t scopeforge-worker:ci .
docker build -f services/runtime/Dockerfile -t scopeforge-runtime-service:ci .
docker build -f apps/web/Dockerfile -t scopeforge-web:ci .
```

This proves:

- Dockerfiles are valid,
- project package installation works inside containers,
- service build contexts are correct,
- production-like images can be produced.

This check does not need secrets.

### 5.6 Docker Compose Health Smoke

This check starts the core local service stack and verifies health endpoints.

Recommended command:

```bash
docker compose up -d --build redis runtime api worker
```

Health checks:

```bash
curl --fail http://localhost:8000/health
curl --fail http://localhost:8001/health
```

This proves:

- Redis starts,
- runtime starts,
- API starts,
- worker container starts,
- API can import the latest code inside Docker,
- runtime service can import the latest code inside Docker.

For the first CI version, this should be a lightweight boot check only. It should not run the
hosted Supabase smoke scripts.

### 5.7 Secret Scan

Recommended options:

- `gitleaks`,
- `trufflehog`,
- GitHub Advanced Security secret scanning if available.

The first workflow can use Gitleaks:

```bash
gitleaks detect --source . --redact --verbose
```

This should fail if a PR commits:

- `.env`,
- Supabase service role key,
- Supabase JWT secret,
- provider API keys,
- raw API tokens,
- private keys,
- bearer tokens,
- database credentials that are not test-only.

The secret scan is especially important because ScopeForge uses:

- hosted Supabase,
- provider API keys,
- encrypted secrets,
- runtime command execution,
- report and artifact storage.

## 6. Recommended GitHub Actions Job Layout

The workflow does not need to be one huge job. Split it into clear jobs.

```text
.github/workflows/ci.yml
```

Recommended jobs:

```text
backend-tests
db-migrations
web-build
docker-build
compose-health
secret-scan
```

`backend-tests` can contain both Ruff and pytest because they share the same Python setup.

The seven checks map to jobs like this:

```text
backend-tests
  - Check 1: Ruff
  - Check 2: Pytest

db-migrations
  - Check 3: Alembic upgrade head

web-build
  - Check 4: npm build

docker-build
  - Check 5: docker build images

compose-health
  - Check 6: docker compose health smoke

secret-scan
  - Check 7: gitleaks/trufflehog
```

## 7. Required CI Environment Variables

CI can use fake/test values for most backend configuration.

Required for backend tests and migrations:

```text
ENVIRONMENT=test
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/scopeforge_test
AUTH_ENCRYPTION_KEY=<test Fernet key>
SUPABASE_URL=http://supabase.test
SUPABASE_ANON_KEY=test-key
COOKIE_SECURE=false
```

Do not use hosted Supabase secrets in PR CI.

Do not set:

```text
SUPABASE_SERVICE_ROLE_KEY
TEST_USER_EMAIL
TEST_USER_PASSWORD
OPENAI_API_KEY
```

inside ordinary PR workflows.

## 8. CD and Manual Smoke Tests

The Phase 1-8 smoke scripts should run in CD or manual workflows, not ordinary PR CI.

Current smoke scripts:

```text
scripts/phase1_smoke_test.py
scripts/phase2_smoke_test.py
scripts/phase3_smoke_test.py
scripts/phase4_smoke_test.py
scripts/phase5_smoke_test.py
scripts/phase6_smoke_test.py
scripts/phase7_smoke_test.py
scripts/phase8_smoke_test.py
```

These scripts can use:

```text
TEST_USER_EMAIL
TEST_USER_PASSWORD
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Those values must live in GitHub Actions secrets and should only be available to:

- protected branch workflows,
- manual `workflow_dispatch` workflows,
- staging deployment workflows.

## 9. CD Flow Diagram

```mermaid
flowchart TD
    A[Merge to main] --> B[Run CI Again]
    B --> C[Build Release Images]
    C --> D[Push Images to Registry]
    D --> E[Deploy to Staging]
    E --> F[Run Phase Smoke Tests]
    F --> G{Smoke Passed?}
    G -- Yes --> H[Ready for Production Approval]
    G -- No --> I[Block Release and Investigate]
    H --> J[Manual Production Deploy]
```

The first CD version can stop at staging validation. Production deployment can be added later.

## 10. What Should Block a Pull Request?

A PR should be blocked if any of these fail:

- Ruff fails.
- Pytest fails.
- Alembic cannot migrate a clean Postgres database.
- Web build fails.
- Docker images cannot build.
- Compose health smoke fails.
- Secret scan finds a secret.

Do not merge by bypassing these checks unless the failure is a confirmed CI infrastructure issue.

## 11. What Does Not Belong in PR CI Yet?

Do not run these in normal pull request CI:

- Hosted Supabase login smoke tests.
- Real provider API calls.
- Long-running agent sessions.
- Real production deployments.
- Destructive runtime tests.
- Staging database migrations.
- Production image publishing.

These belong in protected CD workflows or manual validation.

## 12. Local Developer Equivalent

Before pushing, a developer can run:

```powershell
.\.venv\Scripts\python.exe -m ruff check apps/api/app apps/api/tests infra/migrations scripts services/worker services/runtime
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m alembic -c infra/migrations/alembic.ini upgrade head
```

Frontend:

```powershell
cd apps/web
npm install
npm run build
```

Docker:

```powershell
docker-compose up -d --build redis runtime api worker
```

Health:

```powershell
curl.exe --fail http://localhost:8000/health
curl.exe --fail http://localhost:8001/health
```

## 13. First Workflow Implementation Order

Implement CI in this order:

1. Backend tests job: Ruff + pytest.
2. Migration job with Postgres service.
3. Web build job.
4. Docker image build job.
5. Compose health job.
6. Secret scan job.
7. Mark all required checks in GitHub branch protection.

This order keeps debugging simple. If the backend tests are already broken, we do not need to debug
Docker or deployment yet.
