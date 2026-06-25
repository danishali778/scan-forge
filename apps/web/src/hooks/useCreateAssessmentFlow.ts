import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listPolicies } from "@/api/policies";
import { createProject, createScope } from "@/api/projects";
import { listProviderProfiles } from "@/api/providerProfiles";
import { createSession } from "@/api/sessions";
import { createTarget } from "@/api/targets";
import { optionalPageItems } from "@/lib/apiPages";
import { queryKeys } from "@/lib/queryKeys";
import type { ApiSessionDetail, ApiTargetType } from "@/types/api";
import type { Target } from "@/types/new-assessment";

export interface AssessmentDetailsInput {
  projectName: string;
  reference: string;
  description: string;
  targets: Target[];
  policyId?: string | null;
  providerProfileId?: string | null;
}

function targetTypeToApi(value: Target): ApiTargetType {
  switch (value.type) {
    case "CIDR":
      return "cidr";
    case "IP":
    case "IP / Port":
      return "ip";
    case "API":
      return "api";
    case "Cloud account":
      return "cloud_account";
    default:
      return value.value.startsWith("http://") || value.value.startsWith("https://") ? "url" : "domain";
  }
}

export function useCreateAssessmentFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssessmentDetailsInput): Promise<ApiSessionDetail> => {
      const [providerProfiles, policies] = await Promise.all([
        optionalPageItems(listProviderProfiles),
        optionalPageItems(listPolicies),
      ]);

      const project = await createProject({
        name: input.projectName,
        description: input.description,
        metadata: {
          assessment_reference: input.reference,
        },
      });

      const filledTargets = input.targets.filter((target) => target.value.trim().length > 0);
      const excludedTargets = filledTargets.filter((target) => target.status === "Excluded");
      const scope = await createScope(project.id, {
        name: "Authorized assessment scope",
        description: "Approved scope generated from the new assessment setup.",
        rules: {
          assessment_reference: input.reference,
          excluded_assets: excludedTargets.map((target) => target.value.trim()),
          guardrails: {
            scope_type: "authorized_assessment",
            data_handling: "no_production_data",
            credential_use: "provided_test_accounts_only",
          },
        },
      });

      const inScopeTargets = filledTargets.filter((target) => target.status === "In scope");

      await Promise.all(
        inScopeTargets.map((target) =>
          createTarget(project.id, {
            type: targetTypeToApi(target),
            value: target.value.trim(),
            label: target.notes || target.value.trim(),
            metadata: {
              owner: target.owner,
              source: "new_assessment_setup",
            },
          }),
        ),
      );

      const providerProfile =
        providerProfiles.find((profile) => profile.id === input.providerProfileId) ??
        providerProfiles.find((profile) => profile.status === "active") ??
        providerProfiles[0];
      const policy =
        policies.find((item) => item.id === input.policyId) ??
        policies.find((item) => item.status === "active") ??
        policies[0];

      return createSession({
        project_id: project.id,
        scope_id: scope.id,
        policy_id: policy?.id ?? null,
        provider_profile_id: providerProfile?.id ?? null,
        title: input.projectName,
        objective: input.description || "Assess the approved target perimeter.",
        mode: "assisted",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.list() });
    },
  });
}
