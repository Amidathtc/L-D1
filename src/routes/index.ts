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
import settingsRoutes from "./settings.routes";
import branchTransferRoutes from "./branch-transfer.routes";
import userActivityRoutes from "./user-activity.routes";
import notesRoutes from "./notes.routes";
import branchAnalyticsRoutes from "./branch-analytics.routes";

const router = Router();

// Add this debug line
console.log("Routes module loaded");

// Test route to verify main routes are working
router.get("/test", (req, res) => {
  res.json({
    message: "Main routes are working",
    timestamp: new Date().toISOString(),
    availableRoutes: ["/auth", "/users", "/branches", "/customers", "/loans"],
  });
});

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
router.use("/settings", settingsRoutes);
router.use("/branch-transfers", branchTransferRoutes);
router.use("/user-activity", userActivityRoutes);
router.use("/notes", notesRoutes);
router.use("/analytics", branchAnalyticsRoutes);

export default router;
