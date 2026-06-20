import { ArrowRight, Check, Circle, X } from 'lucide-react';

import { checklistItems, guardrailSections, rolePermissions } from '../../mocks/new-assessment';

interface GuardrailsPanelProps {
  errorMessage?: string;
  isSaving?: boolean;
  onSaveContinue: () => void;
}

export function GuardrailsPanel({ errorMessage, isSaving = false, onSaveContinue }: GuardrailsPanelProps) {
  return (
    <aside className="rounded-md border border-slate-200 bg-white shadow-sm">
      {guardrailSections.map((section) => (
        <section key={section.title} className="border-b border-slate-200 p-5 last:border-b-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-950">{section.title}</h2>
            <button className="text-[13px] font-medium text-teal-700">Edit</button>
          </div>
          <dl className="mt-4 space-y-3">
            {section.rows.map((row) => (
              <div key={`${row.label}-${row.value}`} className="grid grid-cols-[116px_1fr] gap-3 text-[13px]">
                <dt className="font-semibold text-slate-800">{row.label}</dt>
                <dd className="text-slate-800">
                  {row.tone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {row.value}
                    </span>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section className="border-b border-slate-200 p-5">
        <h2 className="text-[16px] font-semibold text-slate-950">Role permissions (this project)</h2>
        <div className="mt-4 space-y-3">
          {rolePermissions.map((role) => (
            <div key={role.role} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 text-slate-800">
                <span className={['h-2.5 w-2.5 rounded-full', role.color].join(' ')} />
                {role.role}
              </span>
              <span className="font-semibold text-slate-800">{role.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="p-5">
        <h2 className="text-[16px] font-semibold text-slate-950">Validation checklist</h2>
        <div className="mt-4 space-y-3">
          {checklistItems.map((item) => {
            const isComplete = item.status === 'complete';
            const isError = item.status === 'error';

            return (
              <div key={item.label} className="flex items-center gap-2 text-[13px] text-slate-700">
                <span
                  className={[
                    'grid h-4 w-4 place-items-center rounded-full text-white',
                    isComplete ? 'bg-emerald-600' : isError ? 'bg-red-500' : 'bg-slate-300',
                  ].join(' ')}
                >
                  {isComplete ? <Check className="h-3 w-3" /> : isError ? <X className="h-3 w-3" /> : <Circle className="h-2 w-2 fill-white" />}
                </span>
                {item.label}
              </div>
            );
          })}
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="button"
          className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-700 text-[15px] font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          onClick={onSaveContinue}
          disabled={isSaving}
        >
          {isSaving ? "Creating session..." : "Save and continue"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </aside>
  );
}
