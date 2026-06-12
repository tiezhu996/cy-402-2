import { Tag } from "antd";
import { ApprovalStatusLabels, BillingStatusLabels, CaseStatusLabels } from "../../types/enums";
import type { ApprovalStatus, BillingStatus, CaseStatus } from "../../types/enums";

const colorMap: Record<string, string> = {
  filed: "gold",
  investigating: "cyan",
  hearing: "volcano",
  closing_pending: "purple",
  closed: "green",
  archived: "default",
  pending: "orange",
  paid: "green",
  invoiced: "blue",
  voided: "default",
  approved: "green",
  rejected: "red"
};

export function StatusBadge({ status }: { status: CaseStatus | BillingStatus | ApprovalStatus }) {
  const labels: Record<string, string> = { ...CaseStatusLabels, ...BillingStatusLabels, ...ApprovalStatusLabels };
  return <Tag color={colorMap[status]}>{labels[status] ?? status}</Tag>;
}
