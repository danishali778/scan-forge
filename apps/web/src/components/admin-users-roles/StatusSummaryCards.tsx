import { CircleHelp, UserPlus, XCircle } from "lucide-react";

import { statusInfoCards } from "@/mocks/admin-users-roles";

export function StatusSummaryCards() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {statusInfoCards.map((card) => {
        const Icon = card.tone === "warning" ? UserPlus : card.tone === "danger" ? XCircle : CircleHelp;
        const tone =
          card.tone === "warning"
            ? "text-orange-600"
            : card.tone === "danger"
              ? "text-red-500"
              : "text-slate-500";

        return (
          <section key={card.title} className="flex min-h-[94px] gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
            <div>
              <h3 className="text-[13px] font-semibold text-slate-950">{card.title}</h3>
              <p className="mt-1 max-w-[340px] text-[12px] leading-5 text-slate-600">{card.body}</p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
