# ScopeForge Architecture

## 1. Architecture Goals

ScopeForge should separate product concerns cleanly:

- Web UI should not know worker internals.
- API should own authentication, authorization, and public contracts.
- Workers should own orchestration and long-running execution.
- Runtime should isolate commands and files.
- Tools should be pluggable and policy-checked.
- Providers should be replaceable adapters.
- Data should preserve auditability and evidence lineage.

The design should support a small local deployment first while leaving room for distributed workers later.

## 2. System Context

```mermaid
flowchart TB
    User[Security operator] --> Web[Web application]
    Admin[Administrator] --> Web
    Web --> API[API server]
    API --> DB[(Supabase Postgres)]
    API --> ObjectStore[(Supabase Storage)]
    API --> Queue[(Redis)]
    Worker[Worker service] --> Queue
    Worker --> DB
    Worker --> Runtime[Runtime service]
    Runtime --> Sandbox[Sandbox runtime]
    Worker --> LLM[LLM providers]
    Worker --> Search[Search providers]
    Worker --> Vector[(Vector memory)]
    Sandbox --> Target[Authorized target systems]
    Sandbox --> Tools[Security tools]
    API --> Observability[Logs, metrics, traces]
    Worker --> Observability
    Runtime --> Observability
```

## 3. Major Components

### Web Application

Responsibilities:

- Login forms and session-aware UI state.
- Dashboard.
- Project and session management.
- Live session workspace.
- Task/step/evidence/finding review.
- File and resource management.
- Provider, policy, and user settings.
- Report editing and export.

Suggested implementation:

- React + TypeScript.
- Router-based pages.
- Typed REST client against FastAPI.
- WebSocket client for live events, terminal output, progress updates, and approval state.
- Virtualized log and terminal views.

### API Server

Responsibilities:

- Authentication.
- Backend-mediated Supabase Auth calls.
- Authorization.
- Public API contract.
- Session creation.
- Scope and policy validation.
- Database transactions.
- Realtime event fanout.
- File upload/download.
- Report export endpoints.
- API tokens and audit events.

Chosen implementation:

- Python with FastAPI.
- Sync SQLAlchemy for application database access.
- Supabase Auth integration behind backend auth routes.
- Supabase Python client only inside backend Auth and Storage adapters.
- Alembic for migrations.

The architecture should keep framework boundaries clear so internal services, workers, and runtime adapters remain testable.

### Worker Service

Responsibilities:

- Pull jobs from queue.
- Run planner/executor/reporter loops.
- Call LLM providers.
- Invoke tools through tool runtime.
- Persist job status, step results, messages, tool calls, evidence, and final outputs to Postgres.
- Emit realtime events.
- Enforce timeouts and cancellation.
- Resume or safely fail interrupted sessions.
- Treat Celery task results as non-canonical execution metadata.

### Sandbox Runtime

Responsibilities:

- Start per-session isolated execution environments.
- Execute commands.
- Read/write/list files inside the workspace.
- Enforce CPU, memory, network, and timeout limits.
- Capture stdout/stderr.
- Copy evidence out safely.
- Stop and clean up environments.

First implementation can use Docker. Later implementations can support Kubernetes jobs, Firecracker microVMs, or remote runners.

### Tool Registry

Responsibilities:

- Define all callable tools.
- Validate tool arguments.
- Run policy checks.
- Execute handlers.
- Record tool call lifecycle.
- Normalize results.

Tool categories:

- Environment tools: terminal, files, HTTP client, browser.
- Research tools: web search, exploit database search, documentation search.
- Memory tools: vector search/store, knowledge graph search.
- Workflow tools: ask user, create finding, update plan, mark done.
- Administration tools: pause, stop, request approval.

### Provider Adapter Layer

Responsibilities:

- Normalize LLM calls.
- Support streaming.
- Support tool calling.
- Track token usage.
- Track cost.
- Map agent roles to models.
- Hide provider-specific request/response differences.

Provider adapter interface:

```text
Provider.callText(input, options) -> text
Provider.callWithTools(messages, tools, options) -> model response
Provider.stream(messages, tools, options) -> event stream
Provider.embed(texts, options) -> vectors
Provider.healthCheck() -> status
```

### Policy Engine

Responsibilities:

- Evaluate whether a tool call is allowed.
- Enforce target scope.
- Enforce tool allowlist/denylist.
- Enforce approval rules.
- Enforce rate and budget limits.
- Produce policy decisions for audit.

Policy decisions:

- allow.
- deny.
- require approval.
- require user input.
- transform arguments.

### Storage Layer

Responsibilities:

