import { Building2, ChevronDown, HelpCircle, User } from 'lucide-react';

export function NewAssessmentHeader() {
  return (
    <header className="flex h-[64px] items-center justify-between border-b border-slate-200 bg-white px-7">
      <div className="flex items-center gap-3 text-[17px] font-semibold text-slate-950">
        <span>Projects</span>
        <span className="text-slate-300">/</span>
        <span>New assessment setup</span>
      </div>

      <div className="flex items-center gap-5">
        <button className="flex h-10 min-w-[204px] items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-[14px] font-medium text-slate-700 shadow-sm">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            Acme Security
          </span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100">
          <HelpCircle className="h-6 w-6" />
        </button>
        <button className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600">
          <User className="h-5 w-5" />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-teal-600" />
        </button>
      </div>
    </header>
  );
}
