import { DraftsAndReadiness } from '../components/new-assessment/DraftsAndReadiness';
import { GuardrailsPanel } from '../components/new-assessment/GuardrailsPanel';
import { NewAssessmentHeader } from '../components/new-assessment/NewAssessmentHeader';
import { NewAssessmentSidebar } from '../components/new-assessment/NewAssessmentSidebar';
import { ProjectDetailsPanel } from '../components/new-assessment/ProjectDetailsPanel';
import { SetupStepper } from '../components/new-assessment/SetupStepper';
import { TargetsPanel } from '../components/new-assessment/TargetsPanel';

export function NewAssessmentSetupPage() {
  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900">
      <div className="flex min-w-[1180px]">
        <NewAssessmentSidebar />
        <main className="flex min-h-screen flex-1 flex-col">
          <NewAssessmentHeader />
          <div className="grid flex-1 grid-cols-[260px_minmax(620px,1fr)_330px] gap-3 p-3">
            <SetupStepper />
            <div className="space-y-3">
              <ProjectDetailsPanel />
              <TargetsPanel />
              <DraftsAndReadiness />
            </div>
            <GuardrailsPanel />
          </div>
        </main>
      </div>
    </div>
  );
}

export default NewAssessmentSetupPage;
