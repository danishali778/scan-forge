import { Bell, ChevronDown, HelpCircle, Plus } from "lucide-react";

import { settingsTabs } from "@/mocks/provider-policies";

export function ProviderPoliciesHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">Settings</span>
          <span className="text-slate-300">/</span>
          <h1 className="text-lg font-semibold text-slate-950">Provider profiles and policies</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="inline-flex h-10 min-w-[180px] items-center justify-between rounded-md border border-slate-300 px-3 text-left text-sm">
            <span>
              <span className="block font-semibold text-slate-900">Acme Security</span>
              <span className="block text-xs text-slate-500">Workspace</span>
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="relative grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-0 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              4
            </span>
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100">
            <HelpCircle className="h-5 w-5" />
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700">
            DA
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex h-14 items-center justify-between px-6">
        <nav className="flex h-full items-end gap-8">
          {settingsTabs.map((tab) => (
            <button
              key={tab}
              className={[
                "relative h-full px-0 text-sm font-medium",
                tab === "Provider profiles" ? "text-teal-800" : "text-slate-600",
              ].join(" ")}
            >
              {tab}
              {tab === "Provider profiles" ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-700" />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="flex gap-3">
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm">
            <Plus className="h-4 w-4" />
            New provider
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
            <Plus className="h-4 w-4" />
            New policy
          </button>
        </div>
      </div>
    </header>
  );
}
