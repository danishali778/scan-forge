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
}

function targetTypeToApi(value: Target): ApiTargetType {
  if (value.type === "CIDR") {
    return "cidr";
  }

  if (value.type === "IP / Port") {
    return "ip";
  }

  if (value.value.startsWith("http://") || value.value.startsWith("https://")) {
    return "url";
  }

  return "domain";
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

      const excludedTargets = input.targets.filter((target) => target.status === "Excluded");
      const scope = await createScope(project.id, {
        name: "Authorized assessment scope",
        description: "Approved scope generated from the new assessment setup.",
        rules: {
          assessment_reference: input.reference,
          excluded_assets: excludedTargets.map((target) => target.value),
          guardrails: {
            scope_type: "authorized_assessment",
            data_handling: "no_production_data",
            credential_use: "provided_test_accounts_only",
          },
        },
      });

      const inScopeTargets = input.targets.filter((target) => target.status === "In scope");

      await Promise.all(
        inScopeTargets.map((target) =>
          createTarget(project.id, {
            type: targetTypeToApi(target),
            value: target.value,
            label: target.notes || target.value,
            metadata: {
              owner: target.owner,
              source: "new_assessment_setup",
            },
          }),
        ),
      );

      const providerProfile = providerProfiles.find((profile) => profile.status === "active") ?? providerProfiles[0];
      const policy = policies.find((item) => item.status === "active") ?? policies[0];

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
