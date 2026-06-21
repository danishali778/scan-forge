import { Building2, ChevronDown, HelpCircle, Plus } from "lucide-react";

import { currentUser, settingsTabs, workspaceStats } from "@/mocks/admin-users-roles";

interface AdminUsersRolesHeaderProps {
  activeTab: (typeof settingsTabs)[number];
  onTabChange: (tab: (typeof settingsTabs)[number]) => void;
}

export function AdminUsersRolesHeader({ activeTab, onTabChange }: AdminUsersRolesHeaderProps) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-[64px] items-center justify-between gap-4 px-7">
        <div className="flex items-center gap-3 text-[14px]">
          <span className="text-slate-500">Settings</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-950">Users and roles</span>
        </div>

        <div className="flex items-center gap-5">
          <button
            type="button"
            className="flex h-10 min-w-[238px] items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-[13px] shadow-sm"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Building2 className="h-4 w-4 shrink-0 text-slate-600" />
              <span>
                <span className="block truncate font-semibold text-slate-950">{workspaceStats.name}</span>
                <span className="block text-[12px] leading-4 text-slate-500">Workspace</span>
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
          </button>

          <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
            <HelpCircle className="h-5 w-5" />
          </button>

          <div className="h-8 border-l border-slate-200" />

          <button type="button" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">
              {currentUser.initials}
            </span>
            <span className="text-left">
              <span className="block text-[14px] font-semibold text-slate-950">{currentUser.name}</span>
              <span className="block text-[12px] text-slate-500">{currentUser.role}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="flex h-[64px] items-center justify-between gap-6 px-7">
        <nav className="flex h-full items-center gap-8">
          {settingsTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={[
                "relative h-full text-[14px] font-semibold transition",
                activeTab === tab ? "text-teal-800" : "text-slate-700 hover:text-slate-950",
              ].join(" ")}
            >
              {tab}
              {activeTab === tab ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-700" />
              ) : null}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-[14px] font-semibold text-white shadow-sm hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" />
          Invite user
        </button>
      </div>
    </header>
  );
}
