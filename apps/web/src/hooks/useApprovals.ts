import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { approveApproval, denyApproval, listApprovals } from "@/api/approvals";
import { pageItems } from "@/lib/apiPages";
import { mapApproval } from "@/lib/approvalMapping";
import type { ApprovalResolveRequest } from "@/types/approval-queue";

const approvalKeys = {
  list: (status?: string) => ["approvals", status ?? "all"] as const,
};

export function useApprovals(status?: string) {
  const query = useQuery({
    queryKey: approvalKeys.list(status),
    queryFn: () => listApprovals(status === "all" ? undefined : status),
    refetchInterval: 10_000,
  });

  return {
    approvals: pageItems(query.data).map(mapApproval),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useApprovalDecision() {
  const queryClient = useQueryClient();

  const invalidateApprovals = () => {
    void queryClient.invalidateQueries({ queryKey: ["approvals"] });
  };

  const approve = useMutation({
    mutationFn: ({ approvalId, request }: { approvalId: string; request: ApprovalResolveRequest }) =>
      approveApproval(approvalId, request),
    onSuccess: invalidateApprovals,
  });

  const deny = useMutation({
    mutationFn: ({ approvalId, request }: { approvalId: string; request: ApprovalResolveRequest }) =>
      denyApproval(approvalId, request),
    onSuccess: invalidateApprovals,
  });

  return {
    approve,
    deny,
    isPending: approve.isPending || deny.isPending,
    error: approve.error ?? deny.error,
  };
}
