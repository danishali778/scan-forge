import { apiRequest } from "@/api/client";
import type { Page } from "@/types/api";
import type { ApiApproval, ApprovalResolveRequest } from "@/types/approval-queue";

export function listApprovals(status?: string): Promise<Page<ApiApproval>> {
  return apiRequest<Page<ApiApproval>>("/approvals", {
    query: { status },
  });
}

export function getApproval(approvalId: string): Promise<ApiApproval> {
  return apiRequest<ApiApproval>(`/approvals/${approvalId}`);
}

export function approveApproval(approvalId: string, request: ApprovalResolveRequest): Promise<ApiApproval> {
  return apiRequest<ApiApproval>(`/approvals/${approvalId}/approve`, {
    method: "POST",
    body: request,
  });
}

export function denyApproval(approvalId: string, request: ApprovalResolveRequest): Promise<ApiApproval> {
  return apiRequest<ApiApproval>(`/approvals/${approvalId}/deny`, {
    method: "POST",
    body: request,
  });
}
