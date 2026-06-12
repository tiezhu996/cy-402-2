export enum CaseStatus {
  filed = "filed",
  investigating = "investigating",
  hearing = "hearing",
  closing_pending = "closing_pending",
  closed = "closed",
  archived = "archived"
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.filed]: "立案",
  [CaseStatus.investigating]: "调查",
  [CaseStatus.hearing]: "开庭",
  [CaseStatus.closing_pending]: "待审批结案",
  [CaseStatus.closed]: "结案",
  [CaseStatus.archived]: "归档"
};

export enum ApprovalStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected"
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  [ApprovalStatus.pending]: "待审批",
  [ApprovalStatus.approved]: "已通过",
  [ApprovalStatus.rejected]: "已驳回"
};

