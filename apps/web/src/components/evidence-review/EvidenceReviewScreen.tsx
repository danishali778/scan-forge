import {
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Database,
  ExternalLink,
  FilePlus2,
  FileText,
  FileUp,
  Flag,
  MoreVertical,
  PanelRightOpen,
  Plus,
  SquareTerminal,
  Star,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import type {
  CandidateFinding,
  Confidence,
  EvidenceFiltersState,
  EvidenceItem,
  EvidenceMetric,
  EvidenceSelectOption,
  EvidenceStatus,
  EvidenceTone,
  EvidenceType,
  FindingStatus,
  FindingReviewRequest,
  FindingUpdateRequest,
  Severity,
} from "@/types/evidence-review";

const statusClasses: Record<EvidenceStatus, string> = {
  reviewed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  candidate: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-green-50 text-green-700 ring-green-200",
};

const iconToneClasses: Record<EvidenceTone, string> = {
  teal: "bg-teal-50 text-teal-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-600",
};

const helperToneClasses: Record<EvidenceTone, string> = {
  teal: "text-teal-700",
  blue: "text-slate-500",
  green: "text-slate-500",
  amber: "text-slate-500",
  red: "text-red-600",
  slate: "text-slate-500",
};

const evidenceTypeClasses: Record<EvidenceType, string> = {
  terminal: "border-teal-200 bg-teal-50 text-teal-700",
  file: "border-blue-200 bg-blue-50 text-blue-700",
  database: "border-cyan-200 bg-cyan-50 text-cyan-700",
  note: "border-purple-200 bg-purple-50 text-purple-700",
};
const emptyEvidenceFilters: EvidenceFiltersState = {
  session: "",
  evidenceType: "all",
  status: "all",
  severity: "all",
  reviewer: "all",
  dateRange: "all",
};
const evidenceTypeOptions: EvidenceSelectOption[] = [
  { label: "All types", value: "all" },
  { label: "Terminal", value: "terminal" },
  { label: "File", value: "file" },
  { label: "Database", value: "database" },
  { label: "Note", value: "note" },
];
const statusOptions: EvidenceSelectOption[] = [
  { label: "All statuses", value: "all" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Candidate", value: "candidate" },
  { label: "Confirmed", value: "confirmed" },
];
const severityOptions: EvidenceSelectOption[] = [
  { label: "All severities", value: "all" },
  { label: "Critical", value: "Critical" },
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" },
];
const dateRangeOptions: EvidenceSelectOption[] = [
  { label: "All returned evidence", value: "all" },
];
const reviewableStatusLabels: FindingStatus[] = ["Confirmed", "False positive", "Accepted risk", "Fixed", "Archived"];

function buildEvidenceMetrics(items: EvidenceItem[], findings: CandidateFinding[]): EvidenceMetric[] {
  const linkedEvidenceCount = items.filter((item) => item.linkedFinding).length;
  const confirmedFindingCount = findings.filter((finding) => finding.status === "Confirmed").length;
  const candidateFindingCount = findings.filter((finding) => finding.status === "Needs review" || finding.status === "Ready for review").length;
  const assetCount = items.filter((item) => item.fileAsset && item.fileAsset !== "Inline content").length;

  return [
    {
      label: "Evidence items",
      value: String(items.length),
      helper: "Returned by backend",
      tone: "blue",
      icon: FileText,
    },
    {
      label: "Linked findings",
      value: String(linkedEvidenceCount),
      helper: `${findings.length} findings`,
      tone: "teal",
      icon: Flag,
    },
    {
      label: "Confirmed findings",
      value: String(confirmedFindingCount),
      helper: "Reviewed backend findings",
      tone: "green",
      icon: Check,
    },
    {
      label: "Candidate findings",
      value: String(candidateFindingCount),
      helper: "Awaiting review",
      tone: "amber",
      icon: ClipboardList,
    },
    {
      label: "File assets",
      value: String(assetCount),
      helper: "Stored artifacts",
      tone: "slate",
      icon: Database,
    },
  ];
}

function backendFindingStatus(status: FindingStatus): string {
  if (status === "Confirmed") return "confirmed";
  if (status === "False positive") return "false_positive";
  if (status === "Accepted risk") return "accepted_risk";
  if (status === "Fixed") return "fixed";
  if (status === "Archived") return "archived";
  if (status === "Needs review") return "needs_review";
  return "candidate";
}

function backendReviewStatus(status: FindingStatus): string | null {
  return reviewableStatusLabels.includes(status) ? backendFindingStatus(status) : null;
}

function backendSeverity(value: Severity): string {
  return value.toLowerCase();
}

function backendConfidence(value: Confidence): string {
  return value.toLowerCase();
}

function humanizeStatus(status: EvidenceStatus) {
  return status === "reviewed" ? "Reviewed" : status === "candidate" ? "Candidate" : "Confirmed";
}

function StatusBadge({ status }: { status: EvidenceStatus }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ring-1 ring-inset ${statusClasses[status]}`}>
      {humanizeStatus(status)}
    </span>
  );
}

function Header({ sessionLabel }: { sessionLabel: string }) {
  return (
    <header className="relative flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex items-center gap-4 text-[20px] font-semibold tracking-tight">
          <span className="text-slate-950">Evidence</span>
          <span className="font-normal text-slate-300">/</span>
          <span className="truncate text-slate-950">{sessionLabel || "No session selected"}</span>
        </div>
        <button type="button" aria-label="Favorite session" className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
          <Star className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" disabled title="Finding creation is handled from evidence detail workflows later." className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-md border border-teal-600/40 bg-white px-4 text-sm font-semibold text-teal-700 opacity-60 shadow-sm">
          <FilePlus2 className="h-4 w-4" />
          Create finding
        </button>
        <button type="button" disabled title="Manual evidence attachment is not wired in this screen yet." className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 opacity-60 shadow-sm">
          <FileUp className="h-4 w-4" />
          Attach evidence
        </button>
        <button type="button" disabled title="Use the finding inspector to review linked findings." className="h-10 cursor-not-allowed rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 opacity-60 shadow-sm">
          Mark reviewed
        </button>
        <button type="button" disabled title="Report export lives on the Reports page." className="inline-flex h-10 cursor-not-allowed items-center gap-3 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white opacity-60 shadow-sm">
          Export report
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  leadingIcon,
  canClear = false,
  clearValue = "",
}: {
  label: string;
  value: string;
  options: EvidenceSelectOption[];
  onChange: (value: string) => void;
  leadingIcon?: ReactNode;
  canClear?: boolean;
  clearValue?: string;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="absolute left-4 top-2 text-[11px] font-medium text-slate-500">{label}</span>
      {leadingIcon ? <span className="absolute bottom-3 left-4 text-slate-500">{leadingIcon}</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-[58px] w-full appearance-none rounded-md border border-slate-200 bg-white pb-2 pt-6 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${
          leadingIcon ? "pl-10 pr-9" : "pl-4 pr-9"
        } ${canClear ? "pr-16" : ""}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute bottom-3.5 right-4 h-4 w-4 text-slate-600" />
      {canClear ? (
        <button type="button" aria-label={`Clear ${label}`} className="absolute bottom-3.5 right-10 grid h-4 w-4 place-items-center rounded text-slate-500 hover:bg-slate-100" onClick={() => onChange(clearValue)}>
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </label>
  );
}

function Filters({
  filters,
  onChange,
  sessionOptions,
  reviewerOptions,
  defaultFilters,
}: {
  filters: EvidenceFiltersState;
  onChange: (filters: EvidenceFiltersState) => void;
  sessionOptions: EvidenceSelectOption[];
  reviewerOptions: EvidenceSelectOption[];
  defaultFilters: EvidenceFiltersState;
}) {
  const update = (key: keyof EvidenceFiltersState, value: string) => onChange({ ...filters, [key]: value });
  const resolvedSessionOptions = sessionOptions.length > 0 ? sessionOptions : [{ label: "No backend sessions", value: "" }];

  return (
    <section className="flex items-center gap-4">
      <div className="w-[250px]">
        <FilterSelect label="Session" value={filters.session} options={resolvedSessionOptions} canClear onChange={(value) => update("session", value)} />
      </div>
      <div className="w-[170px]">
        <FilterSelect label="Evidence type" value={filters.evidenceType} options={evidenceTypeOptions} onChange={(value) => update("evidenceType", value)} />
      </div>
      <div className="w-[170px]">
        <FilterSelect label="Status" value={filters.status} options={statusOptions} onChange={(value) => update("status", value)} />
      </div>
      <div className="w-[178px]">
        <FilterSelect label="Severity" value={filters.severity} options={severityOptions} onChange={(value) => update("severity", value)} />
      </div>
      <div className="w-[190px]">
        <FilterSelect label="Reviewer" value={filters.reviewer} options={reviewerOptions} onChange={(value) => update("reviewer", value)} />
      </div>
      <div className="w-[220px]">
        <FilterSelect label="Date range" value={filters.dateRange} options={dateRangeOptions} leadingIcon={<CalendarDays className="h-4 w-4" />} onChange={(value) => update("dateRange", value)} />
      </div>
      <button type="button" className="ml-auto h-10 px-2 text-sm font-semibold text-teal-700 hover:text-teal-800" onClick={() => onChange(defaultFilters)}>
        Reset
      </button>
    </section>
  );
}

function Metrics({ metrics }: { metrics: EvidenceMetric[] }) {
  return (
    <section className="grid grid-cols-5 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article key={metric.label} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-950">{metric.label}</div>
                <div className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-slate-950">{metric.value}</div>
                <div className={`mt-2 text-xs font-medium ${helperToneClasses[metric.tone]}`}>{metric.helper}</div>
              </div>
              {metric.progress ? (
                <div className="grid h-11 w-11 place-items-center rounded-full" style={{ background: `conic-gradient(#0f766e ${metric.progress * 3.6}deg, #e5e7eb 0deg)` }}>
                  <div className="h-7 w-7 rounded-full bg-white" />
                </div>
              ) : (
                <div className={`grid h-11 w-11 place-items-center rounded-md ${iconToneClasses[metric.tone]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function EvidenceTypeIcon({ type }: { type: EvidenceType }) {
  const icons = { terminal: SquareTerminal, file: FileText, database: Database, note: ClipboardList };
  const Icon = icons[type];
  return (
    <span className={`grid h-5 w-5 place-items-center rounded-sm border ${evidenceTypeClasses[type]}`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function Author({ author }: { author: EvidenceItem["createdBy"] }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white ${author.tone === "amber" ? "bg-[#a56d46]" : author.tone === "slate" ? "bg-[#9a6b4d]" : "bg-teal-700"}`}>
        {author.initials}
      </span>
      <span className="truncate text-slate-700">{author.name}</span>
    </div>
  );
}

function EvidenceTable({ items, selectedId, onSelect }: { items: EvidenceItem[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="w-12 px-4 py-3"><span className="block h-4 w-4 rounded border border-slate-300 bg-white" /></th>
            <th className="w-[260px] px-3 py-3">Title</th>
            <th className="w-[180px] px-3 py-3">Source step</th>
            <th className="w-[125px] px-3 py-3">Linked finding</th>
            <th className="w-[120px] px-3 py-3">Status</th>
            <th className="w-[78px] px-3 py-3">Size</th>
            <th className="w-[140px] px-3 py-3">Created by</th>
            <th className="w-[130px] px-3 py-3"><span className="inline-flex items-center gap-1">Created at<ArrowUp className="h-3.5 w-3.5" /></span></th>
            <th className="w-11 px-2 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const selected = item.id === selectedId;
            return (
              <tr key={item.id} className={`cursor-pointer transition hover:bg-slate-50 ${selected ? "bg-teal-50/70" : "bg-white"}`} onClick={() => onSelect(item.id)}>
                <td className="px-4 py-3 align-middle">
                  <span className={`grid h-4 w-4 place-items-center rounded border ${selected ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white text-transparent"}`}><Check className="h-3 w-3" /></span>
                </td>
                <td className="px-3 py-3 align-middle"><div className="flex items-center gap-3"><EvidenceTypeIcon type={item.type} /><span className="min-w-0 whitespace-normal font-medium leading-5 text-slate-900">{item.title}</span></div></td>
                <td className="whitespace-normal px-3 py-3 align-middle leading-5 text-slate-700">{item.sourceStep}</td>
                <td className="px-3 py-3 align-middle">{item.linkedFinding ? <button type="button" className="font-semibold text-blue-600 hover:text-blue-700">{item.linkedFinding}</button> : <span className="text-slate-400">-</span>}</td>
                <td className="px-3 py-3 align-middle"><StatusBadge status={item.status} /></td>
                <td className="px-3 py-3 align-middle text-slate-700">{item.size ?? "-"}</td>
                <td className="px-3 py-3 align-middle"><Author author={item.createdBy} /></td>
                <td className="whitespace-pre-line px-3 py-3 align-middle leading-5 text-slate-700">{item.createdAtShort}</td>
                <td className="px-2 py-3 align-middle"><button type="button" aria-label={`Open actions for ${item.title}`} className="grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100" onClick={(event) => event.stopPropagation()}><MoreVertical className="h-5 w-5" /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex h-12 items-center justify-between border-t border-slate-200 px-4 text-sm text-slate-600">
        <span><span className="font-semibold text-slate-700">{items.length}</span> evidence items returned</span>
        <span className="text-xs font-medium text-slate-500">Backend result set</span>
      </div>
    </section>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700" onClick={() => { void navigator.clipboard?.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }}>
      {copied ? <span className="text-[10px] font-bold text-teal-700">OK</span> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function DetailRow({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)_28px] items-center gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 truncate font-medium text-slate-700">{value}</span>
      {copyable ? <CopyButton value={value} /> : <span />}
    </div>
  );
}

function EvidenceDetail({ evidence }: { evidence: EvidenceItem }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = ["Overview", "Raw output", "Metadata", "Linked items", "Audit trail"];
  return (
    <section className="min-h-[405px] rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <span className="grid h-6 w-6 place-items-center rounded-sm border border-teal-200 bg-teal-50 text-teal-700"><SquareTerminal className="h-4 w-4" /></span>
        <h2 className="text-lg font-semibold text-slate-950">{evidence.title}</h2>
        <StatusBadge status={evidence.status} />
      </div>
      <div className="flex h-12 items-end gap-8 border-b border-slate-200 px-5">
        {tabs.map((tab) => (
          <button key={tab} type="button" className={`relative h-full text-sm font-semibold ${activeTab === tab ? "text-teal-700" : "text-slate-600 hover:text-slate-900"}`} onClick={() => setActiveTab(tab)}>
            {tab}
            {activeTab === tab ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-600" /> : null}
          </button>
        ))}
      </div>
      <div className="p-5">
        {activeTab === "Overview" ? (
          <div className="grid grid-cols-[minmax(0,1fr)_470px] gap-5">
            <div className="space-y-4">
              <div><h4 className="text-sm font-semibold text-slate-900">Summary</h4><p className="mt-2 text-sm leading-6 text-slate-700">{evidence.summary}</p></div>
              {evidence.command ? <div><h4 className="text-sm font-semibold text-slate-900">Command</h4><div className="mt-2 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"><code className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-700">{evidence.command}</code><CopyButton value={evidence.command} /></div></div> : null}
              <div><h4 className="text-sm font-semibold text-slate-900">Output (truncated)</h4><div className="mt-2 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"><pre className="min-w-0 flex-1 overflow-hidden whitespace-pre-wrap font-mono text-xs leading-5 text-slate-700">{evidence.output.join("\n")}</pre><CopyButton value={evidence.output.join("\n")} /></div></div>
            </div>
            <div className="border-l border-slate-200 pl-5">
              <div className="space-y-3">
                <DetailRow label="Evidence ID" value={evidence.evidenceId} copyable />
                <DetailRow label="Type" value={evidence.type} />
                <DetailRow label="Status" value={evidence.status} />
                <DetailRow label="Created by" value={evidence.createdBy.name} />
                <DetailRow label="Created at" value={evidence.createdAt} />
                <DetailRow label="Tool call" value={evidence.toolCall} copyable />
                <DetailRow label="Step" value={evidence.step} />
                <DetailRow label="Session" value={evidence.session} />
                <DetailRow label="Size" value={evidence.size ?? "-"} />
              </div>
              <div className="mt-5 border-t border-slate-200 pt-4"><h4 className="text-sm font-semibold text-slate-900">File asset</h4><div className="mt-3 flex items-center gap-3 text-sm"><FileText className="h-4 w-4 text-blue-600" /><button type="button" className="min-w-0 truncate font-semibold text-blue-600 hover:text-blue-700">{evidence.fileAsset}</button><span className="text-slate-500">{evidence.size ?? "-"}</span><ExternalLink className="ml-auto h-4 w-4 text-slate-500" /></div></div>
              <div className="mt-5"><h4 className="text-sm font-semibold text-slate-900">SHA256</h4><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">{evidence.sha256}</code><CopyButton value={evidence.sha256} /></div></div>
            </div>
          </div>
        ) : null}
        {activeTab === "Raw output" ? <div className="rounded-md border border-slate-200 bg-slate-950 p-4"><pre className="min-h-[210px] whitespace-pre-wrap font-mono text-xs leading-6 text-slate-100">{evidence.output.join("\n")}</pre></div> : null}
        {activeTab === "Metadata" ? <div className="grid grid-cols-2 gap-x-8 gap-y-3"><DetailRow label="Evidence ID" value={evidence.evidenceId} copyable /><DetailRow label="Tool call" value={evidence.toolCall} copyable /><DetailRow label="Step" value={evidence.step} /><DetailRow label="Session" value={evidence.session} /><DetailRow label="Created by" value={evidence.createdBy.name} /><DetailRow label="Created at" value={evidence.createdAt} /><DetailRow label="File asset" value={evidence.fileAsset} /><DetailRow label="SHA256" value={evidence.sha256} copyable /></div> : null}
        {activeTab === "Linked items" ? <div className="rounded-md border border-slate-200"><div className="grid grid-cols-[130px_1fr_140px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500"><span>Type</span><span>Item</span><span>Status</span></div><div className="grid grid-cols-[130px_1fr_140px] px-4 py-4 text-sm"><span className="text-slate-500">Finding</span><span className="font-semibold text-blue-600">{evidence.linkedFinding ?? "No finding linked"}</span><span>{evidence.linkedFinding ? <StatusBadge status={evidence.status} /> : "-"}</span></div></div> : null}
        {activeTab === "Audit trail" ? <div className="overflow-hidden rounded-md border border-slate-200">{evidence.auditTrail.map((entry, index) => <div key={`${entry.time}-${entry.action}`} className={`grid grid-cols-[95px_150px_1fr] px-4 py-3 text-sm ${index > 0 ? "border-t border-slate-100" : ""}`}><span className="font-mono text-xs text-slate-500">{entry.time}</span><span className="font-medium text-slate-700">{entry.actor}</span><span className="text-slate-700">{entry.action}</span></div>)}</div> : null}
      </div>
    </section>
  );
}

function InspectorSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold text-slate-600">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber-500" />
        <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as T)} className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white pl-7 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500">
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </span>
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-[84px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-5 text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" /></label>;
}

function Inspector({
  finding,
  onClose,
  onSaveFinding,
  isSaving = false,
}: {
  finding: CandidateFinding;
  onClose: () => void;
  onSaveFinding: (findingId: string, update: FindingUpdateRequest, review?: FindingReviewRequest) => void;
  isSaving?: boolean;
}) {
  const [severity, setSeverity] = useState<Severity>(finding.severity);
  const [confidence, setConfidence] = useState<Confidence>(finding.confidence);
  const [status, setStatus] = useState<FindingStatus>(finding.status);
  const [description, setDescription] = useState(finding.description);
  const [impact, setImpact] = useState(finding.impact);
  const [remediation, setRemediation] = useState(finding.remediation);
  const links = finding.evidenceLinks;

  useEffect(() => {
    setSeverity(finding.severity);
    setConfidence(finding.confidence);
    setStatus(finding.status);
    setDescription(finding.description);
    setImpact(finding.impact);
    setRemediation(finding.remediation);
  }, [finding]);

  const saveFinding = () => {
    const reviewStatus = backendReviewStatus(status);
    onSaveFinding(
      finding.id,
      {
        severity: backendSeverity(severity),
        confidence: backendConfidence(confidence),
        description,
        impact,
        remediation,
        status: backendFindingStatus(status),
      },
      reviewStatus
        ? {
            status: reviewStatus,
            review_note: `Reviewed from Evidence page. Status: ${status}.`,
          }
        : undefined,
    );
  };

  return (
    <aside className="flex w-[clamp(320px,28vw,390px)] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex h-[58px] items-center justify-between border-b border-slate-200 px-4">
        <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">Candidate Finding<ChevronDown className="h-4 w-4 text-slate-500" /></button>
        <div className="flex items-center gap-1"><button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-50"><MoreVertical className="h-5 w-5" /></button><button type="button" aria-label="Close finding inspector" className="grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-50" onClick={onClose}><X className="h-5 w-5" /></button></div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="flex gap-3">
          <div className="grid h-12 min-w-12 place-items-center rounded-md border border-amber-300 bg-amber-50 text-sm font-bold text-amber-700">{finding.id}</div>
          <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold leading-5 text-slate-950">{finding.title}</h2><div className="mt-3 flex items-center gap-3 text-xs text-slate-500"><span>Created by {finding.createdBy}</span><span>{finding.createdAt}</span></div></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <InspectorSelect label="Severity" value={severity} options={["Low", "Medium", "High", "Critical"]} onChange={setSeverity} />
          <InspectorSelect label="Confidence" value={confidence} options={["Low", "Medium", "High"]} onChange={setConfidence} />
          <InspectorSelect label="Status" value={status} options={["Needs review", "Ready for review", ...reviewableStatusLabels]} onChange={setStatus} />
        </div>
        <div className="flex items-center gap-2"><span className="inline-flex h-6 items-center rounded-md bg-amber-50 px-2 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">{severity}</span><span className="inline-flex h-6 items-center rounded-md bg-amber-50 px-2 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">{status}</span></div>
        <TextAreaField label="Description" value={description} onChange={setDescription} />
        <TextAreaField label="Impact" value={impact} onChange={setImpact} />
        <TextAreaField label="Remediation" value={remediation} onChange={setRemediation} />
        <div>
          <h3 className="mb-2 text-xs font-semibold text-slate-600">Evidence links ({links.length})</h3>
          <div className="space-y-2">
            {links.map((link) => <div key={link.id} className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2"><span className="grid h-5 w-5 place-items-center rounded-sm border border-teal-200 bg-teal-50 text-teal-700"><SquareTerminal className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1 truncate text-sm text-slate-700">{link.title}</span><button type="button" disabled title="Evidence detach is not wired in this screen yet." aria-label={`Remove ${link.title}`} className="grid h-6 w-6 cursor-not-allowed place-items-center rounded text-slate-300"><X className="h-4 w-4" /></button></div>)}
            {links.length === 0 ? <div className="rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">No evidence linked.</div> : null}
          </div>
          <button type="button" disabled title="Evidence attachment is not wired in this screen yet." className="mt-3 inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-500 opacity-70"><Plus className="h-4 w-4" />Add evidence</button>
        </div>
        <div className="space-y-4 border-t border-slate-200 pt-4">
          <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Report inclusion</span><span className="relative block"><select disabled value={finding.reportInclusion} className="h-10 w-full cursor-not-allowed appearance-none rounded-md border border-slate-300 bg-slate-50 px-3 pr-8 text-sm text-slate-500 outline-none"><option>Include in report</option><option>Keep internal only</option><option>Exclude from report</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /></span></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Reviewer</span><span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-slate-400 text-[9px] font-bold text-white">{finding.reviewer.initials}</span><input readOnly value={finding.reviewer.name} className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm text-slate-500 outline-none" /></span></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Reviewed at</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input readOnly value={finding.reviewedAt ?? ""} placeholder="Not reviewed" className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm text-slate-500 outline-none placeholder:text-slate-400" /></span></label>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 p-4"><button type="button" disabled={isSaving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60" onClick={saveFinding}><Flag className="h-4 w-4" />{isSaving ? "Saving..." : "Save finding review"}</button></div>
    </aside>
  );
}

function filterEvidence(filters: EvidenceFiltersState, items: EvidenceItem[], findings: CandidateFinding[]) {
  return items.filter((item) => {
    const linkedFinding = findings.find((finding) => finding.id === item.linkedFinding);
    return (
      (!filters.session || filters.session === item.session) &&
      (filters.evidenceType === "all" || filters.evidenceType === item.type) &&
      (filters.status === "all" || filters.status === item.status) &&
      (filters.reviewer === "all" || filters.reviewer === item.createdBy.name) &&
      (filters.severity === "all" || linkedFinding?.severity === filters.severity)
    );
  });
}

interface EvidenceReviewScreenProps {
  evidenceItems: EvidenceItem[];
  candidateFindings: CandidateFinding[];
  sessionOptions: EvidenceSelectOption[];
  selectedSessionId: string;
  onSessionChange: (sessionId: string) => void;
  onSaveFinding: (findingId: string, update: FindingUpdateRequest, review?: FindingReviewRequest) => void;
  isSavingFinding?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export function EvidenceReviewScreen({
  evidenceItems,
  candidateFindings,
  sessionOptions,
  selectedSessionId,
  onSessionChange,
  onSaveFinding,
  isSavingFinding = false,
  isLoading = false,
  errorMessage = null,
}: EvidenceReviewScreenProps) {
  const defaultFilters = useMemo(() => ({ ...emptyEvidenceFilters, session: selectedSessionId }), [selectedSessionId]);
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const filteredItems = useMemo(() => filterEvidence(filters, evidenceItems, candidateFindings), [candidateFindings, evidenceItems, filters]);

  useEffect(() => {
    setFilters(defaultFilters);
  }, [defaultFilters]);

  useEffect(() => {
    if (!filteredItems.some((item) => item.id === selectedEvidenceId)) {
      setSelectedEvidenceId(filteredItems[0]?.id ?? "");
    }
  }, [filteredItems, selectedEvidenceId]);

  const selectedEvidence = filteredItems.find((item) => item.id === selectedEvidenceId) ?? null;
  const selectedFinding =
    (selectedEvidence?.linkedFinding
      ? candidateFindings.find((finding) => finding.id === selectedEvidence.linkedFinding)
      : undefined) ??
    candidateFindings[0] ??
    null;
  const reviewerOptions = useMemo(() => {
    const reviewers = Array.from(new Set(evidenceItems.map((item) => item.createdBy.name).filter(Boolean)));
    return [{ label: "All reviewers", value: "all" }, ...reviewers.map((name) => ({ label: name, value: name }))];
  }, [evidenceItems]);
  const metrics = useMemo(() => buildEvidenceMetrics(evidenceItems, candidateFindings), [candidateFindings, evidenceItems]);
  const sessionLabel = sessionOptions.find((option) => option.value === selectedSessionId)?.label ?? "No session selected";

  const handleFilterChange = (nextFilters: EvidenceFiltersState) => {
    setFilters(nextFilters);
    if (nextFilters.session !== selectedSessionId) {
      onSessionChange(nextFilters.session);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f6f8fa] text-slate-900">
      <div className="flex h-full min-w-0">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Header sessionLabel={sessionLabel} />
          <div className="flex min-h-0 flex-1">
            <section className="min-w-0 flex-1 overflow-auto bg-[#f7f9fb] p-6">
              <div className="min-w-[1040px] space-y-5">
                {errorMessage ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    {errorMessage}
                  </div>
                ) : null}
                {isLoading ? (
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                    Loading evidence and findings...
                  </div>
                ) : null}
                <Filters
                  filters={filters}
                  onChange={handleFilterChange}
                  sessionOptions={sessionOptions}
                  reviewerOptions={reviewerOptions}
                  defaultFilters={defaultFilters}
                />
                <Metrics metrics={metrics} />
                {filteredItems.length > 0 && selectedEvidence ? (
                  <>
                    <EvidenceTable items={filteredItems} selectedId={selectedEvidence.id} onSelect={setSelectedEvidenceId} />
                    <EvidenceDetail evidence={selectedEvidence} />
                  </>
                ) : (
                  <div className="grid min-h-[520px] place-items-center rounded-md border border-dashed border-slate-300 bg-white text-center">
                    <div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500"><Target className="h-6 w-6" /></div><h2 className="mt-4 text-base font-semibold text-slate-950">No evidence matches these filters</h2><p className="mt-1 text-sm text-slate-500">Reset filters to return to the review queue.</p></div>
                  </div>
                )}
              </div>
            </section>
            {inspectorOpen && selectedFinding ? (
              <Inspector finding={selectedFinding} onClose={() => setInspectorOpen(false)} onSaveFinding={onSaveFinding} isSaving={isSavingFinding} />
            ) : (
              <aside className="flex w-[64px] shrink-0 flex-col items-center border-l border-slate-200 bg-white py-4"><button type="button" aria-label="Open finding inspector" className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-teal-700 hover:bg-teal-50" onClick={() => setInspectorOpen(true)}><PanelRightOpen className="h-5 w-5" /></button></aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
