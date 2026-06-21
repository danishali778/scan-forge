import { ChevronDown, ChevronRight, ExternalLink, FileText, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";

import type { FileNode, RecentFileWrite } from "@/types/runtime-tool-calls";

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const isFolder = node.kind === "folder";
  const Icon = isFolder ? (node.expanded ? FolderOpen : Folder) : FileText;

  return (
    <div>
      <button
        type="button"
        className="flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {isFolder ? (
          node.expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
        ) : (
          <span className="w-3.5" />
        )}
        <Icon className={isFolder ? "h-4 w-4 text-slate-500" : "h-4 w-4 text-slate-400"} />
        <span className="truncate">{node.name}</span>
      </button>
      {node.expanded && node.children?.length ? (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecentWritesList({ writes }: { writes: RecentFileWrite[] }) {
  return (
    <div className="space-y-2">
      {writes.map((write) => (
        <button
          key={`${write.path}-${write.written}`}
          type="button"
          className="w-full rounded-md border border-slate-200 bg-white p-3 text-left text-sm transition hover:bg-slate-50"
        >
          <span className="block truncate font-mono text-xs font-semibold text-slate-800">{write.path}</span>
          <span className="mt-1 block text-xs text-slate-500">
            {write.size} - {write.written}
          </span>
        </button>
      ))}
    </div>
  );
}

export function RuntimeFilesPanel({ fileTree, recentWrites }: { fileTree: FileNode[]; recentWrites: RecentFileWrite[] }) {
  const [activeTab, setActiveTab] = useState<"files" | "recent">("files");

  return (
    <section className="h-full min-h-0 overflow-hidden border-r border-t border-slate-200 bg-white">
      <div className="grid h-full grid-cols-[360px_minmax(0,1fr)]">
        <div className="min-h-0 border-r border-slate-200">
          <div className="flex h-[48px] items-end gap-6 border-b border-slate-200 px-5">
            <button
              type="button"
              className={[
                "relative h-full text-sm font-semibold",
                activeTab === "files" ? "text-slate-950" : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
              onClick={() => setActiveTab("files")}
            >
              Files
              {activeTab === "files" ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-600" /> : null}
            </button>
            <button
              type="button"
              className={[
                "relative h-full text-sm font-semibold",
                activeTab === "recent" ? "text-slate-950" : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
              onClick={() => setActiveTab("recent")}
            >
              Recent file writes
              {activeTab === "recent" ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-600" /> : null}
            </button>
          </div>

          <div className="h-[calc(100%-48px)] overflow-auto p-4">
            {activeTab === "files" ? (
              <div className="space-y-1">
                {fileTree.map((node) => (
                  <FileTreeNode key={node.id} node={node} />
                ))}
              </div>
            ) : (
              <RecentWritesList writes={recentWrites} />
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex h-[48px] items-center border-b border-slate-200 px-5">
            <h2 className="text-base font-semibold text-slate-950">Recent file writes</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-5">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs font-semibold text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="py-3 pr-4">Path</th>
                  <th className="w-[100px] px-4 py-3">Size</th>
                  <th className="w-[130px] px-4 py-3">Written</th>
                  <th className="w-[180px] px-4 py-3">Tool call</th>
                  <th className="w-[170px] pl-4 py-3">User/Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentWrites.map((write) => (
                  <tr key={`${write.path}-${write.toolCallId}`}>
                    <td className="max-w-[320px] truncate py-3 pr-4 font-mono text-xs text-slate-800">{write.path}</td>
                    <td className="px-4 py-3 text-slate-700">{write.size}</td>
                    <td className="px-4 py-3 text-slate-700">{write.written}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{write.toolCallId}</td>
                    <td className="pl-4 py-3 text-slate-700">{write.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex h-[40px] items-center justify-end border-t border-slate-100 px-5">
            <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              Open in file browser
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
