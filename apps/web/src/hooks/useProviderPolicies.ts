import { useQuery } from "@tanstack/react-query";

import { listPolicies } from "@/api/policies";
import { listProviderProfiles } from "@/api/providerProfiles";
import { pageItems } from "@/lib/apiPages";
import {
  mapPolicyProfile,
  mapProviderProfile,
  providerHealthMetrics,
} from "@/lib/providerPolicyMapping";

export function useProviderPolicies() {
  const providers = useQuery({
    queryKey: ["provider-policies", "providers"],
    queryFn: listProviderProfiles,
  });
  const policies = useQuery({
    queryKey: ["provider-policies", "policies"],
    queryFn: listPolicies,
  });

  const providerRows = pageItems(providers.data).map(mapProviderProfile);
  const policyRows = pageItems(policies.data).map(mapPolicyProfile);

  return {
    providers: providerRows,
    policies: policyRows,
    healthMetrics: providerHealthMetrics(providerRows, policyRows),
    isLoading: providers.isLoading || policies.isLoading,
    error: providers.error ?? policies.error,
  };
}