- Relational state in Postgres.
- Embeddings in pgvector or dedicated vector DB.
- Large files in filesystem/S3-compatible object store.
- Event log for realtime replay or audit.

## 4. Recommended Service Layout

```mermaid
flowchart LR
    subgraph Client
        Browser[Browser UI]
    end

    subgraph ControlPlane[Control Plane]
        API[API server]
        Realtime[Realtime gateway]
        Auth[Auth module]
        Reports[Report renderer]
    end

    subgraph ExecutionPlane[Execution Plane]
        Scheduler[Scheduler]
        Worker[Agent worker]
        Runtime[Runtime manager]
        ToolRegistry[Tool registry]
        Policy[Policy engine]
    end

    subgraph DataPlane[Data Plane]
        DB[(Postgres)]
        Vector[(Vector memory)]
        Files[(Object/file store)]
        Queue[(Queue)]
    end

    Browser --> API
    Browser --> Realtime
    API --> Auth
    API --> Reports
    API --> DB
    API --> Files
    API --> Queue
    Scheduler --> Queue
    Worker --> Queue
    Worker --> Policy
    Worker --> ToolRegistry
    ToolRegistry --> Runtime
    Worker --> DB
    Worker --> Vector
    Runtime --> Files
```

## 5. Session Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Web UI
    participant API as API Server
    participant Q as Queue
    participant W as Worker
    participant P as Policy Engine
    participant R as Runtime
    participant L as LLM Provider
    participant DB as Database

    U->>UI: Create session objective and scope
    UI->>API: POST /sessions
    API->>P: Validate scope and policy
    P-->>API: Allowed
    API->>DB: Create session
    API->>Q: Enqueue planning job
    API-->>UI: Session created

    W->>Q: Claim planning job
    W->>L: Ask planner for tasks and steps
    L-->>W: Proposed plan
    W->>DB: Save plan
    W-->>UI: Realtime plan update

    U->>UI: Approve plan
    UI->>API: POST /sessions/:id/approve
    API->>Q: Enqueue execution job

    W->>Q: Claim execution job
    W->>R: Start sandbox
    loop Each step
        W->>L: Ask executor for next tool call
        L-->>W: Tool call
        W->>P: Evaluate tool call
        alt Allowed
            W->>R: Execute tool
            R-->>W: Output and artifacts
            W->>DB: Save tool call and evidence
            W-->>UI: Stream updates
        else Requires approval
            W->>DB: Save approval request
            W-->>UI: Ask user
        else Denied
            W->>DB: Save denied decision
            W->>L: Ask model to revise plan
        end
    end
    W->>L: Generate report draft
    W->>DB: Save report
    W->>R: Stop sandbox
    W-->>UI: Session completed
```

## 6. Agent Model

The system should avoid hard-coding too much agent behavior. Agents are role configurations around the same orchestration primitives.

```mermaid
flowchart TB
    Supervisor[Supervisor]
    Planner[Planner]
    Executor[Executor]
    Researcher[Researcher]
    Coder[Coder]
    Analyst[Analyst]
    Reporter[Reporter]

    Planner --> Executor
    Executor --> Researcher
    Executor --> Coder
    Executor --> Analyst
    Analyst --> Reporter
    Supervisor -.monitors.-> Planner
    Supervisor -.monitors.-> Executor
    Supervisor -.monitors.-> Reporter

    subgraph Tools
        Terminal[terminal]
        Files[file workspace]
        Browser[browser/http]
        Search[search]
        Memory[vector memory]
        Findings[findings]
    end

    Executor --> Terminal
    Executor --> Files
    Researcher --> Search
    Researcher --> Browser
    Researcher --> Memory
    Coder --> Files
    Coder --> Terminal
    Analyst --> Findings
    Reporter --> Findings
```

## 7. Tool Call Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Received
    Received --> ValidatingArgs
    ValidatingArgs --> PolicyCheck
    PolicyCheck --> WaitingApproval
    WaitingApproval --> PolicyCheck
    PolicyCheck --> Denied
    PolicyCheck --> Running
    Running --> Succeeded
    Running --> Failed
    Running --> TimedOut
    Running --> Cancelled
    Denied --> [*]
    Succeeded --> EvidenceSaved
    Failed --> EvidenceSaved
    TimedOut --> EvidenceSaved
    Cancelled --> EvidenceSaved
    EvidenceSaved --> [*]
```

## 8. Data Model

Initial entities:

- Workspace.
- User.
- Role.
- API token.
- Project.
- Target.
- Scope.
- Provider profile.
- Policy.
- Session.
- Task.
- Step.
- Agent message.
- Tool call.
- Runtime container.
- File asset.
- Evidence.
- Finding.
- Report.
- Approval request.
- Audit event.
- Memory document.

