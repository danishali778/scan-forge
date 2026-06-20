import { Calendar, ChevronDown, Search, SlidersHorizontal } from "lucide-react";

type SessionsFiltersProps = {
  search: string;
  project: string;
  owner: string;
  projects: string[];
  owners: string[];
  onSearchChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
};

export function SessionsFilters({
  search,
  project,
  owner,
  projects,
  owners,
  onSearchChange,
  onProjectChange,
  onOwnerChange,
}: SessionsFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex h-10 w-[270px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-500 shadow-sm focus-within:border-teal-500">
        <Search className="h-4 w-4 shrink-0" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by title, scope, or id..."
          className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
        />
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
      </label>

      <SelectLike value={project} options={["All projects", ...projects]} onChange={onProjectChange} />
      <SelectLike value={owner} options={["All owners", ...owners]} onChange={onOwnerChange} />

      <button
        type="button"
        className="ml-auto flex h-10 min-w-[220px] items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Jun 1, 2026 - Jun 19, 2026
        <Calendar className="h-4 w-4 text-slate-500" />
      </button>
    </div>
  );
}

function SelectLike({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative h-10 min-w-[220px]">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-9 text-[13px] font-medium text-slate-700 shadow-sm outline-none hover:bg-slate-50 focus:border-teal-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </label>
  );
}
