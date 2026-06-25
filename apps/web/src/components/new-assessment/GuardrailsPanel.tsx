import { ArrowRight, Check, Circle, X } from 'lucide-react';

import type { RolePermissionSummary, SelectOption } from '../../hooks/useNewAssessmentSetup';
import type { ChecklistItem, GuardrailSection } from '../../types/new-assessment';

interface GuardrailsPanelProps {
  canSave: boolean;
  checklistItems: ChecklistItem[];
  errorMessage?: string;
  guardrailSections: GuardrailSection[];
  isSaving?: boolean;
  onSaveContinue: () => void;
  onPolicyChange: (policyId: string) => void;
  onProviderChange: (providerId: string) => void;
  policyOptions: SelectOption[];
  providerOptions: SelectOption[];
  rolePermissions: RolePermissionSummary[];
  selectedPolicyId: string | null;
  selectedProviderId: string | null;
}

export function GuardrailsPanel({
  canSave,
  checklistItems,
  errorMessage,
  guardrailSections,
  isSaving = false,
  onPolicyChange,
  onProviderChange,
  onSaveContinue,
  policyOptions,
  providerOptions,
  rolePermissions,
  selectedPolicyId,
  selectedProviderId,
}: GuardrailsPanelProps) {
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
        <h2 className="text-[16px] font-semibold text-slate-950">Session defaults</h2>
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-slate-800">Provider profile</span>
          <select
            value={selectedProviderId ?? ''}
            onChange={(event) => onProviderChange(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Select provider profile</option>
            {providerOptions.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block truncate text-[11px] text-slate-500">
            {providerOptions.find((provider) => provider.id === selectedProviderId)?.helper ?? 'Provider is required for model-backed agent work.'}
          </span>
        </label>

        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-slate-800">Policy</span>
          <select
            value={selectedPolicyId ?? ''}
            onChange={(event) => onPolicyChange(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Select policy</option>
            {policyOptions.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block truncate text-[11px] text-slate-500">
            {policyOptions.find((policy) => policy.id === selectedPolicyId)?.helper ?? 'Policy controls approval and runtime guardrails.'}
          </span>
        </label>
      </section>

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
          disabled={isSaving || !canSave}
        >
          {isSaving ? "Creating session..." : "Save and continue"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </aside>
  );
}
