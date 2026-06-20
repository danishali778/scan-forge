import { Bell, Building2, ChevronDown } from "lucide-react";

interface WorkspaceTopBarProps {
  workspaceName: string;
  role: string;
  userName: string;
}

export function WorkspaceTopBar({ workspaceName, role, userName }: WorkspaceTopBarProps) {
  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <button
        type="button"
        className="inline-flex h-9 min-w-[168px] items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 shadow-sm"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-slate-600" />
          <span className="truncate">{workspaceName}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      <div className="flex items-center gap-4">
        <button type="button" className="relative grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <span className="rounded-md bg-cyan-100 px-3 py-1.5 text-[13px] font-semibold text-teal-800">{role}</span>
        <button type="button" className="inline-flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#25455d] text-[12px] font-bold text-white shadow-inner">
            DA
          </span>
          <span className="text-[13px] font-semibold text-slate-800">{userName}</span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      </div>
    </header>
  );
}
