import { ChevronLeft, ChevronRight, ChevronsUpDown, ExternalLink, MoreHorizontal, Star } from "lucide-react";

import { SessionStatusBadge } from "@/components/sessions-list/SessionStatusBadge";
import type { SessionsListSession } from "@/types/sessions-list";

type SessionsTableProps = {
  sessions: SessionsListSession[];
  allCount: number;
  selectedSessionId: string;
  favoriteIds: string[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSelectSession: (session: SessionsListSession) => void;
  onOpenSession: (sessionId: string) => void;
  onToggleFavorite: (sessionId: string) => void;
};

const ownerColorStyles: Record<SessionsListSession["owner"]["color"], string> = {
  teal: "bg-teal-100 text-teal-800",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-700",
};

const runtimeDotStyles: Record<SessionsListSession["runtime"]["state"], string> = {
  healthy: "bg-emerald-500",
  idle: "bg-slate-300",
  stopped: "bg-slate-400",
  failed: "bg-red-500",
};

export function SessionsTable({
  sessions,
  allCount,
  selectedSessionId,
  favoriteIds,
  page,
  pageSize,
  onPageChange,
  onSelectSession,
  onOpenSession,
  onToggleFavorite,
}: SessionsTableProps) {
  const maxPage = Math.max(1, Math.ceil(sessions.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const visibleSessions = sessions.slice(startIndex, startIndex + pageSize);
  const showingStart = sessions.length > 0 ? startIndex + 1 : 0;
  const showingEnd = Math.min(startIndex + pageSize, sessions.length);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full table-fixed border-collapse text-left text-[13px]">
        <thead className="h-13 bg-white text-[12px] font-semibold text-slate-600">
          <tr>
            <th className="w-9 px-2" />
            <th className="w-[150px] px-2">Session</th>
            <th className="w-[104px] px-2">Project</th>
            <th className="w-[88px] px-2">Scope</th>
            <th className="w-[108px] px-2">Status</th>
            <th className="w-[132px] px-2">Current step</th>
            <th className="w-[84px] px-2">Runtime</th>
            <th className="w-[70px] px-2 text-center">Approvals</th>
            <th className="w-[68px] px-2 text-center">Evidence</th>
            <th className="w-[64px] px-2 text-center">Findings</th>
            <th className="w-[88px] px-2">Last event</th>
            <th className="w-[48px] px-2">
              <span className="inline-flex items-center gap-1">
                Owner
                <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {visibleSessions.map((session) => {
            const isSelected = selectedSessionId === session.id;
            const isFavorite = favoriteIds.includes(session.id);

            return (
              <tr
                key={session.id}
                className={[
                  "h-[56px] cursor-pointer transition",
                  isSelected ? "bg-teal-50/60" : "bg-white hover:bg-slate-50",
                ].join(" ")}
                onClick={() => onSelectSession(session)}
              >
                <td className="px-2">
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-amber-500"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(session.id);
                    }}
                    aria-label={isFavorite ? "Remove favorite" : "Favorite session"}
                  >
                    <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                </td>
                <td className="px-2">
                  <div className="truncate font-semibold text-slate-900">{session.title}</div>
                  <div className="truncate text-[12px] text-slate-500">{session.id}</div>
                </td>
                <td className="truncate px-2 text-slate-700">{session.project}</td>
                <td className="truncate px-2 text-slate-700">{session.scope}</td>
                <td className="px-2">
                  <SessionStatusBadge status={session.status} />
                </td>
                <td className="px-2">
                  <div className="truncate text-slate-800">{session.currentStep}</div>
                  {session.taskProgress ? (
                    <div className="text-[12px] text-slate-500">{session.taskProgress}</div>
                  ) : null}
                </td>
                <td className="px-2">
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    {session.runtime.state !== "idle" ? (
                      <span className={`h-1.5 w-1.5 rounded-full ${runtimeDotStyles[session.runtime.state]}`} />
                    ) : null}
                    {session.runtime.label}
                  </span>
                </td>
                <td className="px-2 text-center text-slate-700">
                  {session.approvals > 0 ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {session.approvals}
                    </span>
                  ) : (
                    session.approvals
                  )}
                </td>
                <td className="px-2 text-center text-slate-700">{session.evidence}</td>
                <td className="px-2 text-center text-slate-700">{session.findings}</td>
                <td className="px-2">
                  <div className="text-slate-800">{session.lastEventTime}</div>
                  <div className="text-[12px] text-slate-500">{session.lastEventDate}</div>
                </td>
                <td className="px-2">
                  <div
                    className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold ${ownerColorStyles[session.owner.color]}`}
                    title={session.owner.name}
                  >
                    {session.owner.initials}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex h-[54px] items-center justify-between border-t border-slate-200 px-4 text-[13px] text-slate-600">
        <span>
          Showing {showingStart} to {showingEnd} of {sessions.length || allCount} sessions
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-45"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {[1, 2, 3].map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={[
                "grid h-8 min-w-8 place-items-center rounded-md border px-2 text-[13px] font-semibold",
                page === pageNumber
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-slate-200 bg-white text-slate-600",
              ].join(" ")}
              onClick={() => onPageChange(Math.min(pageNumber, maxPage))}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-45"
            disabled={page >= maxPage}
            onClick={() => onPageChange(Math.min(maxPage, page + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ml-4 inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700"
          >
            {pageSize} / page
            <ChevronRight className="h-3.5 w-3.5 rotate-90" />
          </button>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700"
            onClick={() => onOpenSession(selectedSessionId)}
          >
            Open
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
