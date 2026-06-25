import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { RuntimeFilesPanel } from "@/components/runtime-tool-calls/RuntimeFilesPanel";
import { RuntimeHeader } from "@/components/runtime-tool-calls/RuntimeHeader";
import { RuntimeInstancePanel } from "@/components/runtime-tool-calls/RuntimeInstancePanel";
import { ToolCallDetailsPanel } from "@/components/runtime-tool-calls/ToolCallDetailsPanel";
import { ToolCallsTable } from "@/components/runtime-tool-calls/ToolCallsTable";
import { useRuntimeToolCalls } from "@/hooks/useRuntimeToolCalls";
import { getErrorMessage } from "@/lib/errors";
import {
  buildToolCallFilters,
  emptyRuntimeInstance,
  mapRecentFileWrites,
  mapRuntimeFiles,
  mapRuntimeHeaderData,
  mapRuntimeInstance,
  mapToolCall,
} from "@/lib/runtimeMapping";
import type { ToolCall, ToolCallFilter } from "@/types/runtime-tool-calls";

const DEFAULT_COMMAND_JSON = "[\"python\",\"-c\",\"print('hello from ScopeForge runtime')\"]";

function getCallsForFilter(toolCalls: ToolCall[], filter: ToolCallFilter["id"]) {
  if (filter === "all") {
    return toolCalls;
  }

  return toolCalls.filter((toolCall) => toolCall.status === filter);
}

