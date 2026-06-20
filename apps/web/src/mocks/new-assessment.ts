import {
  BarChart3,
  CheckSquare,
  Database,
  FileText,
  Folder,
  ListChecks,
  Server,
  Settings,
} from 'lucide-react';

import type {
  ChecklistItem,
  GuardrailSection,
  NavigationItem,
  ReadinessItem,
  RecentDraft,
  SetupStep,
  Target,
} from '../types/new-assessment';

export const navigationItems: NavigationItem[] = [
  { label: 'Projects', icon: Folder, active: true },
  { label: 'Sessions', icon: ListChecks },
  { label: 'Runtime', icon: Server },
  { label: 'Approvals', icon: CheckSquare, badge: 3 },
  { label: 'Evidence', icon: FileText },
  { label: 'Findings', icon: Settings, badge: 7, danger: true },
  { label: 'Reports', icon: FileText },
  { label: 'Memory', icon: Database },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
];

export const setupSteps: SetupStep[] = [
  { number: 1, title: 'Project details', state: 'completed', detail: 'Completed' },
  { number: 2, title: 'Targets', state: 'active', detail: 'In progress' },
  { number: 3, title: 'Scope rules', state: 'pending', detail: 'Pending' },
  { number: 4, title: 'Provider profile', state: 'pending', detail: 'Pending' },
  { number: 5, title: 'Policy', state: 'pending', detail: 'Pending' },
  { number: 6, title: 'Review', state: 'pending', detail: 'Pending' },
];

export const targets: Target[] = [
  {
    id: 'target-1',
    value: 'staging.acme.com',
    type: 'Domain',
    status: 'In scope',
    owner: 'Dani Ahmed',
    notes: 'Main staging web app',
  },
  {
    id: 'target-2',
    value: 'api.staging.acme.com',
    type: 'Domain',
    status: 'In scope',
    owner: 'Dani Ahmed',
    notes: 'Public API gateway',
  },
  {
    id: 'target-3',
    value: 'auth.staging.acme.com',
    type: 'Domain',
    status: 'In scope',
    owner: 'Dani Ahmed',
    notes: 'Auth service (OIDC)',
  },
  {
    id: 'target-4',
    value: 'staging.acme.com:443',
    type: 'IP / Port',
    status: 'In scope',
    owner: 'Dani Ahmed',
    notes: 'TLS endpoint',
  },
  {
    id: 'target-5',
    value: '10.12.4.0/24',
    type: 'CIDR',
    status: 'Excluded',
    owner: 'Dani Ahmed',
    notes: 'Internal network range',
  },
];

export const recentDrafts: RecentDraft[] = [
  { name: 'Staging Web Assessment', updatedAt: 'Today, 10:24 AM', targets: 5, status: 'In progress' },
  { name: 'Mobile API Assessment', updatedAt: 'Jun 18, 2026', targets: 8, status: 'In progress' },
  { name: 'Internal Network Review', updatedAt: 'Jun 17, 2026', targets: 12, status: 'In progress' },
];

export const readinessItems: ReadinessItem[] = [
  { label: 'Project details', status: 'complete' },
  { label: 'Targets', status: 'in-progress' },
  { label: 'Scope rules', status: 'not-started' },
  { label: 'Provider profile', status: 'not-started' },
  { label: 'Policy', status: 'not-started' },
  { label: 'Review', status: 'not-started' },
];

export const guardrailSections: GuardrailSection[] = [
  {
    title: 'Scope guardrails',
    rows: [
      { label: 'Scope type', value: 'Authorized assessment' },
      { label: 'Out-of-scope', value: 'No social engineering, DoS/DDoS, Physical testing' },
      { label: 'Data handling', value: 'No production data, No data destruction' },
      { label: 'Credential use', value: 'Only provided test accounts' },
    ],
  },
  {
    title: 'Allowed testing windows',
    rows: [
      { label: 'Days', value: 'Mon - Fri' },
      { label: 'Time (local)', value: '09:00 - 18:00' },
      { label: 'Timezone', value: 'Asia/Karachi (PKT)' },
    ],
  },
  {
    title: 'Excluded assets',
    rows: [
      { label: '10.12.4.0/24', value: '' },
      { label: '*.acme.internal', value: '' },
      { label: 'backup.staging.acme.com', value: '' },
    ],
  },
  {
    title: 'Policy summary',
    rows: [
      { label: 'Policy', value: 'Staging Web Policy v1.2' },
      { label: 'Risk tolerance', value: 'Medium', tone: 'warning' },
      { label: 'Approval required', value: 'Terminal, File write' },
    ],
  },
];

export const rolePermissions = [
  { role: 'Owners', count: 2, color: 'bg-teal-700' },
  { role: 'Admins', count: 3, color: 'bg-amber-500' },
  { role: 'Operators', count: 5, color: 'bg-emerald-600' },
  { role: 'Reviewers', count: 2, color: 'bg-cyan-700' },
  { role: 'Viewers', count: 1, color: 'bg-slate-400' },
];

export const checklistItems: ChecklistItem[] = [
  { label: 'Project name is set', status: 'complete' },
  { label: 'At least one in-scope target', status: 'complete' },
  { label: 'Scope rules not configured', status: 'error' },
  { label: 'Provider profile not selected', status: 'waiting' },
  { label: 'Policy not selected', status: 'waiting' },
];
