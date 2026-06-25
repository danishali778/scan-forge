import { useMemo, useState } from "react";

import type { ActivityCategory, WorkspaceActivityItem, WorkspaceTone } from "@/types/workspace-home";

const activityTabs = ["All", "Events", "Evidence", "Findings", "Jobs", "Approvals", "Memory"] as const;

const toneClasses: Record<WorkspaceTone, string> = {
  teal: "border-teal-200 bg-teal-50 text-teal-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700",
  cyan: "border-cyan-200 bg-cyan-50 text-teal-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export function RecentActivityPanel({ items }: { items: WorkspaceActivityItem[] }) {
  const [activeTab, setActiveTab] = useState<(typeof activityTabs)[number]>("Events");

  const visibleItems = useMemo(() => {
    if (activeTab === "All") {
      return items;
    }

    return items.filter((item) => item.category === activeTab);
  }, [activeTab, items]);

  return (
    <section className="w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-11 items-center justify-between border-b border-slate-200 px-3">
        <div className="flex items-center gap-5">
          <h2 className="text-[17px] font-semibold text-slate-950">Recent activity</h2>
          <div className="flex items-center gap-4">
            {activityTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "relative h-8 text-[11px] font-medium",
                  activeTab === tab ? "text-slate-950" : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                {tab}
                {activeTab === tab ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-950" /> : null}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="text-[12px] font-semibold text-blue-700">
          View all
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={`${item.time}-${item.label}`} className="grid h-[45px] grid-cols-[66px_34px_minmax(0,1.15fr)_minmax(0,1.45fr)_minmax(0,0.9fr)_90px] items-center px-3 text-[12px]">
                <div className="text-slate-500">{item.time}</div>
                <div>
                  <span className={`grid h-6 w-6 place-items-center rounded-full border ${toneClasses[item.tone]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="truncate font-semibold text-slate-900">{item.label}</div>
                <div className="truncate text-slate-500">{item.detail}</div>
                <div className="truncate text-slate-500">{item.context}</div>
                <div className="truncate text-right text-slate-500">{item.actor}</div>
              </div>
            );
          })
        ) : (
          <div className="grid h-[90px] place-items-center text-[12px] text-slate-500">No recent activity in this view.</div>
        )}
      </div>
    </section>
  );
}
