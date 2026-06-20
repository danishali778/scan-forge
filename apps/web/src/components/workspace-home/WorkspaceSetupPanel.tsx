import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

import type { WorkspaceSetupItem } from "@/types/workspace-home";

export function WorkspaceSetupPanel({ items }: { items: WorkspaceSetupItem[] }) {
  const completed = items.filter((item) => item.complete).length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-slate-950">Workspace setup</h2>
        <span className="text-[11px] font-medium text-slate-500">
          {completed} of {items.length} completed
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 space-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-[11px] text-slate-600">
            {item.complete ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-600" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            )}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
      <button type="button" className="mt-2 ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
        Go to settings
        <ExternalLink className="h-3 w-3" />
      </button>
    </section>
  );
}
