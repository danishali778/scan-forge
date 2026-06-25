import {
  Bell,
  ChevronDown,
  CircleHelp,
  Command,
  Plus,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";

import { appRoutes } from "@/app/routes";

type SessionsListHeaderProps = {
  globalSearch: string;
  notificationCount: number;
  onGlobalSearchChange: (value: string) => void;
  userInitials: string;
};

export function SessionsListHeader({
  globalSearch,
  notificationCount,
  onGlobalSearchChange,
  userInitials,
}: SessionsListHeaderProps) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white px-7 py-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight text-slate-950">Sessions</h1>
          <p className="mt-1 text-[14px] text-slate-500">
            Track planning, running, paused, awaiting approval, and completed assessments.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex h-10 w-[300px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-500 shadow-sm focus-within:border-teal-500">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={globalSearch}
              onChange={(event) => onGlobalSearchChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Search sessions..."
            />
            <span className="inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 text-[11px] font-semibold text-slate-500">
              <Command className="h-3 w-3" /> K
            </span>
          </label>

          <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 ? (
              <span className="absolute right-1.5 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            ) : null}
          </button>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
            <CircleHelp className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-teal-100 text-[13px] font-bold text-teal-800"
          >
            {userInitials}
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <ChevronDown className="h-4 w-4" />
          </button>
          <Link
            to={appRoutes.projectsNew}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-[13px] font-semibold text-white shadow-sm shadow-teal-900/15 hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" />
            New session
            <ChevronDown className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
