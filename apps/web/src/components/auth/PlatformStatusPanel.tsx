import { CheckCircle2, FileText, Info, Shield } from "lucide-react";

const statusItems = [
  "Backend session",
  "Supabase Auth",
  "Workspace access",
  "Audit logging",
];

const policyLinks = [
  { label: "Security", icon: Shield },
  { label: "Privacy", icon: FileText },
  { label: "Terms", icon: Info },
];

export function PlatformStatusPanel() {
  return (
    <aside className="flex min-h-screen flex-col border-r border-sf-border bg-slate-50/60 px-10 py-14 lg:px-14 xl:px-[72px]">
      <div>
        <ScopeForgeWordmark />
        <h2 className="mt-16 max-w-[620px] text-[34px] font-bold leading-[1.25] text-slate-950 xl:text-[38px]">
          Security testing orchestration with control and accountability.
        </h2>
        <p className="mt-6 max-w-[620px] text-lg leading-8 text-sf-muted">
          ScopeForge coordinates authorized assessments from planning to
          reporting, with human oversight, policy gates, and immutable audit
          trails.
        </p>
      </div>

      <section className="mt-14 border-y border-sf-border py-9">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h3 className="text-lg font-semibold text-slate-950">
            Platform status
          </h3>
          <span className="flex items-center gap-3 text-base font-medium text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            All systems operational
          </span>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statusItems.map((item) => (
            <div
              className="border-sf-border xl:border-r xl:pr-5 xl:last:border-r-0"
              key={item}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-medium text-slate-950">{item}</p>
                  <p className="mt-2 text-sm text-sf-muted">Healthy</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9">
        <h3 className="text-lg font-semibold text-slate-950">
          Authorized use only
        </h3>
        <p className="mt-6 max-w-[620px] text-base leading-7 text-sf-muted">
          ScopeForge is for authorized security assessments of systems you own
          or have explicit permission to test.
        </p>
        <ul className="mt-5 list-disc space-y-2 pl-6 text-base leading-7 text-sf-muted">
          <li>Do not use for any illegal activity.</li>
          <li>Do not access systems without written authorization.</li>
          <li>All actions are logged and may be reviewed.</li>
        </ul>
      </section>

      <footer className="mt-auto border-t border-sf-border pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-sf-muted">
          <nav className="flex flex-wrap items-center gap-8">
            {policyLinks.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  className="inline-flex items-center gap-2 font-medium text-slate-700 hover:text-sf-running"
                  href="#"
                  key={item.label}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>
          <span>© 2026 ScopeForge, Inc.</span>
        </div>
      </footer>
    </aside>
  );
}

function ScopeForgeWordmark() {
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-16 w-16">
        <div className="absolute left-1 top-0 h-9 w-9 rotate-45 rounded-[7px] bg-sf-running" />
        <div className="absolute bottom-0 left-1 h-9 w-9 rotate-45 rounded-[7px] bg-teal-700" />
        <div className="absolute right-0 top-[14px] h-9 w-9 rotate-45 rounded-[7px] bg-teal-500" />
        <div className="absolute left-[19px] top-[18px] h-7 w-7 rotate-45 rounded-[5px] bg-slate-50" />
      </div>
      <span className="text-[42px] font-bold tracking-[-0.03em] text-slate-950">
        ScopeForge
      </span>
    </div>
  );
}
