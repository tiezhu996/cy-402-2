import {
  Button,
  Descriptions,
  Divider,
  Input,
  Modal,
  Space,
  Tag,
  Timeline,
  Typography,
  message
} from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as documentApi from "../api/document";
import { AmountSummary } from "../components/common/AmountSummary";
import { DocumentList } from "../components/common/DocumentList";
import { StatusBadge } from "../components/common/StatusBadge";
import { TimelineItem } from "../components/common/TimelineItem";
import { PermissionGate } from "../directives/permission";
import { useAuth } from "../hooks/useAuth";
import { useCaseStore } from "../stores/case";
import { ApprovalStatusLabels, CaseTypeLabels } from "../types/enums";
import type { ApprovalRecord } from "../types";
import { formatDate, formatMoney } from "../utils/format";

const { TextArea } = Input;

export function CaseDetailPage() {
  const { id } = useParams();
  const { selectedCase, fetchCase, submitClosureApproval, reviewClosureApproval } = useCaseStore();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [submitModalOpen, setSubmitModalOpen] = useState<boolean>(false);
  const [submitReason, setSubmitReason] = useState<string>("");
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);

  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [currentApproval, setCurrentApproval] = useState<ApprovalRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);

  useEffect(() => {
    if (id) void fetchCase(id);
  }, [id, fetchCase]);

  if (!selectedCase) {
    return <main className="page-shell">正在加载案件详情...</main>;
  }

  const billings = selectedCase.billings ?? [];
  const summary = billings.reduce(
    (acc, item) => {
      const amount = Number(item.amount);
      acc.receivable += amount;
      if (item.status === "paid" || item.status === "invoiced") acc.received += amount;
      else acc.pending += amount;
      return acc;
    },
    { receivable: 0, received: 0, pending: 0 }
  );

  const approvalRecords: ApprovalRecord[] = selectedCase.approvalRecords ?? [];
  const pendingApproval = approvalRecords.find((item) => item.status === "pending");
  const canSubmitApproval =
    selectedCase.status !== "closed" && selectedCase.status !== "archived" && !pendingApproval;

  async function removeDocument(documentId: string): Promise<void> {
    await documentApi.deleteDocument(documentId);
    message.success("文档已删除");
    if (id) void fetchCase(id);
  }

  async function handleSubmitApproval(): Promise<void> {
    if (!id) return;
    setSubmitLoading(true);
    try {
      await submitClosureApproval(id, { reason: submitReason.trim() || undefined });
      message.success("结案申请已提交，等待主管审批");
      setSubmitModalOpen(false);
      setSubmitReason("");
    } finally {
      setSubmitLoading(false);
    }
  }

  function openReviewModal(approval: ApprovalRecord, action: "approve" | "reject"): void {
    setCurrentApproval(approval);
    setReviewAction(action);
    setRejectReason("");
    setReviewModalOpen(true);
  }

  async function handleReviewApproval(): Promise<void> {
    if (!id || !currentApproval) return;
    if (reviewAction === "reject" && !rejectReason.trim()) {
      message.warning("请填写驳回原因");
      return;
    }
    setReviewLoading(true);
    try {
      await reviewClosureApproval(id, currentApproval.id, {
        action: reviewAction,
        rejectReason: rejectReason.trim() || undefined
      });
      message.success(reviewAction === "approve" ? "已通过结案审批" : "已驳回结案申请");
      setReviewModalOpen(false);
      setCurrentApproval(null);
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <Space align="start" style={{ justifyContent: "space-between", width: "100%" }}>
        <div>
          <h1 className="page-title">{selectedCase.title}</h1>
          <div className="page-subtitle">{selectedCase.caseNo}</div>
        </div>
        <Space>
          <StatusBadge status={selectedCase.status} />
          <PermissionGate permission="case:write">
            {canSubmitApproval && (
              <Button type="primary" onClick={() => setSubmitModalOpen(true)}>
                提交结案申请
              </Button>
          </PermissionGate>
          {pendingApproval && isAdmin && (
            <>
              <Button type="primary" onClick={() => openReviewModal(pendingApproval, "approve")}>
                通过结案
              </Button>
              <Button danger onClick={() => openReviewModal(pendingApproval, "reject")}>
                驳回申请
              </Button>
            </>
          )}
        </Space>
      </Space>

      <div className="work-band" style={{ marginTop: 18 }}>
        <Descriptions column={{ xs: 1, md: 2, xl: 3 }} bordered size="small">
          <Descriptions.Item label="案件类型">{CaseTypeLabels[selectedCase.type]}</Descriptions.Item>
          <Descriptions.Item label="客户">{selectedCase.client?.name}</Descriptions.Item>
          <Descriptions.Item label="主办律师">{selectedCase.mainLawyer?.name}</Descriptions.Item>
          <Descriptions.Item label="协办律师">
            {selectedCase.collaborators?.map((item) => item.user.name).join("、") || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="受理日期">{formatDate(selectedCase.acceptedAt)}</Descriptions.Item>
          <Descriptions.Item label="结案日期">{formatDate(selectedCase.closedAt)}</Descriptions.Item>
          <Descriptions.Item label="案情摘要" span={3}>
            {selectedCase.summary}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div className="work-grid" style={{ marginTop: 18 }}>
        <section className="work-band">
          <Typography.Title level={4}>文档归档</Typography.Title>
          <DocumentList documents={selectedCase.documents ?? []} onDelete={removeDocument} />
          <Divider />
          <Typography.Title level={4}>账单列表</Typography.Title>
          <AmountSummary {...summary} />
          <div style={{ marginTop: 12 }}>
            {(selectedCase.billings ?? []).map((billing) => (
              <div className="meta-row" key={billing.id} style={{ justifyContent: "space-between", padding: "8px 0" }}>
                <span>{billing.billNo}</span>
                <span>{formatMoney(billing.amount)}</span>
                <StatusBadge status={billing.status} />
              </div>
            ))}
          </div>
        </section>
        <aside className="work-band">
          <Typography.Title level={4}>案件时间线</Typography.Title>
          <TimelineItem title="案件受理" time={selectedCase.acceptedAt}>
            客户 {selectedCase.client?.name} 建立委托关系。
          </TimelineItem>
          <TimelineItem title="最近更新" time={selectedCase.updatedAt}>
            当前状态：<StatusBadge status={selectedCase.status} />
          </TimelineItem>
          {selectedCase.closedAt ? <TimelineItem title="结案" time={selectedCase.closedAt} /> : null}
        </aside>
      </div>

      <section className="work-band" style={{ marginTop: 18 }}>
        <Typography.Title level={4}>结案审批记录</Typography.Title>
        {approvalRecords.length === 0 ? (
          <Typography.Text type="secondary">暂无审批记录</Typography.Text>
        ) : (
          <Timeline>
            {approvalRecords.map((record) => (
              <Timeline.Item key={record.id}>
                <Space direction="vertical" size={4}>
                  <Space>
                    <Typography.Text strong>
                      {record.applicant?.name ?? "未知申请人"} 提交结案申请
                    </Typography.Text>
                    <StatusBadge status={record.status} />
                    <Typography.Text type="secondary">{formatDate(record.submittedAt)}</Typography.Text>
                  </Space>
                  {record.reason ? (
                    <Typography.Text>申请理由：{record.reason}</Typography.Text>
                  ) : null}
                  {record.status !== "pending" ? (
                    <>
                      <Divider style={{ margin: "6px 0" }} />
                      <Space>
                        <Tag color="blue">{record.approver?.name ?? "审批人"} 审批：{
                          record.status === "approved" ? "通过" : "驳回"
                        }</Tag>
                        {record.approvedAt ? (
                          <Typography.Text type="secondary">{formatDate(record.approvedAt)}</Typography.Text>
                        ) : null}
                      </Space>
                      {record.rejectReason ? (
                        <Typography.Text type="danger">驳回原因：{record.rejectReason}</Typography.Text>
                      ) : null}
                    </>
                  ) : isAdmin ? (
                    <Space style={{ marginTop: 4 }}>
                      <Button size="small" type="primary" onClick={() => openReviewModal(record, "approve")}>
                        通过
                      </Button>
                      <Button size="small" danger onClick={() => openReviewModal(record, "reject")}>
                        驳回
                      </Button>
                    </Space>
                  ) : null}
                </Space>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </section>

      <Modal
        title="提交结案申请"
        open={submitModalOpen}
        confirmLoading={submitLoading}
        onOk={handleSubmitApproval}
        onCancel={() => {
          setSubmitModalOpen(false);
          setSubmitReason("");
        }}
        okText="提交申请"
        cancelText="取消"
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text>请填写结案申请理由（可选）：</Typography.Text>
          <TextArea
            value={submitReason}
            onChange={(e) => setSubmitReason(e.target.value)}
            rows={4}
            placeholder="请简要说明结案原因及案件处理情况"
            maxLength={500}
            showCount
          />
        </Space>
      </Modal>

      <Modal
        title={reviewAction === "approve" ? "通过结案申请" : "驳回结案申请"}
        open={reviewModalOpen}
        confirmLoading={reviewLoading}
        onOk={handleReviewApproval}
        onCancel={() => {
          setReviewModalOpen(false);
          setCurrentApproval(null);
          setRejectReason("");
        }}
        okText={reviewAction === "approve" ? "确认通过" : "确认驳回"}
        okButtonProps={{ danger: reviewAction === "reject" }}
        cancelText="取消"
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text>
            审批案件：{selectedCase.title}
          </Typography.Text>
          <Typography.Text type="secondary">
            申请人：{currentApproval?.applicant?.name ?? "未知"}
          </Typography.Text>
          {currentApproval?.reason ? (
            <Typography.Text>申请理由：{currentApproval.reason}</Typography.Text>
          ) : null}
          {reviewAction === "reject" ? (
            <>
              <Typography.Text type="danger" strong>
                请填写驳回原因：
              </Typography.Text>
              <TextArea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="请填写驳回原因"
                maxLength={500}
                showCount
              />
            </>
          ) : null}
        </Space>
      </Modal>
    </main>
  );
}
