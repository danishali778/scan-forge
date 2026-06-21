export const appRoutes = {
  root: "/",
  login: "/login",
  workspace: "/workspace",
  projects: "/projects/new",
  projectsNew: "/projects/new",
  sessions: "/sessions",
  session: (sessionId: string) => `/sessions/${sessionId}`,
  runtime: "/runtime",
  runtimeSession: (sessionId: string) => `/runtime?session_id=${encodeURIComponent(sessionId)}`,
  approvals: "/approvals",
  evidence: "/evidence",
  reports: "/reports",
  memory: "/memory",
  analytics: "/analytics",
  settings: "/settings/users",
  settingsUsers: "/settings/users",
  settingsProviders: "/settings/providers",
} as const;

const navPathsByLabel: Record<string, string | undefined> = {
  Dashboard: appRoutes.workspace,
  Workspace: appRoutes.workspace,
  Projects: appRoutes.projects,
  Sessions: appRoutes.sessions,
  Runtime: appRoutes.runtime,
  Approvals: appRoutes.approvals,
  Evidence: appRoutes.evidence,
  Reports: appRoutes.reports,
  Memory: appRoutes.memory,
  Analytics: appRoutes.analytics,
  Settings: appRoutes.settings,
};

export function getNavPath(label: string) {
  return navPathsByLabel[label];
}

export function getSettingsTabPath(label: string) {
  if (label === "Users" || label === "Roles") {
    return appRoutes.settingsUsers;
  }

  if (label === "Provider profiles" || label === "Policies") {
    return appRoutes.settingsProviders;
  }

  return undefined;
}

export function isNavPathActive(label: string, pathname: string) {
  switch (label) {
    case "Dashboard":
    case "Workspace":
      return pathname === appRoutes.workspace;
    case "Projects":
      return pathname.startsWith("/projects");
    case "Sessions":
      return pathname === appRoutes.sessions || pathname.startsWith("/sessions/");
    case "Settings":
      return pathname.startsWith("/settings");
    case "Analytics":
      return pathname === appRoutes.analytics;
    default: {
      const path = getNavPath(label);
      return Boolean(path && pathname === path);
    }
  }
}
