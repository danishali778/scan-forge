import { Download, Info, Search, X } from "lucide-react";

import type { MemorySearchResult, MemorySearchVisibility } from "@/types/memory-library";

import { SourceLabel, VisibilityBadge } from "./MemoryBadges";

interface MemorySearchPanelProps {
  query: string;
  visibility: MemorySearchVisibility;
  limit: number;
  results: MemorySearchResult[];
  onQueryChange: (query: string) => void;
  onVisibilityChange: (visibility: MemorySearchVisibility) => void;
  onLimitChange: (limit: number) => void;
}

export function MemorySearchPanel({
  query,
  visibility,
  limit,
  results,
  onQueryChange,
  onVisibilityChange,
  onLimitChange,
}: MemorySearchPanelProps) {
  return (
    <section className="h-[316px] shrink-0 border-t border-slate-200 bg-white">
      <div className="flex h-[94px] items-center gap-4 px-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-950">
            Memory search (approved only)
            <Info className="h-4 w-4 text-slate-400" />
          </div>
          <label className="relative block h-10">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="h-full w-full rounded-md border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
              placeholder="Search approved memories..."
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
        </div>

        <label className="mt-7 block h-10 w-[126px] rounded-md border border-slate-300 bg-white px-3 py-1">
          <span className="sr-only">Visibility</span>
          <select
            value={visibility}
            onChange={(event) => onVisibilityChange(event.target.value as MemorySearchVisibility)}
            className="h-full w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            <option value="All">Visibility: All</option>
            <option value="Workspace">Workspace</option>
            <option value="Project">Project</option>
            <option value="Session">Session</option>
          </select>
        </label>
        <label className="mt-7 block h-10 w-[96px] rounded-md border border-slate-300 bg-white px-3 py-1">
          <span className="sr-only">Limit</span>
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="h-full w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            {[3, 5, 10].map((value) => (
              <option key={value} value={value}>
                Limit: {value}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="mt-7 h-10 rounded-md bg-teal-700 px-7 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          Search
        </button>

        <div className="ml-auto mt-7 flex items-center gap-4">
          <span className="text-sm text-slate-500">{results.length} results</span>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="w-[92px] px-5 py-3">Score</th>
              <th className="w-[420px] px-3 py-3">Chunk preview</th>
              <th className="w-[280px] px-3 py-3">From</th>
              <th className="w-[120px] px-3 py-3">Source</th>
              <th className="w-[132px] px-3 py-3">Visibility</th>
              <th className="w-[170px] px-3 py-3">Scope</th>
              <th className="px-3 py-3">Agents will receive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {results.map((result) => (
              <tr key={result.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {result.score.toFixed(2)}
                  </span>
                </td>
                <td className="truncate px-3 py-3 text-slate-600">{result.chunkPreview}</td>
                <td className="px-3 py-3">
                  <button type="button" className="block truncate text-sm font-semibold text-teal-700 underline-offset-2 hover:underline">
                    {result.fromTitle}
                  </button>
                  <span className="text-xs text-slate-500">Doc: {result.fromDoc}</span>
                </td>
                <td className="px-3 py-3">
                  <SourceLabel source={result.source} />
                </td>
                <td className="px-3 py-3">
                  <VisibilityBadge visibility={result.visibility} />
                </td>
                <td className="truncate px-3 py-3 text-slate-600">{result.scope}</td>
                <td className="px-3 py-3">
                  <span className="mr-6 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {result.agentsReceive}
                  </span>
                  <span className="text-slate-500">{result.relevance}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-5 py-2 text-xs text-slate-500">
        Results include approved memories only. Use filters to narrow scope.
      </div>
    </section>
  );
}
