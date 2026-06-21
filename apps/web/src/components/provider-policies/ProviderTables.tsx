import { Filter, LockKeyhole, MoreVertical, Search, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { policyProfiles, providerProfiles } from "@/mocks/provider-policies";
import type { PolicyProfileRow, ProviderProfileRow } from "@/types/provider-policies";

function Pill({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "red" | "slate" }) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "slate"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : "border-teal-200 bg-teal-50 text-teal-700";

  return <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function SearchBox({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex items-center gap-3">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-9 w-[260px] rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10"
          placeholder={placeholder}
        />
      </label>
      <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 text-slate-600">
        <Filter className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProviderRow({ provider, selected }: { provider: ProviderProfileRow; selected?: boolean }) {
  const statusTone = provider.status === "enabled" ? "bg-emerald-600" : "bg-red-500";

  return (
    <tr className={selected ? "bg-teal-50/70" : "bg-white"}>
      <td className="px-4 py-4">
        <span
          className={`grid h-4 w-4 place-items-center rounded-full border ${
            selected ? "border-teal-700 bg-teal-700" : "border-slate-400"
          }`}
        >
          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
        </span>
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-950">{provider.name}</span>
          {provider.default ? <Pill>Default</Pill> : null}
        </div>
        <div className="mt-1 font-mono text-xs text-slate-500">{provider.id}</div>
      </td>
      <td className="px-3 py-4 text-slate-700">{provider.type}</td>
      <td className="px-3 py-4 text-slate-700">{provider.models.join(", ")}</td>
      <td className="px-3 py-4">
        <div className={provider.credential === "present" ? "text-slate-700" : "text-red-600"}>
          <span className="inline-flex items-center gap-2">
            <LockKeyhole className="h-4 w-4" />
            {provider.credential === "present" ? "Present" : "Missing"}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {provider.credential === "present" ? "Encrypted" : "No credential"}
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="font-medium text-slate-800">{provider.budget}</div>
        <div className="mt-1 text-xs text-slate-500">{provider.usagePercent}% used</div>
      </td>
      <td className="px-3 py-4">
        <span className="inline-flex items-center gap-2 font-semibold capitalize">
          <span className={`h-2 w-2 rounded-full ${statusTone}`} />
          <span className={provider.status === "enabled" ? "text-emerald-700" : "text-red-600"}>{provider.status}</span>
        </span>
      </td>
      <td className="px-3 py-4 text-slate-700">{provider.updatedAt}</td>
      <td className="px-3 py-4 text-right">
        <MoreVertical className="ml-auto h-5 w-5 text-slate-500" />
      </td>
    </tr>
  );
}

function PolicyRow({ policy, selected }: { policy: PolicyProfileRow; selected?: boolean }) {
  return (
    <tr className={selected ? "bg-teal-50/70" : "bg-white"}>
      <td className="px-4 py-4">
        <span
          className={`grid h-4 w-4 place-items-center rounded-full border ${
            selected ? "border-teal-700 bg-teal-700" : "border-slate-400"
          }`}
        >
          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
        </span>
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-950">{policy.name}</span>
          {policy.default ? <Pill>Default</Pill> : null}
        </div>
        <div className="mt-1 font-mono text-xs text-slate-500">{policy.id}</div>
      </td>
      <td className="px-3 py-4 text-slate-700">{policy.mode}</td>
      {[policy.terminal, policy.fileWrites, policy.memory, policy.approvalRequired].map((value) => (
        <td key={value} className="whitespace-pre-line px-3 py-4 leading-5 text-slate-700">
          {value}
        </td>
      ))}
      <td className="px-3 py-4 text-slate-700">{policy.updatedAt}</td>
      <td className="px-3 py-4 text-right">
        <MoreVertical className="ml-auto h-5 w-5 text-slate-500" />
      </td>
    </tr>
  );
}

export function ProviderProfilesTable() {
  return (
    <section className="border-b border-slate-200 pb-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            Provider profiles <Pill tone="slate">3</Pill>
          </h2>
          <p className="mt-1 text-sm text-slate-500">Model providers available to sessions in this workspace.</p>
        </div>
        <SearchBox placeholder="Search providers..." />
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="w-10 px-4 py-3" />
              {["Name", "Type", "Models", "Credential", "Budget", "Status", "Updated", ""].map((head) => (
                <th key={head} className="px-3 py-3">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {providerProfiles.map((provider, index) => (
              <ProviderRow key={provider.id} provider={provider} selected={index === 0} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-slate-500">Showing 1 to 3 of 3 providers</p>
    </section>
  );
}

export function PolicyProfilesTable() {
  return (
    <section className="pt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            Policy profiles <Pill tone="slate">3</Pill>
          </h2>
          <p className="mt-1 text-sm text-slate-500">Govern behavior, approvals, and execution safety.</p>
        </div>
        <SearchBox placeholder="Search policies..." />
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="w-10 px-4 py-3" />
              {["Policy", "Mode", "Terminal", "File writes", "Memory", "Approval required", "Updated", ""].map((head) => (
                <th key={head} className="px-3 py-3">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {policyProfiles.map((policy, index) => (
              <PolicyRow key={policy.id} policy={policy} selected={index === 0} />
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="inline-flex items-center gap-2 font-semibold">
            <TriangleAlert className="h-4 w-4" />
            1 policy has validation issues
          </span>
          <button className="font-semibold text-teal-700">Review issues</button>
        </div>
      </div>
    </section>
  );
}