See [Database Design](DATABASE_DESIGN.md) for the detailed table design, indexes, status enums, evidence storage, event storage, and migration strategy.

```mermaid
erDiagram
    WORKSPACE ||--o{ USER : has
    WORKSPACE ||--o{ PROJECT : has
    WORKSPACE ||--o{ PROVIDER_PROFILE : has
    WORKSPACE ||--o{ POLICY : has

    USER ||--o{ API_TOKEN : owns
    USER ||--o{ AUDIT_EVENT : causes

    PROJECT ||--o{ TARGET : defines
    PROJECT ||--o{ SCOPE : defines
    PROJECT ||--o{ SESSION : contains
    PROJECT ||--o{ FILE_ASSET : stores

    SESSION ||--o{ TASK : contains
    SESSION ||--o{ AGENT_MESSAGE : logs
    SESSION ||--o{ RUNTIME_CONTAINER : uses
    SESSION ||--o{ APPROVAL_REQUEST : pauses_for
    SESSION ||--o{ REPORT : produces
    SESSION ||--o{ FINDING : contains

    TASK ||--o{ STEP : contains
    STEP ||--o{ TOOL_CALL : executes
    STEP ||--o{ EVIDENCE : produces
    TOOL_CALL ||--o{ EVIDENCE : produces
    FINDING ||--o{ EVIDENCE : references
```

## 9. Suggested Database Tables

```text
workspaces
users
roles
role_permissions
api_tokens
projects
targets
scopes
provider_profiles
policies
sessions
tasks
steps
agent_messages
tool_calls
runtime_containers
file_assets
evidence
findings
reports
approval_requests
audit_events
memory_documents
memory_embeddings
```

Important indexes:

- `sessions(workspace_id, project_id, created_at)`
- `sessions(status)`
- `tasks(session_id, position)`
- `steps(task_id, position)`
- `tool_calls(session_id, created_at)`
- `tool_calls(status)`
- `evidence(session_id, created_at)`
- `findings(session_id, severity)`
- `audit_events(workspace_id, created_at)`
- Vector index for embeddings.

## 10. API Shape

The exact transport can be REST, GraphQL, or a hybrid. A hybrid is practical:

- REST for files, auth, downloads, exports, and health.
- GraphQL or typed RPC for rich app data.
- WebSocket for live events.

Example REST resources:

```text
POST   /api/sessions
GET    /api/sessions/:id
POST   /api/sessions/:id/start
POST   /api/sessions/:id/pause
POST   /api/sessions/:id/stop
POST   /api/sessions/:id/input
GET    /api/sessions/:id/events
GET    /api/sessions/:id/report
POST   /api/projects/:id/resources
GET    /api/files/:id/download
```

Example realtime events:

```text
session.created
session.updated
task.created
task.updated
step.started
step.updated
tool_call.started
tool_call.output
tool_call.finished
evidence.created
finding.created
approval.requested
agent.message
report.updated
```

## 11. Runtime Isolation Design

```mermaid
flowchart TB
    Worker[Worker] --> RuntimeService[Runtime service API]
    RuntimeService --> RuntimeManager[Runtime manager]
    RuntimeManager --> Container[Per-session container]
    Container --> Workspace[/Mounted workspace/]
    Container --> NetworkPolicy[Network policy]
    Container --> Tooling[Security tools]
    RuntimeManager --> ArtifactCollector[Artifact collector]
    ArtifactCollector --> EvidenceStore[(Evidence store)]
    RuntimeManager --> Logs[stdout/stderr stream]
    Logs --> EventBus[Realtime events]
```

Runtime requirements:

- One workspace per session.
- No direct host filesystem access except mounted workspace.
- Docker socket access belongs to the runtime service, not the Celery worker.
- Read/write restrictions inside workspace.
- Configurable network mode.
- Command timeout.
- Max output size.
- Resource limits.
- Cleanup and retention policy.

## 12. Policy Enforcement Points

Policy should be checked at multiple layers:

```mermaid
flowchart LR
    UserInput[User objective] --> ScopeCheck[Scope validation]
    ScopeCheck --> PlanCheck[Plan validation]
    PlanCheck --> ToolCheck[Tool call policy]
    ToolCheck --> RuntimeCheck[Runtime network/file enforcement]
    RuntimeCheck --> Audit[Audit event]
```

Examples:

- Reject terminal command if it targets an out-of-scope host.
- Require approval before running high-impact scans.
- Deny file write outside `/workspace`.
- Limit HTTP request rate.
- Stop session if budget exceeds threshold.
- Mask secrets in logs.

## 13. Realtime Design

Recommended approach:

