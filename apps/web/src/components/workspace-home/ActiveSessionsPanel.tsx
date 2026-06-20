import { ChevronRight, Clock3, MoreHorizontal, PauseCircle, PlayCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { sessionFilterTabs } from "@/mocks/workspace-home";
import type { RuntimeStatus, SessionStatus, WorkspaceSession } from "@/types/workspace-home";

const statusClasses: Record<SessionStatus, string> = {
  running: "border-teal-200 bg-teal-50 text-teal-700",
  paused: "border-slate-200 bg-slate-100 text-slate-700",
  planning: "border-blue-200 bg-blue-50 text-blue-700",
};

const runtimeClasses: Record<RuntimeStatus, string> = {
  healthy: "bg-emerald-500",
  unhealthy: "bg-red-500",
  offline: "bg-slate-400",
};

function statusLabel(status: SessionStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function RuntimeCell({ status }: { status: RuntimeStatus }) {
  if (status === "offline") {
    return <span className="font-semibold text-slate-500">-</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-slate-600">
      <span className={`h-1.5 w-1.5 rounded-full ${runtimeClasses[status]}`} />
      {status === "healthy" ? "Healthy" : "Unhealthy"}
    </span>
  );
}

export function ActiveSessionsPanel({ sessions }: { sessions: WorkspaceSession[] }) {
  const [filter, setFilter] = useState<(typeof sessionFilterTabs)[number]["value"]>("all");

  const filteredSessions = useMemo(() => {
    if (filter === "all") {
      return sessions;
    }

    return sessions.filter((session) => session.status === filter);
  }, [filter, sessions]);

  const countFor = (value: string) => {
    if (value === "all") {
      return sessions.length;
    }

    return sessions.filter((session) => session.status === value).length;
  };

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-[15px] font-semibold text-slate-950">Active sessions</h2>
        <button type="button" className="text-[12px] font-semibold text-blue-700 hover:text-blue-800">
          View all
        </button>
      </div>

      <div className="flex h-12 items-center gap-4 border-b border-slate-200 px-3">
        {sessionFilterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={[
              "h-8 rounded-full px-3 text-[12px] font-medium transition",
              filter === tab.value
                ? "border border-slate-300 bg-slate-50 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            ].join(" ")}
          >
            {tab.label} ({countFor(tab.value)})
          </button>
        ))}
      </div>

      <table className="w-full table-fixed text-left text-[12px]">
        <thead className="h-11 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
          <tr>
            <th className="w-[34px] px-3" />
            <th className="w-[31%] px-2">Session</th>
            <th className="w-[15%] px-2">Project</th>
            <th className="w-[10%] px-2">Status</th>
            <th className="w-[17%] px-2">Current step</th>
            <th className="w-[12%] px-2">Runtime</th>
            <th className="w-[10%] px-2">Last event</th>
            <th className="w-[10%] px-2">Owner</th>
            <th className="w-[34px] px-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredSessions.map((session) => (
            <tr key={session.id} className="h-[64px] hover:bg-slate-50">
              <td className="px-3 text-slate-500">
                <ChevronRight className="h-4 w-4" />
              </td>
              <td className="px-2">
                <div className="flex min-w-0 items-center gap-3">
                  {session.status === "planning" ? (
                    <Clock3 className="h-4 w-4 shrink-0 text-slate-500" />
                  ) : session.status === "paused" ? (
                    <PauseCircle className="h-4 w-4 shrink-0 text-slate-500" />
                  ) : (
                    <PlayCircle className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{session.title}</div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500">{session.id}</div>
                  </div>
                </div>
              </td>
              <td className="truncate px-2 text-slate-600">{session.project}</td>
              <td className="px-2">
                <span className={`rounded px-2 py-1 text-[11px] font-medium ${statusClasses[session.status]}`}>
                  {statusLabel(session.status)}
                </span>
              </td>
              <td className="px-2">
                <div className="truncate font-medium text-slate-800">{session.currentStep}</div>
                <div className="text-[11px] text-slate-500">{session.stepProgress}</div>
              </td>
              <td className="px-2">
                <RuntimeCell status={session.runtimeStatus} />
              </td>
              <td className="px-2 text-slate-500">{session.lastEvent}</td>
              <td className="px-2">
                <span className="inline-flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    {session.ownerInitials}
                  </span>
                  <span className="truncate text-slate-700">{session.owner}</span>
                </span>
              </td>
              <td className="px-2 text-right text-slate-500">
                <MoreHorizontal className="h-4 w-4" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
