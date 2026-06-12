import type { Request, Response } from "express";
import { z } from "zod";
import type { CaseFilters, CreateCaseInput, SubmitApprovalInput, ReviewApprovalInput } from "../services/case.service";
import * as caseService from "../services/case.service";
import { HttpError } from "../utils/http-error";

const caseTypeSchema = z.enum(["civil", "criminal", "administrative", "commercial", "labor"]);
const caseStatusSchema = z.enum(["filed", "investigating", "hearing", "closing_pending", "closed", "archived"]);

const createCaseSchema = z.object({
  caseNo: z.string().min(3),
  title: z.string().min(2),
  type: caseTypeSchema,
  status: caseStatusSchema.optional(),
  acceptedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  closedAt: z.string().optional().nullable(),
  summary: z.string().min(5),
  clientId: z.string().uuid(),
  mainLawyerId: z.string().uuid(),
  collaboratorIds: z.array(z.string().uuid()).optional()
});

const statusSchema = z.object({
  status: caseStatusSchema
});

const assignSchema = z.object({
  mainLawyerId: z.string().uuid(),
  collaboratorIds: z.array(z.string().uuid()).default([])
});

const submitApprovalSchema = z.object({
  reason: z.string().optional()
});

const reviewApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectReason: z.string().optional()
});

export async function list(req: Request, res: Response): Promise<void> {
  const filters: CaseFilters = {
    type: typeof req.query.type === "string" ? caseTypeSchema.parse(req.query.type) : undefined,
    status: typeof req.query.status === "string" ? caseStatusSchema.parse(req.query.status) : undefined,
    lawyerId: typeof req.query.lawyerId === "string" ? req.query.lawyerId : undefined,
    startDate: typeof req.query.startDate === "string" ? req.query.startDate : undefined,
    endDate: typeof req.query.endDate === "string" ? req.query.endDate : undefined
  };
  const data: Awaited<ReturnType<typeof caseService.listCases>> = await caseService.listCases(filters);
  res.json({ data });
}

export async function detail(req: Request, res: Response): Promise<void> {
  const data: Awaited<ReturnType<typeof caseService.getCase>> = await caseService.getCase(req.params.id);
  if (!data) {
    throw new HttpError(404, "Case not found");
  }
  res.json({ data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const input: CreateCaseInput = createCaseSchema.parse(req.body);
  const data: Awaited<ReturnType<typeof caseService.createCase>> = await caseService.createCase(input);
  res.status(201).json({ data });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { status }: { status: import("@prisma/client").CaseStatus } = statusSchema.parse(req.body);
  const data: Awaited<ReturnType<typeof caseService.updateCaseStatus>> = await caseService.updateCaseStatus(
    req.params.id,
    status
  );
  res.json({ data });
}

export async function assignLawyers(req: Request, res: Response): Promise<void> {
  const input: { mainLawyerId: string; collaboratorIds: string[] } = assignSchema.parse(req.body);
  const data: Awaited<ReturnType<typeof caseService.assignLawyers>> = await caseService.assignLawyers(
    req.params.id,
    input.mainLawyerId,
    input.collaboratorIds
  );
  res.json({ data });
}

export async function submitClosureApproval(req: Request, res: Response): Promise<void> {
  const input: { reason?: string } = submitApprovalSchema.parse(req.body);
  if (!req.user?.id) {
    throw new HttpError(401, "未登录");
  }
  const submitApprovalInput: SubmitApprovalInput = {
    caseId: req.params.id,
    applicantId: req.user.id,
    reason: input.reason
  };
  const data: Awaited<ReturnType<typeof caseService.submitClosureApproval>> =
    await caseService.submitClosureApproval(submitApprovalInput);
  res.status(201).json({ data });
}

export async function reviewClosureApproval(req: Request, res: Response): Promise<void> {
  const input: { action: "approve" | "reject"; rejectReason?: string } = reviewApprovalSchema.parse(req.body);
  if (!req.user?.id) {
    throw new HttpError(401, "未登录");
  }
  const reviewApprovalInput: ReviewApprovalInput = {
    approvalId: req.params.approvalId,
    approverId: req.user.id,
    action: input.action,
    rejectReason: input.rejectReason
  };
  const data: Awaited<ReturnType<typeof caseService.reviewClosureApproval>> =
    await caseService.reviewClosureApproval(reviewApprovalInput);
  res.json({ data });
}

export async function listApprovals(req: Request, res: Response): Promise<void> {
  const data: Awaited<ReturnType<typeof caseService.listApprovalsByCase>> = await caseService.listApprovalsByCase(
    req.params.id
  );
  res.json({ data });
}
