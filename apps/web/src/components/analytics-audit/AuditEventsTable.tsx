import { CheckCircle2, Info } from "lucide-react";

import { auditEvents } from "@/mocks/analytics-audit";
import type { AuditEventRow } from "@/types/analytics-audit";

export function AuditEventsTable({ events = auditEvents }: { events?: AuditEventRow[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-slate-950">Audit events</h2>
        <Info className="h-4 w-4 text-slate-500" />
      </div>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500">
          <tr>
            {["Time (PKT)", "Actor", "Action", "Resource", "IP / Device", "Result", "Details"].map((head) => (
              <th key={head} className="py-3">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {events.map((event) => (
            <tr key={`${event.time}-${event.action}`}>
              <td className="py-3 text-slate-700">{event.time}</td>
              <td className="py-3">
                <span className="inline-flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    {event.initials}
                  </span>
                  {event.actor}
                </span>
              </td>
              <td className="py-3">{event.action}</td>
              <td className="py-3">{event.resource}</td>
              <td className="py-3 text-slate-600">{event.ipDevice}</td>
              <td className="py-3">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {event.result}
                </span>
              </td>
              <td className="py-3 text-slate-700">{event.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Showing 1 to {events.length} of {events.length} events</span>
        <button className="font-semibold text-teal-700">View full audit log</button>
      </div>
    </section>
  );
}
