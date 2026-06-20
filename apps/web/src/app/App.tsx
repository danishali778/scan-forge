import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { useCurrentUser } from "@/hooks/useAuth";
import LoginAuthPage from "@/pages/LoginAuthPage";
import NewAssessmentSetupPage from "@/pages/NewAssessmentSetupPage";
import SessionCommandCenterPage from "@/pages/SessionCommandCenterPage";

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

  return <Navigate to={currentUser.data?.authenticated ? "/projects/new" : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginAuthPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/projects/new" element={<NewAssessmentSetupPage />} />
        <Route path="/sessions/:sessionId" element={<SessionCommandCenterPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
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
