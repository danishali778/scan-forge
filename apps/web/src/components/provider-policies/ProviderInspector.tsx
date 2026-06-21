import { Bot, CheckCircle2, LockKeyhole, Shield, X } from "lucide-react";
import type { ReactNode } from "react";

import { auditEvents, selectedPolicy, selectedProvider } from "@/mocks/provider-policies";

const policyJson = `{
  "mode": "assisted",
  "terminal": {
    "allowlist": ["curl", "nmap", "nslookup", "dig"],
    "timeout": 300,
    "max_output_bytes": 1048576
  },
  "file_writes": {
    "mode": "workspace_only",
    "max_file_size": 1048576
  }
}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 py-5 last:border-b-0">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProviderInspector() {
  return (
    <aside className="w-[430px] shrink-0 border-l border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
        <div className="flex gap-8 text-sm font-semibold">
          <button className="relative h-14 text-teal-800">
            Details
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-700" />
          </button>
          <button className="text-slate-500">Policy</button>
          <button className="text-slate-500">Audit</button>
        </div>
        <X className="h-5 w-5 text-slate-500" />
      </div>

      <div className="h-[calc(100vh-122px)] overflow-y-auto px-6">
        <section className="border-b border-slate-200 py-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-200">
              <Bot className="h-7 w-7 text-slate-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950">{selectedProvider.name}</h2>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Enabled
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedProvider.id} · OpenAI Compatible
              </div>
              <span className="mt-2 inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                Default
              </span>
            </div>
          </div>
        </section>

        <Section title="Provider details">
          <dl className="space-y-3 text-sm">
            {[
              ["Base URL", "https://api.openai.com/v1"],
              ["Authentication", "Bearer token"],
              ["API key", "Present (encrypted)"],
              ["Organization", "org_acme_security"],
              ["Rate limit", "10,000 requests / min"],
              ["Budget limit", "$5,000 / month"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_1fr] gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-800">
                  {label === "API key" ? <LockKeyhole className="mr-2 inline h-4 w-4" /> : null}
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-center gap-4">
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700">
              <CheckCircle2 className="h-4 w-4" />
              Test connection
            </button>
            <span className="text-sm text-slate-500">
              Last test: <span className="font-semibold text-emerald-700">Today 10:40 AM</span>
            </span>
          </div>
        </Section>

        <Section title="Model mapping">
          <dl className="space-y-3 text-sm">
            {[
              ["Primary model", "gpt-4o"],
              ["Fallback model", "gpt-4o-mini"],
              ["Embedding model", "text-embedding-3-small"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_1fr] gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Selected policy">
          <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-indigo-700">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-950">{selectedPolicy.name}</div>
              <div className="font-mono text-xs text-slate-500">{selectedPolicy.id}</div>
            </div>
            <button className="font-mono text-xs font-semibold text-blue-600">{selectedPolicy.id}</button>
          </div>
        </Section>

        <Section title="Policy preview (JSON)">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Invalid JSON</span>
          </div>
          <pre className="mt-3 max-h-[220px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700">
            {policyJson}
          </pre>
          <p className="mt-2 text-xs font-medium text-red-600">Error on line 12: Unexpected end of JSON input</p>
        </Section>

        <Section title="Last audit events">
          <div className="space-y-3 text-sm">
            {auditEvents.map((event) => (
              <div key={`${event.time}-${event.action}`} className="grid grid-cols-[125px_1fr_auto] gap-3">
                <span className="text-slate-500">{event.time}</span>
                <span className="text-slate-700">{event.action}</span>
                <span className="text-slate-500">{event.actor}</span>
              </div>
            ))}
          </div>
          <button className="mt-4 text-sm font-semibold text-teal-700">View all</button>
        </Section>
      </div>
    </aside>
  );
}
