import { CalendarDays, ChevronDown, RefreshCw } from "lucide-react";

import type { ApprovalRisk, ApprovalStatus } from "@/types/approval-queue";

type FilterValue<T extends string> = T | "all";

type FilterOption<T extends string> = {
  value: FilterValue<T>;
  label: string;
};

type ApprovalFiltersProps = {
  status: FilterValue<ApprovalStatus>;
  risk: FilterValue<ApprovalRisk>;
  project: string;
  requester: string;
  projects: string[];
  requesters: string[];
  dateRange: string;
  refreshLabel: string;
  onStatusChange: (value: FilterValue<ApprovalStatus>) => void;
  onRiskChange: (value: FilterValue<ApprovalRisk>) => void;
  onProjectChange: (value: string) => void;
  onRequesterChange: (value: string) => void;
  onRefresh: () => void;
};

const statusOptions: FilterOption<ApprovalStatus>[] = [
  { value: "all", label: "Pending, Approved..." },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "expired", label: "Expired" },
];

const riskOptions: FilterOption<ApprovalRisk>[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function ApprovalFilters({
  status,
  risk,
  project,
  requester,
  projects,
  requesters,
  dateRange,
  refreshLabel,
  onStatusChange,
  onRiskChange,
  onProjectChange,
  onRequesterChange,
  onRefresh,
}: ApprovalFiltersProps) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <SelectBox label="Status" value={status} options={statusOptions} onChange={(value) => onStatusChange(value as FilterValue<ApprovalStatus>)} />
      <SelectBox label="Risk" value={risk} options={riskOptions} onChange={(value) => onRiskChange(value as FilterValue<ApprovalRisk>)} />
      <SelectBox
        label="Project"
        value={project}
        options={[{ value: "all", label: "All projects" }, ...projects.map((item) => ({ value: item, label: item }))]}
        onChange={onProjectChange}
      />
      <SelectBox
        label="Requested by"
        value={requester}
        options={[{ value: "all", label: "All users" }, ...requesters.map((item) => ({ value: item, label: item }))]}
        onChange={onRequesterChange}
      />

      <button
        type="button"
        className="flex h-[62px] min-w-[228px] items-center justify-between rounded-md border border-slate-300 bg-white px-4 text-left shadow-sm hover:bg-slate-50"
      >
        <span>
          <span className="block text-[11px] font-semibold text-slate-600">Date range</span>
          <span className="mt-1 flex items-center gap-2 text-[13px] font-medium text-slate-800">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            {dateRange}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
          {refreshLabel}
        </button>
        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-600">
          Auto-refresh: On
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
      </div>
    </div>
  );
}

function SelectBox({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative h-[62px] min-w-[154px] rounded-md border border-slate-300 bg-white px-4 py-2 shadow-sm focus-within:border-teal-500">
      <span className="block text-[11px] font-semibold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-7 w-full appearance-none bg-transparent pr-7 text-[13px] font-medium text-slate-800 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 text-slate-500" />
    </label>
  );
}
