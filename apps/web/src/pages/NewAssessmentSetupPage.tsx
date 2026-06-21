import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { appRoutes } from '../app/routes';
import { DraftsAndReadiness } from '../components/new-assessment/DraftsAndReadiness';
import { GuardrailsPanel } from '../components/new-assessment/GuardrailsPanel';
import { NewAssessmentHeader } from '../components/new-assessment/NewAssessmentHeader';
import { NewAssessmentSidebar } from '../components/new-assessment/NewAssessmentSidebar';
import type { ProjectDetailsValues } from '../components/new-assessment/ProjectDetailsPanel';
import { ProjectDetailsPanel } from '../components/new-assessment/ProjectDetailsPanel';
import { SetupStepper } from '../components/new-assessment/SetupStepper';
import { TargetsPanel } from '../components/new-assessment/TargetsPanel';
import { useCreateAssessmentFlow } from '../hooks/useCreateAssessmentFlow';
import { getErrorMessage } from '../lib/errors';
import { targets } from '../mocks/new-assessment';

const initialDetails: ProjectDetailsValues = {
  name: 'Staging Web Assessment',
  reference: 'ACME-STG-WEB-2026-06',
  description: 'Authorized security assessment of ACME staging web applications and APIs.',
};

export function NewAssessmentSetupPage() {
  const navigate = useNavigate();
  const [details, setDetails] = useState(initialDetails);
  const createAssessment = useCreateAssessmentFlow();

  const handleSaveContinue = () => {
    createAssessment.mutate(
      {
        projectName: details.name,
        reference: details.reference,
        description: details.description,
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
    <div className="min-h-screen bg-[#f8faf9] text-slate-900">
      <div className="flex min-w-[1180px]">
        <NewAssessmentSidebar />
        <main className="flex min-h-screen flex-1 flex-col">
          <NewAssessmentHeader />
          <div className="grid flex-1 grid-cols-[260px_minmax(620px,1fr)_330px] gap-3 p-3">
            <SetupStepper />
            <div className="space-y-3">
              <ProjectDetailsPanel values={details} onChange={setDetails} />
              <TargetsPanel targets={targets} />
              <DraftsAndReadiness />
            </div>
            <GuardrailsPanel
              errorMessage={createAssessment.error ? getErrorMessage(createAssessment.error) : undefined}
              isSaving={createAssessment.isPending}
              onSaveContinue={handleSaveContinue}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default NewAssessmentSetupPage;
