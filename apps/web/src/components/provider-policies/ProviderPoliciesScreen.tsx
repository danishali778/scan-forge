import { ProviderHealthCards } from "@/components/provider-policies/ProviderHealthCards";
import { ProviderInspector } from "@/components/provider-policies/ProviderInspector";
import { ProviderPoliciesHeader } from "@/components/provider-policies/ProviderPoliciesHeader";
import { ProviderPoliciesSidebar } from "@/components/provider-policies/ProviderPoliciesSidebar";
import { PolicyProfilesTable, ProviderProfilesTable } from "@/components/provider-policies/ProviderTables";

export function ProviderPoliciesScreen() {
  return (
    <div className="h-screen overflow-hidden bg-[#f8faf9] text-slate-900">
      <div className="flex h-full min-w-[1440px]">
        <ProviderPoliciesSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ProviderPoliciesHeader />
          <div className="flex min-h-0 flex-1">
            <main className="min-w-[760px] flex-1 overflow-y-auto px-5 py-6">
              <ProviderProfilesTable />
              <PolicyProfilesTable />
              <div className="mt-5">
                <ProviderHealthCards />
              </div>
            </main>
            <ProviderInspector />
          </div>
        </div>
      </div>
    </div>
  );
}
