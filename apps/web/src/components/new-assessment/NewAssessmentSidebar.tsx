import {
  Building2,
  ChevronDown,
  ChevronsLeft,
  Hexagon,
  User,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { getNavPath, isNavPathActive } from '../../app/routes';
import { navigationItems } from '../../mocks/new-assessment';

export function NewAssessmentSidebar() {
  const location = useLocation();

  return (
    <aside className="flex min-h-screen w-[260px] shrink-0 flex-col bg-[#101f2e] text-slate-100 shadow-xl">
      <div className="flex h-[72px] items-center gap-3 px-6">
        <Hexagon className="h-9 w-9 text-teal-400" strokeWidth={2.3} />
        <span className="text-[20px] font-semibold tracking-[-0.01em]">ScopeForge</span>
      </div>

      <div className="px-5 pt-3">
        <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-slate-400">Workspace</p>
        <button className="flex h-11 w-full items-center justify-between rounded-md border border-slate-600/80 bg-slate-900/30 px-3 text-left text-[14px] font-medium text-white">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-300" />
            Acme Security
          </span>
          <ChevronDown className="h-4 w-4 text-slate-300" />
        </button>
      </div>

      <nav className="mt-6 flex-1 px-3">
        <div className="space-y-1">
          {navigationItems.slice(0, 8).map((item) => {
            const Icon = item.icon;
            const path = getNavPath(item.label);
            const active = path ? isNavPathActive(item.label, location.pathname) : item.active;
            const className = [
              'flex h-11 w-full items-center justify-between rounded-md px-3 text-[14px] font-medium transition',
              active
                ? 'bg-teal-700/70 text-white shadow-[inset_3px_0_0_#2dd4bf]'
                : 'text-slate-200 hover:bg-white/8',
            ].join(' ');
            const content = (
              <>
                <span className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </span>
                {item.badge ? (
                  <span
                    className={[
                      'grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs font-bold text-white',
                      item.danger ? 'bg-red-500' : 'bg-amber-500',
                    ].join(' ')}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </>
            );

            return path ? (
              <Link key={item.label} to={path} className={className}>
                {content}
              </Link>
            ) : (
              <button key={item.label} type="button" className={className}>
                {content}
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-white/12 pt-4">
          {navigationItems.slice(8).map((item) => {
            const Icon = item.icon;
            const path = getNavPath(item.label);
            const active = path ? isNavPathActive(item.label, location.pathname) : item.active;
            const className = [
              'flex h-11 w-full items-center gap-3 rounded-md px-3 text-[14px] font-medium transition',
              active ? 'bg-teal-700/70 text-white' : 'text-slate-200 hover:bg-white/8',
            ].join(' ');
            const content = (
              <>
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </>
            );

            return path ? (
              <Link key={item.label} to={path} className={className}>
                {content}
              </Link>
            ) : (
              <button key={item.label} type="button" className={className}>
                {content}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="px-5 pb-5">
        <div className="mb-5 border-t border-white/16" />
        <button className="flex w-full items-center justify-between">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#b96b62] text-sm font-semibold text-white">
              DA
            </span>
            <span className="text-left">
              <span className="block text-[14px] font-semibold text-white">Dani Ahmed</span>
              <span className="block text-[12px] text-slate-300">Owner</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-300" />
        </button>

        <button className="mt-7 flex items-center gap-2 text-[13px] text-slate-300">
          <ChevronsLeft className="h-4 w-4" />
          Collapse
        </button>
      </div>
    </aside>
  );
}
