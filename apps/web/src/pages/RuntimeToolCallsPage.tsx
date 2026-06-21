import { useMemo, useState } from "react";

import { RuntimeFilesPanel } from "@/components/runtime-tool-calls/RuntimeFilesPanel";
import { RuntimeHeader } from "@/components/runtime-tool-calls/RuntimeHeader";
import { RuntimeInstancePanel } from "@/components/runtime-tool-calls/RuntimeInstancePanel";
import { RuntimeSidebar } from "@/components/runtime-tool-calls/RuntimeSidebar";
import { ToolCallDetailsPanel } from "@/components/runtime-tool-calls/ToolCallDetailsPanel";
import { ToolCallsTable } from "@/components/runtime-tool-calls/ToolCallsTable";
import { runtimeToolCallsData } from "@/mocks/runtime-tool-calls";
import type { ToolCallFilter } from "@/types/runtime-tool-calls";

function getCallsForFilter(filter: ToolCallFilter["id"]) {
  if (filter === "all") {
    return runtimeToolCallsData.toolCalls;
  }

  return runtimeToolCallsData.toolCalls.filter((toolCall) => toolCall.status === filter);
}

export function RuntimeToolCallsPage() {
  const [activeFilter, setActiveFilter] = useState<ToolCallFilter["id"]>("all");
  const [selectedToolCallId, setSelectedToolCallId] = useState(runtimeToolCallsData.toolCalls[0]?.id ?? "");

  const visibleToolCalls = useMemo(() => getCallsForFilter(activeFilter), [activeFilter]);
  const selectedToolCall = runtimeToolCallsData.toolCalls.find((toolCall) => toolCall.id === selectedToolCallId);

  const handleFilterChange = (nextFilter: ToolCallFilter["id"]) => {
    const nextCalls = getCallsForFilter(nextFilter);

    setActiveFilter(nextFilter);
    setSelectedToolCallId(nextCalls[0]?.id ?? "");
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
            data={{
              breadcrumb: runtimeToolCallsData.breadcrumb,
              status: runtimeToolCallsData.status,
              health: runtimeToolCallsData.health,
              mode: runtimeToolCallsData.mode,
            }}
          />

          <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(760px,1fr)_392px] grid-rows-[minmax(0,1fr)_300px]">
            <RuntimeInstancePanel runtime={runtimeToolCallsData.runtime} />

            <ToolCallsTable
              filters={runtimeToolCallsData.filters}
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
              <RuntimeFilesPanel fileTree={runtimeToolCallsData.fileTree} recentWrites={runtimeToolCallsData.recentWrites} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default RuntimeToolCallsPage;
