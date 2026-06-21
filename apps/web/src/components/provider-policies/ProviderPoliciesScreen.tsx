import { ProviderHealthCards } from "@/components/provider-policies/ProviderHealthCards";
import { ProviderInspector } from "@/components/provider-policies/ProviderInspector";
import { ProviderPoliciesHeader } from "@/components/provider-policies/ProviderPoliciesHeader";
import { ProviderPoliciesSidebar } from "@/components/provider-policies/ProviderPoliciesSidebar";
import { PolicyProfilesTable, ProviderProfilesTable } from "@/components/provider-policies/ProviderTables";
import type { PolicyProfileRow, ProviderHealthMetric, ProviderProfileRow } from "@/types/provider-policies";

interface ProviderPoliciesScreenProps {
  providers?: ProviderProfileRow[];
  policies?: PolicyProfileRow[];
  healthMetrics?: ProviderHealthMetric[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

export function ProviderPoliciesScreen({
  providers,
  policies,
  healthMetrics,
  isLoading = false,
  errorMessage = null,
}: ProviderPoliciesScreenProps) {
  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <ProviderPoliciesSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ProviderPoliciesHeader />
          <div className="flex min-h-0 flex-1">
            <main className="min-w-[760px] flex-1 overflow-y-auto px-5 py-6">
              {errorMessage ? (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  {errorMessage}
                </div>
              ) : null}
              {isLoading ? (
                <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">
                  Loading backend provider settings...
                </div>
              ) : null}
              <ProviderProfilesTable providers={providers} />
              <PolicyProfilesTable policies={policies} />
              <div className="mt-5">
                <ProviderHealthCards metrics={healthMetrics} />
              </div>
            </main>
            <ProviderInspector />
          </div>
        </div>
      </div>
    </div>
  );
}
