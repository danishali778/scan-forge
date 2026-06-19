# ScopeForge Development Guide

## 1. Current State

The ScopeForge repository now has a scaffold for:

- `apps/api`: FastAPI control plane.
- `apps/web`: React + TypeScript + Vite frontend.
- `services/worker`: Celery worker.
- `services/runtime`: internal runtime service.
- `infra/migrations`: Alembic migration scaffold.
- `docker-compose.yml`: local app services plus Redis.

The first implementation still needs database models, real auth, session persistence, and Docker-backed runtime execution.

## 2. Environment Setup

Create a local environment file from the example:

```text
cp .env.example .env
```

Fill in hosted Supabase values:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
AUTH_ENCRYPTION_KEY=
```

Do not commit `.env`.

Generate `AUTH_ENCRYPTION_KEY` with a Fernet-compatible key:

```text
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## 3. Run With Docker Compose

```text
docker compose up --build
```

Expected local URLs:

```text
Web:     http://localhost:5173
API:     http://localhost:8000/health
Runtime: http://localhost:8001/health
Redis:   localhost:6379
```

## 4. Run Alembic

Migrations run against hosted Supabase Postgres for local development:

```text
alembic -c infra/migrations/alembic.ini revision --autogenerate -m "initial schema"
alembic -c infra/migrations/alembic.ini upgrade head
```

Phase 1 includes a hand-written foundation migration in `infra/migrations/versions`.

## 5. Service Boundaries

- Frontend calls only the backend.
- Backend calls Supabase Auth and Supabase Storage.
- SQLAlchemy owns product database access.
- Worker uses Celery for execution, but Postgres tables own product job state.
- Worker calls the runtime service for sandbox work.
- Runtime service owns Docker access.

## 6. Backend Layer Boundaries

The API backend is structured for clear dependency flow:

```text
api routes -> services -> repositories -> models/db
api routes -> schemas
services -> agents
services -> integrations
services -> domain
```

Rules:

- Route files handle HTTP only.
- Pydantic request/response contracts live in `app/schemas`.
- Use-case orchestration lives in `app/services`.
- SQLAlchemy queries live in `app/repositories`.
- ORM table mappings live in `app/models`.
- Business enums, state machines, and exceptions live in `app/domain`.
- Agent roles live in `app/agents`.
- Supabase, runtime, queue, provider, and storage clients live in `app/integrations`.

See [API Backend Structure](../apps/api/README.md) for the detailed backend boundary guide.
