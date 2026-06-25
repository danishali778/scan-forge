import type { MemoryTabKey } from "@/types/memory-library";

import { TabIcon } from "./MemoryBadges";

interface MemoryStatusTabsProps {
  activeTab: MemoryTabKey;
  counts: Record<MemoryTabKey, number>;
  onTabChange: (tab: MemoryTabKey) => void;
}

const memoryTabs: Array<{ key: MemoryTabKey; label: string }> = [
  { key: "Candidate", label: "Candidate" },
  { key: "Approved", label: "Approved" },
  { key: "Rejected", label: "Rejected" },
  { key: "Archived", label: "Archived" },
  { key: "Blocked", label: "Blocked" },
];

const activeStyles: Record<MemoryTabKey, string> = {
  Candidate: "border-amber-500 text-amber-700",
  Approved: "border-emerald-500 text-emerald-700",
  Rejected: "border-red-500 text-red-700",
  Archived: "border-slate-500 text-slate-700",
  Blocked: "border-red-500 text-red-700",
};

export function MemoryStatusTabs({ activeTab, counts, onTabChange }: MemoryStatusTabsProps) {
  return (
    <div className="flex h-[58px] shrink-0 items-end gap-7 border-b border-slate-200 bg-white px-4">
      {memoryTabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex h-full items-center gap-2 border-b-2 px-2 text-sm font-semibold transition ${
              isActive ? activeStyles[tab.key] : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <TabIcon status={tab.key} active={isActive} />
            {tab.label}
            <span className="ml-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
              {counts[tab.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
