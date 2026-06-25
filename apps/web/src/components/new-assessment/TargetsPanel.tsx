import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Target, TargetStatus, TargetType } from '../../types/new-assessment';

const targetTabs = ['All', 'Domain / URL', 'IP', 'CIDR', 'API', 'Cloud account'] as const;
const targetTypes: TargetType[] = ['Domain / URL', 'IP / Port', 'CIDR', 'API', 'Cloud account'];
const targetStatuses: TargetStatus[] = ['In scope', 'Excluded'];

function typeTone(type: TargetType) {
  if (type === 'CIDR') {
    return 'border-purple-300 bg-purple-50 text-purple-700';
  }

  if (type === 'IP' || type === 'IP / Port') {
    return 'border-blue-300 bg-blue-50 text-blue-700';
  }

  if (type === 'API') {
    return 'border-cyan-300 bg-cyan-50 text-cyan-700';
  }

  if (type === 'Cloud account') {
    return 'border-amber-300 bg-amber-50 text-amber-800';
  }

  return 'border-teal-300 bg-teal-50 text-teal-700';
}

interface TargetsPanelProps {
  targets: Target[];
  onAddTarget: () => void;
  onRemoveTarget: (targetId: string) => void;
  onUpdateTarget: (targetId: string, patch: Partial<Target>) => void;
}

function matchesTab(target: Target, activeTab: (typeof targetTabs)[number]) {
  if (activeTab === 'All') {
    return true;
  }

  if (activeTab === 'Domain / URL') {
    return target.type === 'Domain' || target.type === 'Domain / URL';
  }

  if (activeTab === 'IP') {
    return target.type === 'IP' || target.type === 'IP / Port';
  }

  return target.type === activeTab;
}

export function TargetsPanel({ targets, onAddTarget, onRemoveTarget, onUpdateTarget }: TargetsPanelProps) {
  const [activeTab, setActiveTab] = useState<(typeof targetTabs)[number]>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleTargets = useMemo(() => {
    return targets.filter((target) => matchesTab(target, activeTab));
  }, [activeTab, targets]);

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
        <button
          type="button"
          onClick={onAddTarget}
          className="flex h-10 items-center gap-2 rounded-md border border-teal-700 bg-white px-4 text-[14px] font-medium text-teal-700 shadow-sm"
        >
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
                <td className="px-2 py-3">
                  <input
                    value={target.value}
                    onChange={(event) => onUpdateTarget(target.id, { value: event.target.value })}
                    placeholder="staging.example.com"
                    className="h-8 w-full rounded border border-transparent bg-transparent px-2 font-medium text-blue-600 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />
                </td>
                <td className="px-2 py-3">
                  <select
                    value={target.type}
                    onChange={(event) => onUpdateTarget(target.id, { type: event.target.value as TargetType })}
                    className={['h-8 rounded border px-2 text-[12px] font-medium outline-none', typeTone(target.type)].join(' ')}
                  >
                    {targetTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-3">
                  <select
                    value={target.status}
                    onChange={(event) => onUpdateTarget(target.id, { status: event.target.value as TargetStatus })}
                    className={[
                      'h-8 rounded-md px-2 text-[12px] font-medium outline-none',
                      target.status === 'Excluded' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
                    ].join(' ')}
                  >
                    {targetStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-3">
                  <input
                    value={target.owner}
                    onChange={(event) => onUpdateTarget(target.id, { owner: event.target.value })}
                    placeholder="Owner"
                    className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-slate-700 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />
                </td>
                <td className="px-2 py-3">
                  <input
                    value={target.notes}
                    onChange={(event) => onUpdateTarget(target.id, { notes: event.target.value })}
                    placeholder="Notes"
                    className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-slate-700 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveTarget(target.id)}
                    className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Remove ${target.value || 'target'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {visibleTargets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No targets in this filter yet. Add a target to define the assessment perimeter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-between text-[13px] text-slate-500">
        <span>Showing 1 to {visibleTargets.length} of {visibleTargets.length} targets</span>
        <div className="flex items-center gap-2">
          <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-300">&lt;</button>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-teal-700 text-teal-700">1</button>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-400">&gt;</button>
        </div>
      </div>
    </section>
  );
}
