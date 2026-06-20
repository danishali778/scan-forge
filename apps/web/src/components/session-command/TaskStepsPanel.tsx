import { CheckCircle2, ChevronDown, Circle, Play, Plus } from "lucide-react";

import { sessionTasks } from "@/mocks/session-command";

function ProgressRing({ status }: { status: "completed" | "in_progress" | "pending" }) {
  if (status === "completed") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  }

  if (status === "in_progress") {
    return <Circle className="h-5 w-5 fill-amber-50 text-amber-500" />;
  }

  return <Circle className="h-5 w-5 text-slate-400" />;
}

export function TaskStepsPanel() {
  return (
    <section className="flex w-[370px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-base font-semibold text-slate-950">Tasks &amp; steps</h2>
        <div className="mt-3 text-sm text-slate-500">33% complete</div>
        <div className="mt-3 h-2 rounded-full bg-slate-200">
          <div className="h-2 w-1/3 rounded-full bg-teal-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          {sessionTasks.map((task, taskIndex) => (
            <div key={task.id} className={taskIndex > 0 ? "border-t border-slate-200" : ""}>
              <div className="flex items-center gap-3 bg-white px-4 py-4">
                <ChevronDown className="h-4 w-4 text-slate-600" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-950">
                    {task.index} {task.title}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <ProgressRing status={task.status} />
                  <span
                    className={`text-xs font-semibold ${
                      task.status === "completed"
                        ? "text-emerald-600"
                        : task.status === "in_progress"
                          ? "text-amber-600"
                          : "text-slate-500"
                    }`}
                  >
                    {task.completeCount} / {task.totalCount}
                  </span>
                </div>
              </div>

              <div>
                {task.steps.map((step) => {
                  const isRunning = step.status === "running";
                  const isCompleted = step.status === "completed";

                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={`flex w-full items-start gap-3 px-8 py-4 text-left ${
                        isRunning
                          ? "bg-teal-50 text-slate-950 shadow-[inset_4px_0_0_#0f766e]"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : isRunning ? (
                          <Play className="h-5 w-5 fill-teal-700 text-teal-700" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-500" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {step.index} {step.title}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {isCompleted
                            ? "Completed"
                            : isRunning
                              ? `In progress • ${step.duration}`
                              : "Pending"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-medium text-slate-600"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>
    </section>
  );
}
