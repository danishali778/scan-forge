import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Filter, SlidersHorizontal, SquareTerminal } from "lucide-react";
import { useState } from "react";

import { PolicyPill, ToolStatusPill } from "@/components/runtime-tool-calls/StatusPills";
import type { ToolCall, ToolCallFilter } from "@/types/runtime-tool-calls";

function ToolIcon({ tool }: { tool: string }) {
  if (tool.startsWith("terminal")) {
    return <SquareTerminal className="h-4 w-4 text-slate-600" />;
  }

  if (tool.startsWith("step")) {
    return <CheckCircle2 className="h-4 w-4 text-slate-600" />;
  }

  return <FileText className="h-4 w-4 text-slate-600" />;
}

type ToolCallsTableProps = {
  filters: ToolCallFilter[];
  activeFilter: ToolCallFilter["id"];
  onFilterChange: (filter: ToolCallFilter["id"]) => void;
  toolCalls: ToolCall[];
  selectedToolCallId: string;
  onSelectToolCall: (toolCallId: string) => void;
};

export function ToolCallsTable({
  filters,
  activeFilter,
  onFilterChange,
  toolCalls,
  selectedToolCallId,
  onSelectToolCall,
}: ToolCallsTableProps) {
  const [page, setPage] = useState(1);
  const activeFilterCount = filters.find((filter) => filter.id === activeFilter)?.count ?? toolCalls.length;

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-5">
        <h2 className="text-base font-semibold text-slate-950">Tool calls</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            aria-label="Filter tool calls"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            aria-label="Adjust table columns"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex h-[50px] items-end gap-8 border-b border-slate-200 px-5">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={[
              "relative flex h-full items-center gap-2 text-sm font-semibold transition",
              activeFilter === filter.id ? "text-teal-700" : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
            aria-pressed={activeFilter === filter.id}
            onClick={() => {
              onFilterChange(filter.id);
              setPage(1);
            }}
          >
            {filter.label}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
              {filter.count}
            </span>
            {activeFilter === filter.id ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-600" /> : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
          <thead className="bg-white text-xs font-semibold text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="w-[160px] px-4 py-3">Tool</th>
              <th className="w-[120px] px-4 py-3">Status</th>
              <th className="w-[290px] px-4 py-3">Command / Action</th>
              <th className="w-[76px] px-4 py-3">Step</th>
              <th className="w-[92px] px-4 py-3">Duration</th>
              <th className="w-[140px] px-4 py-3">Policy</th>
              <th className="w-[95px] px-4 py-3">Output</th>
              <th className="w-[125px] px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {toolCalls.map((toolCall) => {
              const isSelected = toolCall.id === selectedToolCallId;

              return (
                <tr
                  key={toolCall.id}
                  className={[
                    "cursor-pointer transition hover:bg-slate-50",
                    isSelected ? "bg-teal-50/70 shadow-[inset_3px_0_0_#0f766e]" : "bg-white",
                  ].join(" ")}
                  onClick={() => onSelectToolCall(toolCall.id)}
                >
                  <td className="px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <ToolIcon tool={toolCall.tool} />
                      <span className="truncate font-medium text-slate-800">{toolCall.tool}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ToolStatusPill status={toolCall.status} />
                  </td>
                  <td className="truncate px-4 py-3 font-mono text-xs text-slate-800">{toolCall.command}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{toolCall.step}</td>
                  <td className="px-4 py-3 text-slate-700">{toolCall.duration}</td>
                  <td className="px-4 py-3">
                    <PolicyPill policy={toolCall.policy} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{toolCall.output}</td>
                  <td className="px-4 py-3 text-slate-700">{toolCall.created}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex h-[58px] items-center justify-between border-t border-slate-100 px-5 text-sm text-slate-600">
        <span>
          1 - {toolCalls.length} of {activeFilterCount}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {[1, 2, 3, 4, 5].map((item) => (
            <button
              key={item}
              type="button"
              className={[
                "grid h-8 w-8 place-items-center rounded-md text-sm font-semibold",
                page === item ? "border border-slate-200 bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ))}
          <span className="px-2 text-slate-400">...</span>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100"
            onClick={() => setPage(13)}
          >
            13
          </button>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
            onClick={() => setPage((current) => Math.min(13, current + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
