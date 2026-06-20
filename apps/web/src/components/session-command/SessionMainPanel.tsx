import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  SquareTerminal,
} from "lucide-react";

import { recentEvents } from "@/mocks/session-command";
import { StatusBadge } from "@/components/session-command/StatusBadge";

const approvedScope = [
  "staging.acme.com",
  "api.staging.acme.com",
  "static.staging.acme.com",
  "auth.staging.acme.com",
];

const constraints = [
  "No destructive actions",
  "No credential brute force",
  "No data exfiltration",
  "Respect rate limits",
];

function InfoCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SessionMainPanel() {
  return (
    <main className="min-w-[650px] flex-1 overflow-y-auto bg-[#fbfcfd]">
      <div className="border-b border-slate-200 bg-white px-7 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">
              2.1 Map attack surface
            </h1>
            <StatusBadge status="in_progress" />
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <Clock3 className="h-4 w-4" />
              12m 34s
            </span>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"
          >
            <Pencil className="h-4 w-4" />
            Edit step
          </button>
        </div>

        <div className="mt-5 flex items-center gap-7 border-b border-slate-200">
          {["Overview", "Tasks", "Tool calls", "Jobs"].map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`relative pb-3 text-sm font-semibold ${
                index === 0 ? "text-teal-700" : "text-slate-500"
              }`}
            >
              {tab}
              {tab === "Tool calls" ? (
                <span className="ml-2 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500">
                  3
                </span>
              ) : null}
              {tab === "Jobs" ? (
                <span className="ml-2 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500">
                  2
                </span>
              ) : null}
              {index === 0 ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal-600" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 p-7">
        <div className="grid grid-cols-[minmax(0,1fr)_230px] gap-6">
          <InfoCard title="Objective">
            <p className="text-sm leading-6 text-slate-600">
              Enumerate the externally reachable attack surface for the Acme staging
              environment and identify key entry points.
            </p>
          </InfoCard>

          <InfoCard title="Policy state">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
              Compliant
            </div>
            <p className="mt-1 text-sm text-slate-500">Last evaluated 2m ago</p>
          </InfoCard>

          <InfoCard title="Approved scope">
            <ul className="space-y-2">
              {approvedScope.map((scope) => (
                <li key={scope} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {scope}
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard title="Constraints">
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              {constraints.map((constraint) => (
                <li key={constraint}>{constraint}</li>
              ))}
            </ul>
          </InfoCard>
        </div>

        <section>
          <h3 className="text-base font-semibold text-slate-950">
            Next action <span className="font-normal text-slate-500">(agent proposed)</span>
          </h3>
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 bg-white">
                <SquareTerminal className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-950">terminal.execute</div>
                <div className="mt-1 truncate font-mono text-sm text-slate-700">
                  curl -I https://api.staging.acme.com/health
                </div>
              </div>
              <span className="rounded-md border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                Requires approval
              </span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-slate-950">Recent session events</h3>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-300 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEvents.map((event) => (
                  <tr key={`${event.time}-${event.event}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{event.time}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            event.tone === "green"
                              ? "bg-emerald-500"
                              : event.tone === "blue"
                                ? "bg-blue-500"
                                : "bg-teal-500"
                          }`}
                        />
                        <span className="font-medium text-slate-700">{event.event}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{event.actor}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-slate-600">
                      {event.detail}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
            View all events
            <ExternalLink className="h-4 w-4" />
          </button>
        </section>
      </div>
    </main>
  );
}
