import { ProviderPoliciesScreen } from "@/components/provider-policies/ProviderPoliciesScreen";
import { useProviderPolicies } from "@/hooks/useProviderPolicies";
import { getErrorMessage } from "@/lib/errors";

export function ProviderPoliciesPage() {
  const settings = useProviderPolicies();

  return (
    <ProviderPoliciesScreen
      providers={settings.providers.length > 0 ? settings.providers : undefined}
      policies={settings.policies.length > 0 ? settings.policies : undefined}
      healthMetrics={settings.providers.length > 0 || settings.policies.length > 0 ? settings.healthMetrics : undefined}
      isLoading={settings.isLoading}
      errorMessage={settings.error ? getErrorMessage(settings.error) : null}
    />
  );
}

export default ProviderPoliciesPage;
