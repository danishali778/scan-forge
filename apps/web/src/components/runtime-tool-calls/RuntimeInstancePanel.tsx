import { Check, Copy, Folder, Server } from "lucide-react";
import { useState } from "react";

import { HealthCheckIcon } from "@/components/runtime-tool-calls/StatusPills";
import type { RuntimeInstance } from "@/types/runtime-tool-calls";

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
      aria-label={label}
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

export function RuntimeInstancePanel({ runtime }: { runtime: RuntimeInstance }) {
  return (
    <aside className="h-full min-h-0 overflow-y-auto border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-950">Runtime instance</h2>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-mono text-sm font-semibold text-slate-800">{runtime.id}</span>
          <CopyButton value={runtime.id} label="Copy runtime id" />
        </div>
      </div>

      <div className="space-y-5 p-5">
        <dl className="space-y-4">
          <Field label="Image" value={runtime.image} />
          <Field label="Network mode" value={runtime.networkMode} />
          <Field label="Workspace path" value={runtime.workspacePath} />
        </dl>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resource limits</h3>
          <dl className="mt-3 space-y-2">
            {runtime.limits.map((fact) => (
              <div key={fact.label} className="grid grid-cols-[92px_1fr] gap-3 text-sm">
                <dt className="text-slate-500">{fact.label}</dt>
                <dd className="font-semibold text-slate-800">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <dl className="space-y-4 border-t border-slate-200 pt-4">
          <Field label="Started" value={runtime.startedAt} />
          <Field label="Uptime" value={runtime.uptime} />
          <div>
            <dt className="text-xs font-medium text-slate-500">Runtime ID (External)</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-slate-800">{runtime.externalId}</span>
              <CopyButton value={runtime.externalId} label="Copy external runtime id" />
            </dd>
          </div>
        </dl>

        <section className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-950">Health checks</h3>
          <div className="mt-3 space-y-3">
            {runtime.healthChecks.map((check) => (
              <div key={check.label} className="flex items-center gap-3 text-sm">
                <HealthCheckIcon status={check.status} />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{check.label}</span>
                <span className="shrink-0 text-xs text-slate-500">{check.checkedAgo}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-950">Mounted workspace</h3>
          </div>
          <div className="mt-3 space-y-2">
            {runtime.mounts.map((mount) => (
              <div key={mount.label} className="grid grid-cols-[minmax(80px,1fr)_minmax(110px,1fr)] gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <Folder className="h-4 w-4 text-slate-500" />
                  {mount.label}
                </span>
                <span className="truncate font-mono text-xs text-slate-600">{mount.path}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
