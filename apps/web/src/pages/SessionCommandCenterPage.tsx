import { SessionCommandHeader } from "@/components/session-command/SessionCommandHeader";
import { SessionCommandSidebar } from "@/components/session-command/SessionCommandSidebar";
import { SessionMainPanel } from "@/components/session-command/SessionMainPanel";
import { SessionMetricsStrip } from "@/components/session-command/SessionMetricsStrip";
import { SessionRightRail } from "@/components/session-command/SessionRightRail";
import { TaskStepsPanel } from "@/components/session-command/TaskStepsPanel";

export function SessionCommandCenterPage() {
  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <SessionCommandSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <SessionCommandHeader />

          <div className="flex min-h-0 flex-1">
            <TaskStepsPanel />
            <SessionMainPanel />
            <SessionRightRail />
          </div>

          <SessionMetricsStrip />
        </div>
      </div>
    </div>
  );
}

export default SessionCommandCenterPage;