- Worker writes durable events to database or event table.
- API broadcasts events to subscribed WebSocket clients.
- UI can reconnect and replay from last event ID.
- Use WebSocket from the start so the same channel can later support bidirectional terminal input, approvals, cancellation, and collaborative session state.

```mermaid
sequenceDiagram
    participant Worker
    participant DB as Event Store
    participant API as Realtime Gateway
    participant UI

    Worker->>DB: Insert event
    Worker->>API: Publish event
    API-->>UI: Send event
    UI-->>API: Reconnect with lastEventId
    API->>DB: Fetch missed events
    API-->>UI: Replay missed events
```

## 14. Deployment Architecture

### Initial Local Development Deployment

```mermaid
flowchart TB
    subgraph DevHost[Developer machine]
        WebAPI[Web + API]
        Worker[Worker]
        Runtime[Runtime service]
        Queue[(Redis broker)]
        Docker[Docker daemon]
        Files[(Local files)]
    end

    subgraph HostedSupabase[Hosted Supabase]
        Auth[Supabase Auth]
        Postgres[(Supabase Postgres + pgvector)]
        Storage[(Supabase Storage)]
    end

    Worker --> Runtime
    Runtime --> Docker
    WebAPI --> Postgres
    WebAPI --> Auth
    WebAPI --> Storage
    Worker --> Postgres
    Worker --> Storage
    WebAPI --> Queue
    Worker --> Queue
    WebAPI --> Files
    Runtime --> Files
```

Local development should use hosted Supabase first. Docker Compose runs the application services, runtime service, and Redis locally, while Supabase Auth, Postgres, and Storage stay hosted. The runtime service owns Docker access; the worker calls the runtime service instead of mounting `/var/run/docker.sock`.

### Future Distributed Deployment

```mermaid
flowchart TB
    LB[Load balancer] --> API1[API instance]
    LB --> API2[API instance]
    API1 --> DB[(Managed Postgres)]
    API2 --> DB
    API1 --> Queue[(Queue)]
    API2 --> Queue
    Queue --> W1[Worker pool]
    Queue --> W2[Worker pool]
    W1 --> Runtime1[Runtime nodes]
    W2 --> Runtime2[Runtime nodes]
    W1 --> ObjectStore[(Object store)]
    W2 --> ObjectStore
```

## 15. Technology Decisions

The current stack decision is documented in [Tech Stack Decision](TECH_STACK_DECISION.md).

Chosen stack:

- Backend: Python with FastAPI.
- Frontend: React + TypeScript + Vite.
- Database: Supabase Postgres with pgvector.
- Auth: Supabase Auth.
- Migrations: Alembic.
- Queue: Redis + Celery.
- Runtime: Docker first.
- Deployment: Docker Compose first.
- Realtime: FastAPI WebSocket.

The architecture should still keep strong boundaries between API, workers, runtime, storage, and policy so the implementation can evolve beyond the initial stack later.

## 16. Repository Architecture

Proposed shape:

```text
.
|-- docs/
|-- apps/
|   |-- web/
|   `-- api/
|-- services/
|   |-- runtime/
|   `-- worker/
|-- packages/
|   |-- shared/
|   |-- sdk/
|   `-- policy/
|-- infra/
|   |-- compose/
|   |-- migrations/
|   `-- observability/
`-- scripts/
```

With the chosen Python stack, `apps/api` owns the FastAPI application and shared backend modules. `services/worker` owns Celery worker entrypoints and orchestration code. Shared Python modules can be kept in a backend package if duplication appears.

## 17. Failure Handling

Critical failure cases:

- LLM provider timeout.
- Tool call timeout.
- Container crash.
- Worker process restart.
- Browser disconnect.
- Database connection loss.
- Queue duplication.
- User cancels session.

Expected behavior:

- Persist current state before long operations.
- Mark interrupted tool calls as cancelled, timed out, or unknown.
- Resume only from safe checkpoints.
- Never silently rerun high-risk commands.
- Preserve partial evidence.

## 18. Security Considerations

- Store secrets encrypted.
- Mask secrets in logs.
- Avoid sending secrets to LLMs unless explicitly allowed.
- Validate every tool argument.
- Keep policy checks outside prompts.
- Keep audit logs append-only where possible.
- Limit container capabilities.
- Disable privileged containers by default.
- Add approval gates for risky commands.
- Provide a global kill switch.

## 19. Open Architecture Questions

- Do we want a monolith first or separate API/worker services immediately?
- Should session events be stored as a first-class event table?
- Should policy be a custom engine or use something like OPA later?
- Should the runtime support browser automation from day one?
- Should vector memory be global by default, or project/session only?
- Should reports be generated by the worker or by a dedicated report service?
