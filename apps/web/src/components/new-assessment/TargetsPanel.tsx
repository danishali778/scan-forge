import { MoreHorizontal, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { targets } from '../../mocks/new-assessment';
import type { TargetType } from '../../types/new-assessment';

const targetTabs = ['All', 'Domain / URL', 'IP', 'CIDR', 'API', 'Cloud account'] as const;

function typeTone(type: TargetType) {
  if (type === 'CIDR') {
    return 'border-purple-300 bg-purple-50 text-purple-700';
  }

  if (type === 'IP / Port') {
    return 'border-blue-300 bg-blue-50 text-blue-700';
  }

  return 'border-teal-300 bg-teal-50 text-teal-700';
}

export function TargetsPanel() {
  const [activeTab, setActiveTab] = useState<(typeof targetTabs)[number]>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleTargets = useMemo(() => {
    if (activeTab === 'All') {
      return targets;
    }

    if (activeTab === 'Domain / URL') {
      return targets.filter((target) => target.type === 'Domain');
    }

    if (activeTab === 'IP') {
      return targets.filter((target) => target.type === 'IP / Port');
    }

    if (activeTab === 'CIDR') {
      return targets.filter((target) => target.type === 'CIDR');
    }

    return [];
  }, [activeTab]);

  const toggleTarget = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((targetId) => targetId !== id) : [...current, id]
    );
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-slate-950">Targets</h2>
          <p className="mt-1 text-[13px] text-slate-500">Define in-scope targets for this assessment.</p>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-md border border-teal-700 bg-white px-4 text-[14px] font-medium text-teal-700 shadow-sm">
          <Plus className="h-4 w-4" />
          Add target
        </button>
      </div>

      <div className="mt-7">
        <p className="mb-3 text-[13px] font-medium text-slate-900">Target type</p>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-slate-50">
          {targetTabs.map((tab) => (
            <button
              key={tab}
              className={[
                'h-9 min-w-[78px] border-r border-slate-300 px-4 text-[13px] font-medium last:border-r-0',
                activeTab === tab ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-700' : 'text-slate-700',
              ].join(' ')}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-slate-50 text-slate-900">
            <tr>
              <th className="w-12 px-4 py-3">
                <span className="block h-4 w-4 rounded border border-slate-300 bg-white" />
              </th>
              <th className="px-2 py-3 font-semibold">Target</th>
              <th className="px-2 py-3 font-semibold">Type</th>
              <th className="px-2 py-3 font-semibold">Status</th>
              <th className="px-2 py-3 font-semibold">Owner</th>
              <th className="px-2 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {visibleTargets.map((target) => (
              <tr key={target.id} className="h-[48px]">
                <td className="px-4 py-3">
                  <button
                    className={[
                      'block h-4 w-4 rounded border',
                      selectedIds.includes(target.id)
                        ? 'border-teal-700 bg-teal-700'
                        : 'border-slate-300 bg-white',
                    ].join(' ')}
                    onClick={() => toggleTarget(target.id)}
                    aria-label={`Select ${target.value}`}
                  />
                </td>
                <td className="px-2 py-3 font-medium text-blue-600">{target.value}</td>
                <td className="px-2 py-3">
                  <span className={['rounded border px-2 py-0.5 text-[12px] font-medium', typeTone(target.type)].join(' ')}>
                    {target.type}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium',
                      target.status === 'Excluded' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        target.status === 'Excluded' ? 'bg-red-500' : 'bg-emerald-600',
                      ].join(' ')}
                    />
                    {target.status}
                  </span>
                </td>
                <td className="px-2 py-3 text-slate-700">{target.owner}</td>
                <td className="px-2 py-3 text-slate-700">{target.notes}</td>
                <td className="px-4 py-3 text-right">
                  <button className="rounded p-1 text-slate-500 hover:bg-slate-100">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-between text-[13px] text-slate-500">
        <span>Showing 1 to {visibleTargets.length} of {visibleTargets.length} targets</span>
        <div className="flex items-center gap-2">
          <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-300">‹</button>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-teal-700 text-teal-700">1</button>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-400">›</button>
        </div>
      </div>
    </section>
  );
}
