import { Bell, ChevronDown } from "lucide-react";

export function MemoryHeader() {
  return (
    <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Memory</h1>
        <p className="mt-1 text-sm text-slate-500">Review, approve, promote, and search scoped knowledge.</p>
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          className="flex h-14 min-w-[178px] items-center justify-between rounded-md border border-slate-300 bg-white px-4 text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-slate-900">Acme Security</span>
            <span className="block text-xs text-slate-500">Workspace</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-600" />
        </button>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-md text-slate-700 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
        </button>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white">
          DA
        </span>
      </div>
    </header>
  );
}
