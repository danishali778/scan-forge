import { BriefcaseBusiness, FileText, MessageSquare, ShieldCheck, SquareTerminal, Target } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { SessionCommandHeader } from "@/components/session-command/SessionCommandHeader";
import { SessionCommandSidebar } from "@/components/session-command/SessionCommandSidebar";
import { SessionMainPanel } from "@/components/session-command/SessionMainPanel";
import { SessionMetricsStrip } from "@/components/session-command/SessionMetricsStrip";
import { SessionRightRail } from "@/components/session-command/SessionRightRail";
import { TaskStepsPanel } from "@/components/session-command/TaskStepsPanel";
import { useSessionCommandCenter, useSessionControls } from "@/hooks/useSessionCommandCenter";
import { getErrorMessage } from "@/lib/errors";
import { mapApiTasks, mapLiveEvents, mapTimelineEvents } from "@/lib/sessionMapping";
import { liveEvents, metricItems, recentEvents, sessionTasks } from "@/mocks/session-command";
import type { MetricItem } from "@/types/session-command";

export function SessionCommandCenterPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const commandCenter = useSessionCommandCenter(sessionId);
  const controls = useSessionControls(sessionId);

  const mappedTasks = useMemo(() => mapApiTasks(commandCenter.tasks), [commandCenter.tasks]);
  const tasks = mappedTasks.length > 0 ? mappedTasks : sessionTasks;
  const timelineEvents = commandCenter.events.length > 0 ? mapTimelineEvents(commandCenter.events) : recentEvents;
  const liveEventItems = commandCenter.events.length > 0 ? mapLiveEvents(commandCenter.events) : liveEvents;

  const metrics: MetricItem[] = useMemo(() => {
    const failedJobs = commandCenter.jobs.filter((job) => job.status === "failed").length;
    const succeededTools = commandCenter.toolCalls.filter((toolCall) => toolCall.status === "succeeded").length;
    const totalTools = commandCenter.toolCalls.length;
    const toolSuccessRate = totalTools > 0 ? Math.round((succeededTools / totalTools) * 100) : 0;
    const completedSteps = tasks.reduce((count, task) => count + task.completeCount, 0);
    const totalSteps = tasks.reduce((count, task) => count + task.totalCount, 0);

    return [
      {
        ...metricItems[0],
        icon: SquareTerminal,
        value: String(totalTools),
        helper: totalTools > 0 ? `${toolSuccessRate}% success` : "No calls yet",
      },
      {
        ...metricItems[1],
        icon: FileText,
        value: String(commandCenter.events.filter((event) => event.event_type.startsWith("evidence.")).length),
        helper: "Evidence events",
      },
      {
        ...metricItems[2],
        icon: Target,
        value: String(commandCenter.events.filter((event) => event.event_type.startsWith("finding.")).length),
        helper: "Finding events",
      },
      {
        ...metricItems[3],
        icon: ShieldCheck,
        value: String(commandCenter.events.filter((event) => event.event_type.startsWith("approval.")).length),
        helper: "Approval events",
      },
      {
        ...metricItems[4],
        icon: BriefcaseBusiness,
        value: String(commandCenter.jobs.length),
        helper: `${failedJobs} failed`,
      },
      {
        ...metricItems[5],
        icon: MessageSquare,
        value: `${completedSteps}/${totalSteps}`,
        helper: "Steps complete",
      },
    ];
  }, [commandCenter.events, commandCenter.jobs, commandCenter.toolCalls, tasks]);

  if (!sessionId) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
        Missing session id.
      </div>
    );
  }

  if (commandCenter.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
        Loading session...
      </div>
    );
  }

  if (commandCenter.error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-950">Session could not be loaded</h1>
          <p className="mt-2 text-sm text-slate-600">{getErrorMessage(commandCenter.error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <SessionCommandSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <SessionCommandHeader
            session={commandCenter.session}
            isMutating={controls.isPending}
            onPause={() => controls.pause.mutate()}
            onStop={() => controls.stop.mutate()}
          />

          <div className="flex min-h-0 flex-1">
            <TaskStepsPanel tasks={tasks} />
            <SessionMainPanel
              session={commandCenter.session}
              tasks={tasks}
              events={timelineEvents}
              jobCount={commandCenter.jobs.length}
              toolCallCount={commandCenter.toolCalls.length}
            />
            <SessionRightRail liveEventItems={liveEventItems} runtime={commandCenter.runtime} />
          </div>

          <SessionMetricsStrip metrics={metrics} />
        </div>
      </div>
    </div>
  );
}

export default SessionCommandCenterPage;
