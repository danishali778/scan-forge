import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { appRoutes } from "@/app/routes";
import { useCurrentUser } from "@/hooks/useAuth";
import AdminUsersRolesPage from "@/pages/AdminUsersRolesPage";
import AnalyticsAuditPage from "@/pages/AnalyticsAuditPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import EvidencePage from "@/pages/EvidencePage";
import LoginAuthPage from "@/pages/LoginAuthPage";
import MemoryPage from "@/pages/MemoryPage";
import NewAssessmentSetupPage from "@/pages/NewAssessmentSetupPage";
import ProviderPoliciesPage from "@/pages/ProviderPoliciesPage";
import ReportsPage from "@/pages/ReportsPage";
import RuntimeToolCallsPage from "@/pages/RuntimeToolCallsPage";
import SessionCommandCenterPage from "@/pages/SessionCommandCenterPage";
import SessionsListPage from "@/pages/SessionsListPage";
import WorkspaceHomePage from "@/pages/WorkspaceHomePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function FullPageState({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-slate-900">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{detail}</p>
      </div>
    </main>
  );
}

function RequireAuth() {
  const location = useLocation();
  const currentUser = useCurrentUser();

  if (currentUser.isLoading) {
    return <FullPageState title="Checking session" detail="Verifying your ScopeForge workspace access." />;
  }

  if (!currentUser.data?.authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function RootRedirect() {
  const currentUser = useCurrentUser();

  if (currentUser.isLoading) {
    return <FullPageState title="Loading ScopeForge" detail="Preparing your workspace." />;
  }

  return <Navigate to={currentUser.data?.authenticated ? appRoutes.workspace : appRoutes.login} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path={appRoutes.root} element={<RootRedirect />} />
      <Route path={appRoutes.login} element={<LoginAuthPage />} />
      <Route element={<RequireAuth />}>
        <Route path={appRoutes.workspace} element={<WorkspaceHomePage />} />
        <Route path="/projects" element={<Navigate to={appRoutes.projectsNew} replace />} />
        <Route path={appRoutes.projectsNew} element={<NewAssessmentSetupPage />} />
        <Route path={appRoutes.sessions} element={<SessionsListPage />} />
        <Route path="/sessions/:sessionId" element={<SessionCommandCenterPage />} />
        <Route path={appRoutes.runtime} element={<RuntimeToolCallsPage />} />
        <Route path={appRoutes.approvals} element={<ApprovalsPage />} />
        <Route path={appRoutes.evidence} element={<EvidencePage />} />
        <Route path={appRoutes.reports} element={<ReportsPage />} />
        <Route path={appRoutes.memory} element={<MemoryPage />} />
        <Route path={appRoutes.analytics} element={<AnalyticsAuditPage />} />
        <Route path="/settings" element={<Navigate to={appRoutes.settingsUsers} replace />} />
        <Route path={appRoutes.settingsUsers} element={<AdminUsersRolesPage />} />
        <Route path={appRoutes.settingsProviders} element={<ProviderPoliciesPage />} />
      </Route>
      <Route path="*" element={<Navigate to={appRoutes.root} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
