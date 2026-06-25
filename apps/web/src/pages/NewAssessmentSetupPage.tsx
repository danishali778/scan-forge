import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { appRoutes } from '../app/routes';
import { AppSidebar } from '../components/layout/AppSidebar';
import { DraftsAndReadiness } from '../components/new-assessment/DraftsAndReadiness';
import { GuardrailsPanel } from '../components/new-assessment/GuardrailsPanel';
import { NewAssessmentHeader } from '../components/new-assessment/NewAssessmentHeader';
import type { ProjectDetailsValues } from '../components/new-assessment/ProjectDetailsPanel';
import { ProjectDetailsPanel } from '../components/new-assessment/ProjectDetailsPanel';
import { SetupStepper } from '../components/new-assessment/SetupStepper';
import { TargetsPanel } from '../components/new-assessment/TargetsPanel';
import { useCreateAssessmentFlow } from '../hooks/useCreateAssessmentFlow';
import { useNewAssessmentSetup } from '../hooks/useNewAssessmentSetup';
import { getErrorMessage } from '../lib/errors';
import type { Target } from '../types/new-assessment';

const initialDetails: ProjectDetailsValues = {
  name: '',
  reference: '',
  description: '',
};

function createTargetDraft(owner = ''): Target {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `target-${Date.now()}`;

  return {
    id,
    value: '',
    type: 'Domain / URL',
    status: 'In scope',
    owner,
    notes: '',
  };
}

export function NewAssessmentSetupPage() {
  const navigate = useNavigate();
  const [details, setDetails] = useState(initialDetails);
  const [targets, setTargets] = useState<Target[]>(() => [createTargetDraft()]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const createAssessment = useCreateAssessmentFlow();
  const setup = useNewAssessmentSetup({
    details,
    selectedPolicyId,
    selectedProviderId,
    targets,
  });

  useEffect(() => {
    if (!selectedProviderId && setup.defaultProviderId) {
      setSelectedProviderId(setup.defaultProviderId);
    }
  }, [selectedProviderId, setup.defaultProviderId]);

  useEffect(() => {
    if (!selectedPolicyId && setup.defaultPolicyId) {
      setSelectedPolicyId(setup.defaultPolicyId);
    }
  }, [selectedPolicyId, setup.defaultPolicyId]);

  const canSave =
    details.name.trim().length > 0 &&
    targets.some((target) => target.status === 'In scope' && target.value.trim().length > 0) &&
    Boolean(selectedProviderId) &&
    Boolean(selectedPolicyId);

  const handleAddTarget = () => {
    setTargets((current) => [...current, createTargetDraft(setup.userName)]);
  };

  const handleRemoveTarget = (targetId: string) => {
    setTargets((current) => {
      const next = current.filter((target) => target.id !== targetId);

      return next.length > 0 ? next : [createTargetDraft(setup.userName)];
    });
  };

  const handleUpdateTarget = (targetId: string, patch: Partial<Target>) => {
    setTargets((current) =>
      current.map((target) => (target.id === targetId ? { ...target, ...patch } : target)),
    );
  };

  const handleSaveContinue = () => {
    if (!canSave) {
      return;
    }

    createAssessment.mutate(
      {
        projectName: details.name,
        reference: details.reference,
        description: details.description,
        policyId: selectedPolicyId,
        providerProfileId: selectedProviderId,
        targets,
      },
      {
        onSuccess: (session) => {
          navigate(appRoutes.session(session.id));
        },
      }
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1180px] overflow-hidden">
        <AppSidebar />
        <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <NewAssessmentHeader userInitials={setup.userInitials} workspaceName={setup.workspaceName} />
          {setup.error ? (
            <div className="shrink-0 border-b border-red-200 bg-red-50 px-7 py-2 text-[13px] font-medium text-red-700">
              {setup.error.message}
            </div>
          ) : null}
          {setup.isLoading ? (
            <div className="shrink-0 border-b border-blue-100 bg-blue-50 px-7 py-2 text-[13px] font-medium text-blue-700">
              Loading backend setup data...
            </div>
          ) : null}
          <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(620px,1fr)_330px] gap-3 overflow-hidden p-3">
            <div className="min-h-0 overflow-y-auto pr-1">
              <SetupStepper steps={setup.setupSteps} />
            </div>
            <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
              <ProjectDetailsPanel values={details} onChange={setDetails} />
              <TargetsPanel
                targets={targets}
                onAddTarget={handleAddTarget}
                onRemoveTarget={handleRemoveTarget}
                onUpdateTarget={handleUpdateTarget}
              />
              <DraftsAndReadiness readinessItems={setup.readinessItems} recentDrafts={setup.recentDrafts} />
            </div>
            <div className="min-h-0 overflow-y-auto pr-1">
              <GuardrailsPanel
                canSave={canSave}
                checklistItems={setup.checklistItems}
                errorMessage={createAssessment.error ? getErrorMessage(createAssessment.error) : undefined}
                guardrailSections={setup.guardrailSections}
                isSaving={createAssessment.isPending}
                onPolicyChange={(policyId) => setSelectedPolicyId(policyId || null)}
                onProviderChange={(providerId) => setSelectedProviderId(providerId || null)}
                onSaveContinue={handleSaveContinue}
                policyOptions={setup.policyOptions}
                providerOptions={setup.providerOptions}
                rolePermissions={setup.rolePermissions}
                selectedPolicyId={selectedPolicyId}
                selectedProviderId={selectedProviderId}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default NewAssessmentSetupPage;
