import type { Prisma } from "@prisma/client";
import type { ApprovalStatus, CaseStatus, CaseType } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

export type CaseFilters = {
  type?: CaseType;
  status?: CaseStatus;
  lawyerId?: string;
  startDate?: string;
  endDate?: string;
};

export type SubmitApprovalInput = {
  caseId: string;
  applicantId: string;
  reason?: string;
};

export type ReviewApprovalInput = {
  approvalId: string;
  approverId: string;
  action: "approve" | "reject";
  rejectReason?: string;
};

export type CreateCaseInput = {
  caseNo: string;
  title: string;
  type: CaseType;
  status?: CaseStatus;
  acceptedAt: string;
  closedAt?: string | null;
  summary: string;
  clientId: string;
  mainLawyerId: string;
  collaboratorIds?: string[];
};

const approvalInclude = {
  applicant: { select: { id: true, name: true, email: true, primaryRole: true } },
  approver: { select: { id: true, name: true, email: true, primaryRole: true } }
} as const;

const caseInclude = {
  client: true,
  mainLawyer: { select: { id: true, name: true, email: true, primaryRole: true } },
  collaborators: {
    include: { user: { select: { id: true, name: true, email: true, primaryRole: true } } }
  },
  documents: { include: { uploader: { select: { id: true, name: true } } }, orderBy: { uploadedAt: "desc" as const } },
  billings: { orderBy: { createdAt: "desc" as const } },
  approvalRecords: { include: approvalInclude, orderBy: { submittedAt: "desc" as const } }
} as const;

export type CaseWithRelations = Prisma.CaseGetPayload<{ include: typeof caseInclude }>;
export type ApprovalWithRelations = Prisma.ApprovalRecordGetPayload<{ include: typeof approvalInclude }>;

export async function listCases(filters: CaseFilters): Promise<CaseWithRelations[]> {
  return prisma.case.findMany({
    where: {
      type: filters.type,
      status: filters.status,
      acceptedAt:
        filters.startDate || filters.endDate
          ? {
            gte: filters.startDate ? new Date(filters.startDate) : undefined,
            lte: filters.endDate ? new Date(filters.endDate) : undefined
          }
          : undefined,
      OR: filters.lawyerId
        ? [{ mainLawyerId: filters.lawyerId }, { collaborators: { some: { userId: filters.lawyerId } } }]
        : undefined
    },
    include: caseInclude,
    orderBy: { acceptedAt: "desc" }
  });
}

export async function getCase(id: string): Promise<CaseWithRelations | null> {
  return prisma.case.findUnique({
    where: { id },
    include: caseInclude
  });
}

export async function createCase(input: CreateCaseInput): Promise<CaseWithRelations> {
  return prisma.case.create({
    data: {
      caseNo: input.caseNo,
      title: input.title,
      type: input.type,
      status: input.status,
      acceptedAt: new Date(input.acceptedAt),
      closedAt: input.closedAt ? new Date(input.closedAt) : null,
      summary: input.summary,
      clientId: input.clientId,
      mainLawyerId: input.mainLawyerId,
      collaborators: input.collaboratorIds?.length
        ? { create: input.collaboratorIds.map((userId) => ({ userId })) }
        : undefined
    },
    include: caseInclude
  });
}

export async function updateCaseStatus(id: string, status: CaseStatus): Promise<CaseWithRelations> {
  if (status === "closed") {
    throw new HttpError(400, "结案需走审批流程，请先提交结案申请");
  }
  return prisma.case.update({
    where: { id },
    data: { status },
    include: caseInclude
  });
}

export async function assignLawyers(
  id: string,
  mainLawyerId: string,
  collaboratorIds: string[]
): Promise<CaseWithRelations | null> {
  return prisma.$transaction(async (tx) => {
    await tx.case.update({ where: { id }, data: { mainLawyerId } });
    await tx.caseCollaborator.deleteMany({ where: { caseId: id } });
    if (collaboratorIds.length) {
      await tx.caseCollaborator.createMany({
        data: collaboratorIds.map((userId) => ({ caseId: id, userId })),
        skipDuplicates: true
      });
    }
    return tx.case.findUnique({ where: { id }, include: caseInclude });
  });
}

export async function submitClosureApproval(input: SubmitApprovalInput): Promise<ApprovalWithRelations> {
  const caseRecord = await prisma.case.findUnique({ where: { id: input.caseId } });
  if (!caseRecord) {
    throw new HttpError(404, "案件不存在");
  }
  if (caseRecord.status === "closed" || caseRecord.status === "archived") {
    throw new HttpError(400, "案件已结案或归档，无法提交审批");
  }
  const existingPending = await prisma.approvalRecord.findFirst({
    where: { caseId: input.caseId, status: "pending" as ApprovalStatus }
  });
  if (existingPending) {
    throw new HttpError(400, "已有待审批的结案申请，请等待审批结果");
  }
  return prisma.$transaction(async (tx) => {
    const approvalRecord: ApprovalWithRelations = await tx.approvalRecord.create({
      data: {
        caseId: input.caseId,
        applicantId: input.applicantId,
        reason: input.reason
      },
      include: approvalInclude
    });
    await tx.case.update({
      where: { id: input.caseId },
      data: { status: "closing_pending" as CaseStatus }
    });
    return approvalRecord;
  });
}

export async function reviewClosureApproval(input: ReviewApprovalInput): Promise<ApprovalWithRelations> {
  const approvalRecord = await prisma.approvalRecord.findUnique({ where: { id: input.approvalId } });
  if (!approvalRecord) {
    throw new HttpError(404, "审批记录不存在");
  }
  if (approvalRecord.status !== "pending") {
    throw new HttpError(400, "该审批已处理，无法重复审批");
  }
  if (input.action === "reject" && !input.rejectReason?.trim()) {
    throw new HttpError(400, "驳回审批必须填写驳回原因");
  }
  return prisma.$transaction(async (tx) => {
    const updatedApproval: ApprovalWithRelations = await tx.approvalRecord.update({
      where: { id: input.approvalId },
      data: {
        approverId: input.approverId,
        status: (input.action === "approve" ? "approved" : "rejected") as ApprovalStatus,
        rejectReason: input.action === "reject" ? input.rejectReason : null,
        approvedAt: input.action === "approve" ? new Date() : null
      },
      include: approvalInclude
    });
    if (input.action === "approve") {
      await tx.case.update({
        where: { id: approvalRecord.caseId },
        data: { status: "closed" as CaseStatus, closedAt: new Date() }
      });
    } else {
      const caseRecord = await tx.case.findUnique({ where: { id: approvalRecord.caseId } });
      if (caseRecord && caseRecord.status === "closing_pending") {
        await tx.case.update({
          where: { id: approvalRecord.caseId },
          data: { status: "hearing" as CaseStatus }
        });
      }
    }
    return updatedApproval;
  });
}

export async function listApprovalsByCase(caseId: string): Promise<ApprovalWithRelations[]> {
  return prisma.approvalRecord.findMany({
    where: { caseId },
    include: approvalInclude,
    orderBy: { submittedAt: "desc" }
  });
}
