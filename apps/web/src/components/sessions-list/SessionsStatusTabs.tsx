import type { SessionStatusTab, SessionStatusTabKey } from "@/types/sessions-list";

type SessionsStatusTabsProps = {
  tabs: SessionStatusTab[];
  activeTab: SessionStatusTabKey;
  onTabChange: (tab: SessionStatusTabKey) => void;
};

export function SessionsStatusTabs({ tabs, activeTab, onTabChange }: SessionsStatusTabsProps) {
  return (
    <div className="flex h-12 items-end gap-5 border-b border-slate-200">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={[
              "flex h-12 items-center gap-2 border-b-2 px-1 text-[13px] font-semibold transition",
              isActive
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
            ].join(" ")}
          >
            {tab.label}
            <span
              className={[
                "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold",
                isActive ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500",
              ].join(" ")}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