function parseCommandPrompt(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string") && parsed.length > 0) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function RuntimeToolCallsPage() {
  const [searchParams] = useSearchParams();
  const runtimeState = useRuntimeToolCalls(searchParams.get("session_id"));
  const [activeFilter, setActiveFilter] = useState<ToolCallFilter["id"]>("all");
  const [isCommandDialogOpen, setIsCommandDialogOpen] = useState(false);
  const [commandJson, setCommandJson] = useState(DEFAULT_COMMAND_JSON);
  const [commandValidationError, setCommandValidationError] = useState("");
  const hasSelectedSession = Boolean(runtimeState.selectedSessionId);

  const backendToolCalls = useMemo(() => runtimeState.toolCalls.map(mapToolCall), [runtimeState.toolCalls]);
  const toolCalls = backendToolCalls;
  const filters = useMemo(() => buildToolCallFilters(toolCalls), [toolCalls]);
  const fileTree = useMemo(() => {
    return mapRuntimeFiles(runtimeState.files);
  }, [runtimeState.files]);
  const recentWrites = useMemo(() => {
    return mapRecentFileWrites(runtimeState.events, backendToolCalls);
  }, [backendToolCalls, runtimeState.events]);
  const runtime = runtimeState.runtime
    ? mapRuntimeInstance(runtimeState.runtime)
    : emptyRuntimeInstance(runtimeState.selectedSessionId);
  const headerData = hasSelectedSession
    ? mapRuntimeHeaderData(runtimeState.session, runtimeState.runtime)
    : {
        breadcrumb: ["Sessions", "No session selected", "Runtime"],
        status: "stopped" as const,
        health: "degraded" as const,
        mode: "assisted" as const,
      };
  const [selectedToolCallId, setSelectedToolCallId] = useState(toolCalls[0]?.id ?? "");
  const visibleToolCalls = useMemo(() => getCallsForFilter(toolCalls, activeFilter), [activeFilter, toolCalls]);
  const selectedToolCall = toolCalls.find((toolCall) => toolCall.id === selectedToolCallId);
  const actionError =
    runtimeState.startRuntime.error ??
    runtimeState.stopRuntime.error ??
    runtimeState.requestTerminalCommand.error ??
    runtimeState.writeFile.error ??
    runtimeState.error ??
    runtimeState.filesError;

  useEffect(() => {
    if (!filters.some((filter) => filter.id === activeFilter)) {
      setActiveFilter("all");
    }
  }, [activeFilter, filters]);

  useEffect(() => {
    if (!visibleToolCalls.some((toolCall) => toolCall.id === selectedToolCallId)) {
      setSelectedToolCallId(visibleToolCalls[0]?.id ?? "");
    }
  }, [selectedToolCallId, visibleToolCalls]);

  const handleFilterChange = (nextFilter: ToolCallFilter["id"]) => {
    const nextCalls = getCallsForFilter(toolCalls, nextFilter);

    setActiveFilter(nextFilter);
    setSelectedToolCallId(nextCalls[0]?.id ?? "");
  };

  const handleRequestCommand = () => {
    setCommandValidationError("");
    setIsCommandDialogOpen(true);
  };

  const handleSubmitCommand = () => {
    const command = parseCommandPrompt(commandJson);

    if (!command) {
      setCommandValidationError("Command must be a JSON array of strings.");
      return;
    }

    runtimeState.requestTerminalCommand.mutate({
      command,
      cwd: "/workspace",
      timeout_seconds: 60,
      max_output_bytes: 200_000,
    }, {
      onSuccess: () => {
        setIsCommandDialogOpen(false);
        setCommandValidationError("");
      },
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full min-w-[1580px] overflow-hidden">
        <AppSidebar />

        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RuntimeHeader
            data={headerData}
            canUseRuntime={hasSelectedSession}
            isMutating={runtimeState.isMutating}
            onRefresh={runtimeState.refetchAll}
            onStartRuntime={() => runtimeState.startRuntime.mutate()}
            onStopRuntime={() => runtimeState.stopRuntime.mutate()}
            onRequestCommand={handleRequestCommand}
          />

          {actionError ? (
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-7 py-3 text-sm text-amber-900">
              {getErrorMessage(actionError)}
            </div>
          ) : null}
          {!runtimeState.isLoading && !hasSelectedSession ? (
            <div className="shrink-0 border-b border-blue-100 bg-blue-50 px-7 py-3 text-sm text-blue-900">
              No backend sessions are available for runtime operations. Create and start a session before using the runtime console.
            </div>
          ) : null}
          {runtimeState.isLoading ? (
            <div className="shrink-0 border-b border-blue-100 bg-blue-50 px-7 py-3 text-sm text-blue-900">
              Loading runtime session data...
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(760px,1fr)_392px] grid-rows-[minmax(0,1fr)_300px] overflow-hidden">
            <RuntimeInstancePanel runtime={runtime} />

            <ToolCallsTable
              filters={filters}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
              toolCalls={visibleToolCalls}
              selectedToolCallId={selectedToolCallId}
              onSelectToolCall={setSelectedToolCallId}
            />

            <div className="row-span-2 min-h-0 overflow-hidden">
              <ToolCallDetailsPanel toolCall={selectedToolCall} onClose={() => setSelectedToolCallId("")} />
            </div>

            <div className="col-span-2 min-h-0 overflow-hidden">
              <RuntimeFilesPanel fileTree={fileTree} recentWrites={recentWrites} />
            </div>
          </div>
        </main>
      </div>

      {isCommandDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-6">
          <div className="w-full max-w-[560px] rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">Request terminal command</h2>
              <p className="mt-1 text-sm text-slate-500">Commands are sent as argv arrays and validated by the backend runtime gate.</p>
            </div>
            <div className="space-y-3 p-5">
              <label htmlFor="runtime-command-json" className="text-sm font-semibold text-slate-800">
                Command argv
              </label>
              <textarea
                id="runtime-command-json"
                value={commandJson}
                onChange={(event) => setCommandJson(event.target.value)}
                className="min-h-[116px] w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                spellCheck={false}
              />
              {commandValidationError ? <p className="text-sm font-medium text-red-600">{commandValidationError}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setIsCommandDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-md bg-teal-800 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={handleSubmitCommand}
                disabled={runtimeState.requestTerminalCommand.isPending}
              >
                Queue command
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default RuntimeToolCallsPage;
