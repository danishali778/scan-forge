import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { RuntimeFilesPanel } from "@/components/runtime-tool-calls/RuntimeFilesPanel";
import { RuntimeHeader } from "@/components/runtime-tool-calls/RuntimeHeader";
import { RuntimeInstancePanel } from "@/components/runtime-tool-calls/RuntimeInstancePanel";
import { RuntimeSidebar } from "@/components/runtime-tool-calls/RuntimeSidebar";
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
import { runtimeToolCallsData } from "@/mocks/runtime-tool-calls";
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
  const hasBackendSession = Boolean(runtimeState.selectedSessionId);

  const backendToolCalls = useMemo(() => runtimeState.toolCalls.map(mapToolCall), [runtimeState.toolCalls]);
  const toolCalls = hasBackendSession ? backendToolCalls : runtimeToolCallsData.toolCalls;
  const filters = useMemo(() => buildToolCallFilters(toolCalls), [toolCalls]);
  const fileTree = useMemo(() => {
    const backendFiles = mapRuntimeFiles(runtimeState.files);

    return hasBackendSession ? backendFiles : runtimeToolCallsData.fileTree;
  }, [hasBackendSession, runtimeState.files]);
  const recentWrites = useMemo(() => {
    const backendWrites = mapRecentFileWrites(runtimeState.events, backendToolCalls);

    return hasBackendSession ? backendWrites : runtimeToolCallsData.recentWrites;
  }, [backendToolCalls, hasBackendSession, runtimeState.events]);
  const runtime = runtimeState.runtime
    ? mapRuntimeInstance(runtimeState.runtime)
    : hasBackendSession
      ? emptyRuntimeInstance(runtimeState.selectedSessionId)
      : runtimeToolCallsData.runtime;
  const headerData = runtimeState.selectedSessionId
    ? mapRuntimeHeaderData(runtimeState.session, runtimeState.runtime)
    : {
        breadcrumb: runtimeToolCallsData.breadcrumb,
        status: runtimeToolCallsData.status,
        health: runtimeToolCallsData.health,
        mode: runtimeToolCallsData.mode,
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
      <div className="flex h-full min-w-[1580px]">
        <RuntimeSidebar
          data={{
            workspaceName: runtimeToolCallsData.workspaceName,
            userName: runtimeToolCallsData.userName,
            userEmail: runtimeToolCallsData.userEmail,
          }}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <RuntimeHeader
            data={headerData}
            canUseRuntime={Boolean(runtimeState.selectedSessionId)}
            isMutating={runtimeState.isMutating}
            onRefresh={runtimeState.refetchAll}
            onStartRuntime={() => runtimeState.startRuntime.mutate()}
            onStopRuntime={() => runtimeState.stopRuntime.mutate()}
            onRequestCommand={handleRequestCommand}
          />

          {actionError ? (
            <div className="border-b border-amber-200 bg-amber-50 px-7 py-3 text-sm text-amber-900">
              {getErrorMessage(actionError)}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(760px,1fr)_392px] grid-rows-[minmax(0,1fr)_300px]">
            <RuntimeInstancePanel runtime={runtime} />

            <ToolCallsTable
              filters={filters}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
              toolCalls={visibleToolCalls}
              selectedToolCallId={selectedToolCallId}
              onSelectToolCall={setSelectedToolCallId}
            />

            <div className="row-span-2 min-h-0">
              <ToolCallDetailsPanel toolCall={selectedToolCall} onClose={() => setSelectedToolCallId("")} />
            </div>

            <div className="col-span-2 min-h-0">
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
