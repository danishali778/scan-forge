import { ExternalLink, GripVertical } from "lucide-react";

import { CheckboxControl, Panel, TinyTag, ToggleSwitch } from "@/components/report-builder/ReportBuilderPrimitives";
import type {
  ReportCollaborator,
  ReportSection,
  ReportStatusOption,
  ScopeSummary,
} from "@/types/report-builder";

type ReportSettingsPanelProps = {
  title: string;
  scope: ScopeSummary;
  statuses: ReportStatusOption[];
  sections: ReportSection[];
  authors: ReportCollaborator[];
  reviewers: ReportCollaborator[];
  selectedAuthor: string;
  selectedReviewer: string;
  exportMarkdown: boolean;
  exportJson: boolean;
  canEditReport?: boolean;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  onToggleStatus: (id: ReportStatusOption["id"]) => void;
  onToggleSection: (id: string) => void;
  onAuthorChange: (id: string) => void;
  onReviewerChange: (id: string) => void;
  onExportMarkdownChange: () => void;
  onExportJsonChange: () => void;
};

export function ReportSettingsPanel({
  title,
  scope,
  statuses,
  sections,
  authors,
  reviewers,
  selectedAuthor,
  selectedReviewer,
  exportMarkdown,
  exportJson,
  canEditReport = false,
  onTitleChange,
  onTitleBlur,
  onToggleStatus,
  onToggleSection,
  onAuthorChange,
  onReviewerChange,
  onExportMarkdownChange,
  onExportJsonChange,
}: ReportSettingsPanelProps) {
  return (
    <Panel title="Report Settings" className="h-full">
      <div className="space-y-4 p-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Report title</span>
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={title}
            disabled={!canEditReport}
            onChange={(event) => onTitleChange(event.target.value)}
            onBlur={onTitleBlur}
          />
        </label>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Include findings with status</span>
            <span className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500">
              i
            </span>
          </div>
          <div className="space-y-2.5">
            {statuses.map((status) => (
              <div key={status.id} className="flex items-center justify-between gap-3">
                <CheckboxControl checked={status.included} label={status.label} onChange={() => onToggleStatus(status.id)} />
                <TinyTag tone={status.included ? "green" : "slate"}>{status.included ? "Incl." : "Excl."}</TinyTag>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Report sections</span>
            <span className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500">
              i
            </span>
          </div>
          <div className="overflow-hidden rounded-md border border-slate-200">
            {sections.map((section) => (
              <div key={section.id} className="flex h-8 items-center gap-2 border-b border-slate-100 px-2 last:border-b-0">
                <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{section.title}</span>
                <ToggleSwitch enabled={section.enabled} label={`Toggle ${section.title}`} onToggle={() => onToggleSection(section.id)} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Scope summary</h3>
          <div className="overflow-hidden rounded-md border border-slate-200 text-sm">
            <div className="space-y-1.5 px-3 py-2.5">
              {[
                ["Project", scope.project],
                ["Session", scope.session],
                ["Scope", scope.scope],
                ["Asset types", scope.assetTypes],
                ["Test window", scope.testWindow],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[82px_1fr] gap-2">
                  <span className="font-semibold text-slate-700">{label}:</span>
                  <span className="truncate text-slate-700">{value}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="flex h-8 w-full items-center justify-center gap-2 border-t border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View full scope
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Author</span>
            <select
              value={selectedAuthor}
              onChange={(event) => onAuthorChange(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Reviewer</span>
            <select
              value={selectedReviewer}
              onChange={(event) => onReviewerChange(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {reviewers.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id}>
                  {reviewer.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Export formats</h3>
          <div className="flex items-center gap-6">
            <CheckboxControl checked={exportMarkdown} label="Markdown (.md)" onChange={onExportMarkdownChange} />
            <CheckboxControl checked={exportJson} label="JSON (.json)" onChange={onExportJsonChange} />
          </div>
        </div>

        <label className="block">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            Deterministic renderer
            <span className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500">
              i
            </span>
          </span>
          <select className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
            <option>v1.3.0 (deterministic)</option>
            <option>v1.2.4 (legacy)</option>
          </select>
        </label>
      </div>
    </Panel>
  );
}
