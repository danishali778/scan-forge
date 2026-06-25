import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

export type SetupStepStatus = 'completed' | 'active' | 'pending';

export type TargetType = 'Domain' | 'Domain / URL' | 'IP' | 'IP / Port' | 'CIDR' | 'API' | 'Cloud account';

export type TargetStatus = 'In scope' | 'Excluded';

export interface SetupStep {
  number: number;
  title: string;
  state: SetupStepStatus;
  detail: string;
}

export interface NavigationItem {
  label: string;
  icon: ComponentType<LucideProps>;
  active?: boolean;
  badge?: number;
  danger?: boolean;
}

export interface Target {
  id: string;
  value: string;
  type: TargetType;
  status: TargetStatus;
  owner: string;
  notes: string;
}

export interface RecentDraft {
  name: string;
  updatedAt: string;
  targets: number;
  status: string;
  sessionId?: string;
}

export interface ReadinessItem {
  label: string;
  status: 'complete' | 'in-progress' | 'not-started';
}

export interface GuardrailSection {
  title: string;
  rows: Array<{
    label: string;
    value: string;
    tone?: 'default' | 'warning' | 'danger';
  }>;
}

export interface ChecklistItem {
  label: string;
  status: 'complete' | 'error' | 'waiting';
}
