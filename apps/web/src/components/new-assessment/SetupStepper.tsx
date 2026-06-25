import { Check, Info, Minus } from 'lucide-react';

import type { SetupStep } from '../../types/new-assessment';

export function SetupStepper({ steps }: { steps: SetupStep[] }) {
  return (
    <section className="flex min-h-full flex-col rounded-md border border-slate-200 bg-white p-3">
      <div className="relative px-2 pt-8">
        <div className="absolute left-[33px] top-10 h-[492px] w-px bg-slate-300" />
        <div className="space-y-7">
          {steps.map((step) => {
            const isActive = step.state === 'active';
            const isCompleted = step.state === 'completed';

            return (
              <div
                key={step.number}
                className={[
                  'relative flex min-h-[78px] gap-4 rounded-md px-3 py-3',
                  isActive ? 'bg-teal-50/80' : '',
                ].join(' ')}
              >
                <div
                  className={[
                    'z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-bold',
                    isCompleted
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : isActive
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-500',
                  ].join(' ')}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : isActive ? step.number : <Minus className="h-4 w-4" />}
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-[15px] font-semibold text-slate-900">{step.number}. {step.title}</h3>
                  <p className={['mt-1 text-[14px]', isActive ? 'text-teal-700' : 'text-slate-500'].join(' ')}>
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-auto rounded-md border border-slate-200 bg-white p-4">
        <div className="flex gap-2 text-[13px] font-semibold text-slate-900">
          <Info className="mt-0.5 h-4 w-4 text-slate-500" />
          All changes are saved as a draft
        </div>
        <p className="mt-2 pl-6 text-[13px] leading-5 text-slate-500">
          You can finish later and resume from the draft.
        </p>
        <button className="mt-4 h-10 w-full rounded-md border border-slate-300 bg-white text-[14px] font-medium text-slate-700 shadow-sm">
          Save draft and exit
        </button>
      </div>
    </section>
  );
}
