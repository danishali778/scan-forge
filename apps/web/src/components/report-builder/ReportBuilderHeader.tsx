import {
  Braces,
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileCode2,
  FileText,
  MoreHorizontal,
  Pencil,
  Play,
} from "lucide-react";

type ReportBuilderHeaderProps = {
  title: string;
  status: string;
  sessionName: string;
};

export function ReportBuilderHeader({ title, status, sessionName }: ReportBuilderHeaderProps) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-[58px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="text-slate-500">Projects</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">Acme Staging Review</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-950">Reports</span>
        </div>
      </div>

      <div className="flex h-[58px] items-center justify-between gap-5 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="h-5 w-5 shrink-0 text-slate-600" />
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ml-5 inline-flex h-8 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {status}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="mr-2 text-sm text-slate-600">Session</span>
          <button
            type="button"
            className="inline-flex h-9 min-w-[210px] items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate">{sessionName}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
          </button>
          <button
            type="button"
            className="ml-7 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Play className="h-4 w-4" />
            Render
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
          >
            <Check className="h-4 w-4" />
            Finalize
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileCode2 className="h-4 w-4" />
            Export Markdown
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Braces className="h-4 w-4" />
            Export JSON
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <span className="sr-only">
            <Download />
          </span>
        </div>
      </div>
    </header>
  );
}
