import { Router } from "express";
import * as caseController from "../controllers/case.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { auditLogInterceptor } from "../middlewares/audit-log.interceptor";
import { Permissions, permissionGuard, Roles, roleGuard } from "../middlewares/role.guard";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.use(authMiddleware);
router.get("/", Permissions("case:read"), permissionGuard, asyncHandler(caseController.list));
router.get("/:id", Permissions("case:read"), permissionGuard, asyncHandler(caseController.detail));
router.get(
  "/:id/approvals",
  Permissions("case:read"),
  permissionGuard,
  asyncHandler(caseController.listApprovals)
);
router.post(
  "/",
  Roles("admin", "lawyer"),
  roleGuard,
  Permissions("case:write"),
  permissionGuard,
  auditLogInterceptor("create", "Case"),
  asyncHandler(caseController.create)
);
router.patch(
  "/:id/status",
  Roles("admin", "lawyer"),
  roleGuard,
  Permissions("case:write"),
  permissionGuard,
  auditLogInterceptor("status_change", "Case"),
  asyncHandler(caseController.updateStatus)
);
router.patch(
  "/:id/assign",
  Roles("admin", "lawyer"),
  roleGuard,
  Permissions("case:write"),
  permissionGuard,
  auditLogInterceptor("assign_lawyers", "Case"),
  asyncHandler(caseController.assignLawyers)
);
router.post(
  "/:id/closure-approval",
  Roles("admin", "lawyer"),
  roleGuard,
  Permissions("case:write"),
  permissionGuard,
  auditLogInterceptor("submit_closure_approval", "Case"),
  asyncHandler(caseController.submitClosureApproval)
);
router.patch(
  "/:id/closure-approval/:approvalId",
  Roles("admin"),
  roleGuard,
  Permissions("case:write"),
  permissionGuard,
  auditLogInterceptor("review_closure_approval", "ApprovalRecord"),
  asyncHandler(caseController.reviewClosureApproval)
);

export default router;
