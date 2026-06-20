import { Bell, ChevronDown, CircleHelp, Command, Search } from "lucide-react";

type ApprovalHeaderProps = {
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
};

export function ApprovalHeader({ globalSearch, onGlobalSearchChange }: ApprovalHeaderProps) {
  return (
    <header className="shrink-0 bg-[#fbfcfd] px-7 pt-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-normal text-slate-950">Approvals</h1>
          <p className="mt-1 text-[14px] text-slate-500">Review policy-gated actions before execution.</p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex h-9 w-[216px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-500 shadow-sm focus-within:border-teal-500">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={globalSearch}
              onChange={(event) => onGlobalSearchChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Search..."
            />
            <span className="inline-flex h-5 items-center gap-1 text-[11px] font-semibold text-slate-500">
              Ctrl
              <Command className="h-3 w-3" />
            </span>
          </label>

          <button type="button" className="relative grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
            <Bell className="h-5 w-5" />
            <span className="absolute right-0.5 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              7
            </span>
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
            <CircleHelp className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-[13px] font-bold text-white"
          >
            DA
          </button>
          <button type="button" className="flex min-w-[116px] items-center gap-2 text-left">
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-slate-950">Danish Ali</span>
              <span className="block truncate text-[11px] text-slate-500">Operator</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
