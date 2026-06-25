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
  sessions: { id: string; title: string }[];
  selectedSessionId: string;
  selectedReportId: string;
  canFinalize?: boolean;
  isBusy?: boolean;
  onSessionChange: (sessionId: string) => void;
  onCreateReport: () => void;
  onRender: () => void;
  onFinalize: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
};

export function ReportBuilderHeader({
  title,
  status,
  sessionName,
  sessions,
  selectedSessionId,
  selectedReportId,
  canFinalize = false,
  isBusy = false,
  onSessionChange,
  onCreateReport,
  onRender,
  onFinalize,
  onExportMarkdown,
  onExportJson,
}: ReportBuilderHeaderProps) {
  const hasReport = Boolean(selectedReportId);

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
          <label className="relative inline-flex h-9 min-w-[230px] items-center">
            <Calendar className="pointer-events-none absolute left-3 h-4 w-4 shrink-0 text-slate-500" />
            <select
              value={selectedSessionId}
              onChange={(event) => onSessionChange(event.target.value)}
              className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white pl-9 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-teal-600"
              aria-label="Select report session"
            >
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))
              ) : (
                <option value="">{sessionName}</option>
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 shrink-0 text-slate-500" />
          </label>
          <button
            type="button"
            disabled={!selectedSessionId || isBusy}
            onClick={onCreateReport}
            className="ml-3 inline-flex h-9 items-center gap-2 rounded-md border border-teal-600/40 px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            New report
          </button>
          <button
            type="button"
            disabled={!hasReport || isBusy}
            onClick={onRender}
            className="ml-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Render
          </button>
          <button
            type="button"
            disabled={!hasReport || !canFinalize || isBusy}
            onClick={onFinalize}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Finalize
          </button>
          <button
            type="button"
            disabled={!hasReport || isBusy}
            onClick={onExportMarkdown}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileCode2 className="h-4 w-4" />
            Export Markdown
          </button>
          <button
            type="button"
            disabled={!hasReport || isBusy}
            onClick={onExportJson}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
