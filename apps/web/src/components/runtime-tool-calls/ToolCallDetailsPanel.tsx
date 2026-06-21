import { Check, Copy, ExternalLink, X } from "lucide-react";
import { useState } from "react";

import { PolicyPill, RiskPill, ToolStatusPill, policyLabel } from "@/components/runtime-tool-calls/StatusPills";
import type { ToolCall } from "@/types/runtime-tool-calls";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 text-sm">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function CodeBlock({ lines, emptyText, copyLabel }: { lines: string[]; emptyText: string; copyLabel: string }) {
  const output = lines.length > 0 ? lines.join("\n") : emptyText;

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-end border-b border-slate-200 bg-white px-2 py-1">
        <CopyButton value={output} label={copyLabel} />
      </div>
      <pre className="max-h-[148px] overflow-auto p-3 text-xs leading-5 text-slate-700">
        <code>
          {lines.length > 0
            ? lines.map((line, index) => (
                <span key={`${line}-${index}`} className="grid grid-cols-[24px_1fr] gap-3">
                  <span className="select-none text-right text-slate-400">{index + 1}</span>
                  <span className="min-w-0 whitespace-pre-wrap font-mono">{line}</span>
                </span>
              ))
            : (
                <span className="text-slate-500">{emptyText}</span>
              )}
        </code>
      </pre>
    </div>
  );
}

function CommandArgv({ toolCall }: { toolCall: ToolCall }) {
  const argvLines = ["[", ...toolCall.commandDetail.argv.map((arg, index) => `  "${arg}"${index === toolCall.commandDetail.argv.length - 1 ? "" : ","}`), "]"];

  return <CodeBlock lines={argvLines} emptyText="[]" copyLabel="Copy command arguments" />;
}

export function ToolCallDetailsPanel({ toolCall, onClose }: { toolCall?: ToolCall; onClose: () => void }) {
  if (!toolCall) {
    return (
      <aside className="h-full min-h-0 overflow-y-auto bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">Tool call details</h2>
        </div>
        <div className="mt-10 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">No tool call selected</p>
          <p className="mt-1 text-sm text-slate-500">Select a table row to inspect command output and policy history.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-full min-h-0 overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">Tool call details</h2>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close tool call details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ToolStatusPill status={toolCall.status} />
          <span className="truncate font-mono text-sm font-semibold text-slate-800">{toolCall.tool}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span className="truncate font-mono">{toolCall.id}</span>
          <CopyButton value={toolCall.id} label="Copy tool call id" />
        </div>
      </div>

      <div className="space-y-6 p-5">
        <section>
          <h3 className="text-sm font-semibold text-slate-950">Command</h3>
          <div className="mt-3">
            <CommandArgv toolCall={toolCall} />
          </div>
          <dl className="mt-4 space-y-3">
            <DetailRow label="cwd" value={toolCall.commandDetail.cwd} />
            <DetailRow label="timeout" value={toolCall.commandDetail.timeout} />
            <DetailRow label="max_output_bytes" value={toolCall.commandDetail.maxOutputBytes} />
            <DetailRow label="created" value={toolCall.commandDetail.created} />
          </dl>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">Policy decision</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PolicyPill policy={toolCall.policyDetail.decision} />
            <RiskPill riskLevel={toolCall.policyDetail.riskLevel} />
          </div>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="text-xs font-semibold text-slate-500">Reasons</div>
              <ul className="mt-2 space-y-1 text-slate-700">
                {toolCall.policyDetail.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Constraints</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                {toolCall.policyDetail.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">Output</h3>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-500">stdout (preview)</div>
              <CodeBlock lines={toolCall.outputDetail.stdout} emptyText="(empty)" copyLabel="Copy stdout preview" />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-500">stderr (preview)</div>
              <CodeBlock lines={toolCall.outputDetail.stderr} emptyText="(empty)" copyLabel="Copy stderr preview" />
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">Linked evidence</h3>
          {toolCall.evidence ? (
            <a href="#" className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold text-blue-700">
              <span className="truncate">{toolCall.evidence.id}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500">
                {toolCall.evidence.source} - {toolCall.evidence.size}
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              </span>
            </a>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No evidence linked.</p>
          )}
        </section>

        <section className="border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">Job</h3>
          {toolCall.job ? (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <a href="#" className="font-semibold text-blue-700">
                {toolCall.job.id}
              </a>
              <CopyButton value={toolCall.job.id} label="Copy job id" />
              <span className="ml-auto text-xs text-slate-500">{toolCall.job.worker}</span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No job attached.</p>
          )}
        </section>

        <section className="border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">Audit trail</h3>
            <button type="button" className="text-xs font-semibold text-teal-700">
              View all
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {toolCall.auditTrail.map((event) => (
              <div key={`${event.time}-${event.event}`} className="grid grid-cols-[76px_1fr_auto] gap-3 text-xs">
                <span className="font-mono text-slate-500">{event.time}</span>
                <span className="font-medium text-slate-700">{event.event}</span>
                <span className="text-slate-500">{event.actor}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">{policyLabel(toolCall.policy)}</p>
        </section>
      </div>
    </aside>
  );
}
