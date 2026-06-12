import { create } from "zustand";
import * as caseApi from "../api/case";
import type { CaseQuery, ReviewApprovalPayload, SubmitApprovalPayload } from "../api/case";
import type { ApprovalRecord, CaseRecord } from "../types";

type CaseState = {
  cases: CaseRecord[];
  selectedCase: CaseRecord | null;
  loading: boolean;
  fetchCases: (params?: CaseQuery) => Promise<void>;
  fetchCase: (id: string) => Promise<void>;
  submitClosureApproval: (caseId: string, payload: SubmitApprovalPayload) => Promise<ApprovalRecord>;
  reviewClosureApproval: (
    caseId: string,
    approvalId: string,
    payload: ReviewApprovalPayload
  ) => Promise<ApprovalRecord>;
};

export const useCaseStore = create<CaseState>((set, get) => ({
  cases: [],
  selectedCase: null,
  loading: false,
  async fetchCases(params) {
    set({ loading: true });
    try {
      set({ cases: await caseApi.listCases(params) });
    } finally {
      set({ loading: false });
    }
  },
  async fetchCase(id) {
    set({ selectedCase: await caseApi.getCase(id) });
  },
  async submitClosureApproval(caseId, payload) {
    const approvalRecord = await caseApi.submitClosureApproval(caseId, payload);
    await get().fetchCase(caseId);
    return approvalRecord;
  },
  async reviewClosureApproval(caseId, approvalId, payload) {
    const approvalRecord = await caseApi.reviewClosureApproval(caseId, approvalId, payload);
    await get().fetchCase(caseId);
    return approvalRecord;
  }
}));
