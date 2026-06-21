import { ChevronRight } from "lucide-react";

import { CompletionIcon, Panel } from "@/components/report-builder/ReportBuilderPrimitives";
import type { ReportSection } from "@/types/report-builder";

type ReportOutlinePanelProps = {
  sections: ReportSection[];
};

export function ReportOutlinePanel({ sections }: ReportOutlinePanelProps) {
  return (
    <Panel title="Report outline" className="min-h-[360px]">
      <div className="p-4">
        <div className="overflow-hidden rounded-md border border-slate-200">
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className="grid h-[52px] w-full grid-cols-[34px_1fr_38px_94px] items-center gap-2 border-b border-slate-100 px-3 text-left last:border-b-0 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4 text-slate-500" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {index + 1}. {section.title}
                </span>
                <span className="block truncate text-xs text-slate-500">{section.description}</span>
              </span>
              <CompletionIcon complete={section.complete} />
              <span className="text-xs text-slate-600">{section.metric}</span>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}
