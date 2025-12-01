import { Router, Request, Response, NextFunction } from "express";
import { SupervisorReportsController } from "../controllers/supervisor-reports.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// Role check middleware
const requireRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res
        .status(403)
        .json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// All routes require authentication
router.use(authenticate);

// Routes accessible by SUPERVISOR and ADMIN
router.get(
  "/dashboard",
  requireRoles(["SUPERVISOR", "ADMIN"]),
  SupervisorReportsController.getDashboard
);

router.post(
  "/generate",
  requireRoles(["SUPERVISOR", "ADMIN"]),
  SupervisorReportsController.generateReport
);

router.get(
  "/sessions",
  requireRoles(["SUPERVISOR", "ADMIN"]),
  SupervisorReportsController.getReportSessions
);

router.get(
  "/sessions/:id",
  requireRoles(["SUPERVISOR", "ADMIN"]),
  SupervisorReportsController.getReportSessionById
);

router.delete(
  "/sessions/:id",
  requireRoles(["SUPERVISOR", "ADMIN"]),
  SupervisorReportsController.deleteReportSession
);

router.get(
  "/officers",
  requireRoles(["SUPERVISOR", "ADMIN"]),
  SupervisorReportsController.getCreditOfficers
);

export default router;
