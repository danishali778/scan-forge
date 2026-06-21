import { ArrowDown } from "lucide-react";

import type { MemoryRecord } from "@/types/memory-library";

import {
  EmbeddingBadge,
  SecretScanBadge,
  SourceLabel,
  StatusBadge,
  VisibilityBadge,
} from "./MemoryBadges";

interface MemoryTableProps {
  memories: MemoryRecord[];
  checkedMemoryIds: string[];
  selectedMemoryId: string | null;
  onSelectMemory: (memoryId: string) => void;
  onToggleMemory: (memoryId: string) => void;
  onToggleAll: () => void;
}

export function MemoryTable({
  memories,
  checkedMemoryIds,
  selectedMemoryId,
  onSelectMemory,
  onToggleMemory,
  onToggleAll,
}: MemoryTableProps) {
  const allVisibleChecked = memories.length > 0 && memories.every((memory) => checkedMemoryIds.includes(memory.id));

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="w-12 px-4 py-4">
              <input
                type="checkbox"
                checked={allVisibleChecked}
                onChange={onToggleAll}
                aria-label="Select all visible memories"
                className="h-4 w-4 rounded border-slate-300 text-teal-700 accent-teal-700"
              />
            </th>
            <th className="w-[250px] px-3 py-4">Title</th>
            <th className="w-[110px] px-3 py-4">Visibility</th>
            <th className="w-[110px] px-3 py-4">Source</th>
            <th className="w-[110px] px-3 py-4">Status</th>
            <th className="w-[120px] px-3 py-4">Secret scan</th>
            <th className="w-[120px] px-3 py-4">Embedding</th>
            <th className="w-[74px] px-3 py-4">Chunks</th>
            <th className="w-[110px] px-3 py-4">Reviewed by</th>
            <th className="w-[96px] px-3 py-4">
              <span className="inline-flex items-center gap-1">
                Updated
                <ArrowDown className="h-3.5 w-3.5" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {memories.map((memory) => {
            const isChecked = checkedMemoryIds.includes(memory.id);
            const isSelected = selectedMemoryId === memory.id;

            return (
              <tr
                key={memory.id}
                onClick={() => onSelectMemory(memory.id)}
                className={`cursor-pointer transition hover:bg-slate-50 ${
                  isSelected ? "bg-red-50/35" : isChecked ? "bg-teal-50/45" : "bg-white"
                }`}
              >
                <td className="px-4 py-3 align-middle">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) => {
                      event.stopPropagation();
                      onToggleMemory(memory.id);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${memory.title}`}
                    className="h-4 w-4 rounded border-slate-300 text-teal-700 accent-teal-700"
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="truncate text-sm font-semibold text-slate-900">{memory.title}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">{memory.subtitle}</div>
                </td>
                <td className="px-3 py-3">
                  <VisibilityBadge visibility={memory.visibility} />
                </td>
                <td className="px-3 py-3">
                  <SourceLabel source={memory.source} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={memory.status} />
                </td>
                <td className="px-3 py-3">
                  <SecretScanBadge status={memory.secretScan} />
                </td>
                <td className="px-3 py-3">
                  <EmbeddingBadge status={memory.embedding} />
                </td>
                <td className="px-3 py-3 text-slate-500">{memory.chunks ?? "-"}</td>
                <td className="truncate px-3 py-3 text-slate-600">{memory.reviewedBy ?? "-"}</td>
                <td className="px-3 py-3 text-slate-700">{memory.updatedAt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {memories.length === 0 ? (
        <div className="grid h-48 place-items-center border-t border-slate-100 text-sm text-slate-500">
          No memories match the current filters.
        </div>
      ) : null}
    </div>
  );
}
