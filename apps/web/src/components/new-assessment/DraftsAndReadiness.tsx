import { ArrowRight, Check, Circle, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { appRoutes } from '../../app/routes';
import type { ReadinessItem, RecentDraft } from '../../types/new-assessment';

interface DraftsAndReadinessProps {
  readinessItems: ReadinessItem[];
  recentDrafts: RecentDraft[];
}

export function DraftsAndReadiness({ readinessItems, recentDrafts }: DraftsAndReadinessProps) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_390px]">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-[17px] font-semibold text-slate-950">Recent drafts</h2>
        <div className="mt-5 overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-slate-200 text-slate-900">
              <tr>
                <th className="py-3 font-semibold">Draft name</th>
                <th className="py-3 font-semibold">Last updated</th>
                <th className="py-3 font-semibold">Targets</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentDrafts.map((draft) => (
                <tr key={draft.name}>
                  <td className="py-4 text-slate-800">{draft.name}</td>
                  <td className="py-4 text-slate-700">{draft.updatedAt}</td>
                  <td className="py-4 text-slate-700">{draft.targets}</td>
                  <td className="py-4">
                    <span className="inline-flex items-center gap-1 text-blue-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      {draft.status}
                    </span>
                  </td>
                  <td className="py-4">
                    {draft.sessionId ? (
                      <Link to={appRoutes.session(draft.sessionId)} className="font-medium text-teal-700">
                        Resume
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-400">No session</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentDrafts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No backend projects yet. Create the first assessment to populate this list.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Link to={appRoutes.sessions} className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-teal-700">
          View all drafts
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-[17px] font-semibold text-slate-950">Session readiness</h2>
        <div className="mt-5 space-y-4">
          {readinessItems.map((item) => {
            const isComplete = item.status === 'complete';
            const isProgress = item.status === 'in-progress';

            return (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-[14px] text-slate-700">
                  <span
                    className={[
                      'grid h-4 w-4 place-items-center rounded-full',
                      isComplete ? 'bg-emerald-600 text-white' : isProgress ? 'bg-teal-700 text-white' : 'bg-slate-300 text-white',
                    ].join(' ')}
                  >
                    {isComplete ? <Check className="h-3 w-3" /> : isProgress ? <Minus className="h-3 w-3" /> : <Circle className="h-2 w-2 fill-white" />}
                  </span>
                  {item.label}
                </span>
                <span
                  className={[
                    'text-[13px] font-medium',
                    isComplete ? 'text-emerald-700' : isProgress ? 'text-blue-600' : 'text-slate-500',
                  ].join(' ')}
                >
                  {isComplete ? 'Complete' : isProgress ? 'In progress' : 'Not started'}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
