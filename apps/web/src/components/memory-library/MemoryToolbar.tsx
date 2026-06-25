import { Plus, Search } from "lucide-react";

import type { MemoryFilterState } from "@/types/memory-library";

interface MemoryToolbarProps {
  filters: MemoryFilterState;
  projectOptions: string[];
  sessionOptions: string[];
  onFiltersChange: (filters: MemoryFilterState) => void;
  onCreateMemory: () => void;
  isCreating?: boolean;
}

const memoryFilterOptions = {
  visibility: ["All", "Session", "Project", "Workspace"] as const,
  source: ["All", "Agent", "Finding", "Evidence", "Manual", "Report"] as const,
  status: ["Open", "All", "Candidate", "Approved", "Rejected", "Archived", "Blocked"] as const,
};

export function MemoryToolbar({
  filters,
  projectOptions,
  sessionOptions,
  onFiltersChange,
  onCreateMemory,
  isCreating = false,
}: MemoryToolbarProps) {
  return (
    <section className="shrink-0 border-b border-slate-200 bg-white px-8 py-6">
      <div className="flex items-center gap-3">
        <label className="relative block h-12 w-[370px]">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            value={filters.query}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
            className="h-full w-full rounded-md border border-slate-300 bg-white pl-11 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
            placeholder="Search memories..."
          />
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-1">
            <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
              Ctrl
            </span>
            <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
              K
            </span>
          </span>
        </label>

        <FilterSelect
          label="Visibility"
          value={filters.visibility}
          options={memoryFilterOptions.visibility}
          onChange={(value) => onFiltersChange({ ...filters, visibility: value as MemoryFilterState["visibility"] })}
          className="w-[190px]"
        />
        <FilterSelect
          label="Source type"
          value={filters.source}
          options={memoryFilterOptions.source}
          onChange={(value) => onFiltersChange({ ...filters, source: value as MemoryFilterState["source"] })}
          className="w-[190px]"
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          options={memoryFilterOptions.status}
          onChange={(value) => onFiltersChange({ ...filters, status: value as MemoryFilterState["status"] })}
          className="w-[224px]"
        />
        <FilterSelect
          label="Project"
          value={filters.project}
          options={projectOptions}
          onChange={(value) => onFiltersChange({ ...filters, project: value })}
          className="w-[210px]"
        />
        <FilterSelect
          label="Session"
          value={filters.session}
          options={sessionOptions}
          onChange={(value) => onFiltersChange({ ...filters, session: value })}
          className="w-[210px]"
        />

        <button
          type="button"
          onClick={onCreateMemory}
          disabled={isCreating}
          className="ml-auto inline-flex h-12 items-center gap-2 rounded-md bg-teal-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus className="h-5 w-5" />
          {isCreating ? "Creating..." : "New memory"}
        </button>
      </div>
    </section>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  className?: string;
}

function FilterSelect({ label, value, options, onChange, className = "" }: FilterSelectProps) {
  return (
    <label className={`block h-12 rounded-md border border-slate-300 bg-white px-3 py-1.5 ${className}`}>
      <span className="block text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
