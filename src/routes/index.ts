import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import branchRoutes from "./branch.routes";
import customerRoutes from "./customer.routes";
import loanRoutes from "./loan.routes";
import loanTypeRoutes from "./loanType.routes";
import repaymentRoutes from "./repayment.routes";
import documentRoutes from "./document.routes";
import auditLogRoutes from "./auditLog.routes";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/branches", branchRoutes);
router.use("/customers", customerRoutes);
router.use("/loans", loanRoutes);
router.use("/loan-types", loanTypeRoutes);
router.use("/repayments", repaymentRoutes);
router.use("/documents", documentRoutes);
router.use("/audit-logs", auditLogRoutes);

export default router;
