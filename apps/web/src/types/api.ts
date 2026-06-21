export interface Page<T> {
  items: T[];
  page: {
    limit: number;
    next_cursor: string | null;
    has_more: boolean;
  };
}

export interface CurrentUserResponse {
  authenticated: boolean;
  user_id: string | null;
  email: string | null;
  workspace_id: string | null;
  role: string | null;
  permissions: string[];
}

export interface AuthUserResponse {
  id: string;
  email: string;
  workspace_id: string;
  role: string;
  permissions: string[];
}

export interface AuthResponse {
  user: AuthUserResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  metadata: Record<string, unknown>;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ApiScope {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  rules: Record<string, unknown>;
}

export interface ScopeCreateRequest {
  name: string;
  description?: string | null;
  rules?: Record<string, unknown>;
}

export type ApiTargetType = "domain" | "ip" | "cidr" | "url" | "repo" | "api" | "cloud_account";

export interface ApiTarget {
  id: string;
  workspace_id: string;
  project_id: string;
  type: ApiTargetType;
  value: string;
  label: string | null;
  metadata: Record<string, unknown>;
}

export interface TargetCreateRequest {
  type: ApiTargetType;
  value: string;
  label?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ApiPolicy {
  id: string;
  name: string;
  description: string | null;
  rules: Record<string, unknown>;
  status: string;
}

export interface ApiProviderProfile {
  id: string;
  name: string;
  provider_type: string;
  base_url: string | null;
  agent_models: Record<string, unknown>;
  options: Record<string, unknown>;
  budgets: Record<string, unknown>;
  status: string;
  has_credential: boolean;
}

export interface ApiSessionSummary {
  id: string;
  title: string;
  status: string;
  mode: string;
  project_id: string;
  scope_id: string;
  provider_profile_id: string | null;
  policy_id: string | null;
}

export interface ApiSessionDetail extends ApiSessionSummary {
  objective: string;
  created_by: string;
}

export interface SessionCreateRequest {
  project_id: string;
  scope_id: string;
  policy_id?: string | null;
  provider_profile_id?: string | null;
  title: string;
  objective: string;
  mode?: string;
}

export interface ApiStep {
  id: string;
  session_id: string;
  task_id: string;
  title: string;
  description: string | null;
  status: string;
  agent_role: string | null;
  position: number;
  input: string | null;
  result: string | null;
}

export interface ApiTask {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  result_summary: string | null;
  steps: ApiStep[];
}

export interface ApiJob {
  id: string;
  session_id: string | null;
  type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  progress: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  last_error: string | null;
  celery_task_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface ApiSessionEvent {
  id: number;
  session_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  actor_type: string;
  actor_id: string;
  created_at: string;
}

export interface ApiRuntimeInstance {
  id: string;
  session_id: string;
  runtime_type: string;
  status: string;
  image: string;
  external_id: string | null;
  workspace_path: string;
  ports: Record<string, unknown>;
  resource_limits: Record<string, unknown>;
  started_at: string | null;
  stopped_at: string | null;
}

export interface ApiToolCall {
  id: string;
  session_id: string;
  task_id: string | null;
  step_id: string | null;
  agent_message_id: string | null;
  runtime_instance_id: string | null;
  tool_name: string;
  tool_version: string | null;
  status: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  raw_output: string | null;
  error_message: string | null;
  policy_decision: Record<string, unknown>;
  runtime_command_id: string | null;
  duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface TerminalCommandRequest {
  command: string[];
  cwd?: string;
  timeout_seconds?: number | null;
  max_output_bytes?: number | null;
}

export interface RuntimeFileEntry {
  name: string;
  path: string;
  type: string;
  size_bytes: number | null;
}

export interface RuntimeFileListResponse {
  path: string;
  entries: RuntimeFileEntry[];
}

export interface RuntimeFileContentResponse {
  path: string;
  content: string;
  size_bytes: number;
}

export interface RuntimeFileWriteRequest {
  path: string;
  content: string;
}

export interface RuntimeFileWriteResponse {
  path: string;
  size_bytes: number;
}
