import { useMemo, useState } from "react";

import { SessionDetailsPanel } from "@/components/sessions-list/SessionDetailsPanel";
import { SessionsFilters } from "@/components/sessions-list/SessionsFilters";
import { SessionsListHeader } from "@/components/sessions-list/SessionsListHeader";
import { SessionsListSidebar } from "@/components/sessions-list/SessionsListSidebar";
import { SessionsOverview } from "@/components/sessions-list/SessionsOverview";
import { SessionsStatusTabs } from "@/components/sessions-list/SessionsStatusTabs";
import { SessionsTable } from "@/components/sessions-list/SessionsTable";
import { sessionStatusTabs, sessionsListSessions } from "@/mocks/sessions-list";
import type { SessionStatusTabKey, SessionsListSession } from "@/types/sessions-list";

const PAGE_SIZE = 10;

export function SessionsListPage() {
  const [globalSearch, setGlobalSearch] = useState("");
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("All projects");
  const [owner, setOwner] = useState("All owners");
  const [activeTab, setActiveTab] = useState<SessionStatusTabKey>("all");
  const [selectedSessionId, setSelectedSessionId] = useState(sessionsListSessions[0].id);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [actionState, setActionState] = useState<"idle" | "paused" | "stopped">("idle");

  const projects = useMemo(
    () => Array.from(new Set(sessionsListSessions.map((session) => session.project))).sort(),
    []
  );
  const owners = useMemo(
    () => Array.from(new Set(sessionsListSessions.map((session) => session.owner.name))).sort(),
    []
  );

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessionsListSessions.filter((session) => {
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
  }, [activeTab, owner, project, search]);

  const selectedSession = useMemo(() => {
    return (
      filteredSessions.find((session) => session.id === selectedSessionId) ??
      sessionsListSessions.find((session) => session.id === selectedSessionId) ??
      sessionsListSessions[0]
    );
  }, [filteredSessions, selectedSessionId]);

  const handleTabChange = (tab: SessionStatusTabKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSelectSession = (session: SessionsListSession) => {
    setSelectedSessionId(session.id);
    setActionState("idle");
  };

  const handleToggleFavorite = (sessionId: string) => {
    setFavoriteIds((currentIds) =>
      currentIds.includes(sessionId)
        ? currentIds.filter((id) => id !== sessionId)
        : [...currentIds, sessionId]
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <SessionsListSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <SessionsListHeader globalSearch={globalSearch} onGlobalSearchChange={setGlobalSearch} />

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col px-4 py-4">
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

              <SessionsStatusTabs tabs={sessionStatusTabs} activeTab={activeTab} onTabChange={handleTabChange} />

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-4 pb-4">
                  <SessionsTable
                    sessions={filteredSessions}
                    allCount={sessionsListSessions.length}
                    selectedSessionId={selectedSessionId}
                    favoriteIds={favoriteIds}
                    page={page}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                    onSelectSession={handleSelectSession}
                    onToggleFavorite={handleToggleFavorite}
                  />
                  <SessionsOverview />
                </div>
              </div>
            </div>

            <SessionDetailsPanel
              session={selectedSession}
              actionState={actionState}
              onActionStateChange={setActionState}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default SessionsListPage;
