import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import unionRoutes from "./union.routes";
import unionMemberRoutes from "./union-member.routes";
// TODO: Customer routes deprecated - use unionMemberRoutes instead
// import customerRoutes from "./customer.routes";
import loanRoutes from "./loan.routes";
import loanTypeRoutes from "./loanType.routes";
import repaymentRoutes from "./repayment.routes";
import documentRoutes from "./document.routes";
import auditLogRoutes from "./auditLog.routes";
import settingsRoutes from "./settings.routes";
import userActivityRoutes from "./user-activity.routes";
import notesRoutes from "./notes.routes";
// import assignmentHistoryRoutes from "./assignment-history.routes";
import healthRoutes from "./health.routes";
import path from "path";
import express from "express";

const router = Router();

// Add this debug line
console.log("Routes module loaded");

// Test route to verify main routes are working
router.get("/test", (req, res) => {
  res.json({
    message: "Main routes are working",
    timestamp: new Date().toISOString(),
    availableRoutes: [
      "/auth",
      "/users",
      "/unions",
      "/union-members",
      "/branches",
      "/customers",
      "/loans",
    ],
  });
});

// Serve uploaded files
router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/unions", unionRoutes);
router.use("/union-members", unionMemberRoutes);
// TODO: Customer routes deprecated - use /union-members instead
// router.use("/customers", customerRoutes);
router.use("/loans", loanRoutes);
router.use("/loan-types", loanTypeRoutes);
router.use("/repayments", repaymentRoutes);
router.use("/documents", documentRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/settings", settingsRoutes);
router.use("/user-activity", userActivityRoutes);
router.use("/notes", notesRoutes);
// router.use("/assignment-history", assignmentHistoryRoutes);
router.use("/", healthRoutes);

export default router;
