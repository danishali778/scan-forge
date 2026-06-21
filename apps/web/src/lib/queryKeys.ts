export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  policies: {
    list: () => ["policies"] as const,
  },
  projects: {
    list: () => ["projects"] as const,
    detail: (projectId: string) => ["projects", projectId] as const,
    scopes: (projectId: string) => ["projects", projectId, "scopes"] as const,
    targets: (projectId: string) => ["projects", projectId, "targets"] as const,
  },
  providerProfiles: {
    list: () => ["provider-profiles"] as const,
  },
  sessions: {
    list: () => ["sessions"] as const,
    detail: (sessionId: string) => ["sessions", sessionId] as const,
    tasks: (sessionId: string) => ["sessions", sessionId, "tasks"] as const,
    jobs: (sessionId: string) => ["sessions", sessionId, "jobs"] as const,
    events: (sessionId: string) => ["sessions", sessionId, "events"] as const,
    runtime: (sessionId: string) => ["sessions", sessionId, "runtime"] as const,
    toolCalls: (sessionId: string) => ["sessions", sessionId, "tool-calls"] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
