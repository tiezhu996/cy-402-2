import { request } from "./request";
import type { ApiResponse, ApprovalRecord, CaseRecord } from "../types";
import type { CaseStatus, CaseType } from "../types/enums";

export type CaseQuery = {
  type?: CaseType;
  status?: CaseStatus;
  lawyerId?: string;
  startDate?: string;
  endDate?: string;
};

export type SubmitApprovalPayload = {
  reason?: string;
};

export type ReviewApprovalPayload = {
  action: "approve" | "reject";
  rejectReason?: string;
};

export async function listCases(params?: CaseQuery): Promise<CaseRecord[]> {
  const { data } = await request.get<ApiResponse<CaseRecord[]>>("/cases", { params });
  return data.data;
}

export async function getCase(id: string): Promise<CaseRecord> {
  const { data } = await request.get<ApiResponse<CaseRecord>>(`/cases/${id}`);
  return data.data;
}

export async function createCase(payload: Partial<CaseRecord> & { collaboratorIds?: string[] }): Promise<CaseRecord> {
  const { data } = await request.post<ApiResponse<CaseRecord>>("/cases", payload);
  return data.data;
}

export async function updateCaseStatus(id: string, status: CaseStatus): Promise<CaseRecord> {
  const { data } = await request.patch<ApiResponse<CaseRecord>>(`/cases/${id}/status`, { status });
  return data.data;
}

export async function submitClosureApproval(caseId: string, payload: SubmitApprovalPayload): Promise<ApprovalRecord> {
  const { data } = await request.post<ApiResponse<ApprovalRecord>>(`/cases/${caseId}/closure-approval`, payload);
  return data.data;
}

export async function reviewClosureApproval(
  caseId: string,
  approvalId: string,
  payload: ReviewApprovalPayload
): Promise<ApprovalRecord> {
  const { data } = await request.patch<ApiResponse<ApprovalRecord>>(
    `/cases/${caseId}/closure-approval/${approvalId}`,
    payload
  );
  return data.data;
}

export async function listApprovals(caseId: string): Promise<ApprovalRecord[]> {
  const { data } = await request.get<ApiResponse<ApprovalRecord[]>>(`/cases/${caseId}/approvals`);
  return data.data;
}
