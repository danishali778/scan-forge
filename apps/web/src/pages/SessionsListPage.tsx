import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { appRoutes } from "@/app/routes";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SessionDetailsPanel } from "@/components/sessions-list/SessionDetailsPanel";
import { SessionsFilters } from "@/components/sessions-list/SessionsFilters";
import { SessionsListHeader } from "@/components/sessions-list/SessionsListHeader";
import { SessionsOverview } from "@/components/sessions-list/SessionsOverview";
import { SessionsStatusTabs } from "@/components/sessions-list/SessionsStatusTabs";
import { SessionsTable } from "@/components/sessions-list/SessionsTable";
import { useSessionsList } from "@/hooks/useSessionsList";
import type { SessionStatusTabKey, SessionsListSession } from "@/types/sessions-list";

const PAGE_SIZE = 10;

export function SessionsListPage() {
  const navigate = useNavigate();
  const sessionsList = useSessionsList();
  const [globalSearch, setGlobalSearch] = useState("");
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("All projects");
  const [owner, setOwner] = useState("All owners");
  const [activeTab, setActiveTab] = useState<SessionStatusTabKey>("all");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const sessions = sessionsList.sessions;

  useEffect(() => {
    if (!selectedSessionId && sessions[0]) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  const projects = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.project))).sort(),
    [sessions]
  );
  const owners = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.owner.name))).sort(),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const query = [globalSearch, search].join(" ").trim().toLowerCase();

    return sessions.filter((session) => {
      const matchesTab = activeTab === "all" || session.status === activeTab;
      const matchesProject = project === "All projects" || session.project === project;
      const matchesOwner = owner === "All owners" || session.owner.name === owner;
      const matchesSearch =
        query.length === 0 ||
        session.title.toLowerCase().includes(query) ||
        session.scope.toLowerCase().includes(query) ||
        session.id.toLowerCase().includes(query);

      return matchesTab && matchesProject && matchesOwner && matchesSearch;
    });
  }, [activeTab, globalSearch, owner, project, search, sessions]);

  const selectedSession = useMemo(() => {
    return (
      filteredSessions.find((session) => session.id === selectedSessionId) ??
      sessions.find((session) => session.id === selectedSessionId) ??
      sessions[0]
    );
  }, [filteredSessions, selectedSessionId, sessions]);

  const handleTabChange = (tab: SessionStatusTabKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSelectSession = (session: SessionsListSession) => {
    setSelectedSessionId(session.id);
  };

  const handleToggleFavorite = (sessionId: string) => {
    setFavoriteIds((currentIds) =>
      currentIds.includes(sessionId)
        ? currentIds.filter((id) => id !== sessionId)
        : [...currentIds, sessionId]
    );
  };

  const handleOpenSession = (sessionId: string) => {
    navigate(appRoutes.session(sessionId));
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <AppSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <SessionsListHeader
            globalSearch={globalSearch}
            notificationCount={sessionsList.notificationCount}
            onGlobalSearchChange={setGlobalSearch}
            userInitials={sessionsList.userInitials}
          />

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col px-4 py-4">
              {sessionsList.error ? (
                <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
                  {sessionsList.error.message}
                </div>
              ) : null}
              {sessionsList.isLoading ? (
                <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700">
                  Loading backend sessions...
                </div>
              ) : null}

              <SessionsFilters
                search={search}
                project={project}
                owner={owner}
                projects={projects}
                owners={owners}
                onSearchChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                onProjectChange={(value) => {
                  setProject(value);
                  setPage(1);
                }}
                onOwnerChange={(value) => {
                  setOwner(value);
                  setPage(1);
                }}
              />

              <SessionsStatusTabs tabs={sessionsList.statusTabs} activeTab={activeTab} onTabChange={handleTabChange} />

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-4 pb-4">
                  <SessionsTable
                    sessions={filteredSessions}
                    allCount={sessions.length}
                    selectedSessionId={selectedSessionId}
                    favoriteIds={favoriteIds}
                    page={page}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    onSelectSession={handleSelectSession}
                    onOpenSession={handleOpenSession}
                    onToggleFavorite={handleToggleFavorite}
                  />
                  <SessionsOverview metrics={sessionsList.overviewMetrics} statuses={sessionsList.overviewStatuses} />
                </div>
              </div>
            </div>

            {selectedSession ? (
              <SessionDetailsPanel
                session={selectedSession}
                isActionPending={sessionsList.isActionPending}
                onArchive={sessionsList.lifecycle.archive}
                onOpenSession={handleOpenSession}
                onPause={sessionsList.lifecycle.pause}
                onResume={sessionsList.lifecycle.resume}
                onStart={sessionsList.lifecycle.start}
                onStop={sessionsList.lifecycle.stop}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

export default SessionsListPage;
