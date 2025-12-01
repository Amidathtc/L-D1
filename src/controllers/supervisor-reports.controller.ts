import { Request, Response } from "express";
import { SupervisorReportsService } from "../service/supervisor-reports.service";
import { ReportType } from "@prisma/client";

export class SupervisorReportsController {
  /**
   * Get real-time dashboard data for a supervisor
   * GET /api/supervisor-reports/dashboard
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Allow ADMIN to view any supervisor's dashboard
      let supervisorId = userId;
      if (userRole === "ADMIN" && req.query.supervisorId) {
        supervisorId = req.query.supervisorId as string;
      }

      const periodStart = req.query.periodStart
        ? new Date(req.query.periodStart as string)
        : undefined;
      const periodEnd = req.query.periodEnd
        ? new Date(req.query.periodEnd as string)
        : undefined;

      const dashboard = await SupervisorReportsService.getSupervisorDashboard({
        supervisorId,
        periodStart,
        periodEnd,
      });

      return res.json(dashboard);
    } catch (error: any) {
      console.error("Error fetching supervisor dashboard:", error);
      return res.status(500).json({
        error: error.message || "Failed to fetch dashboard data",
      });
    }
  }

  /**
   * Generate and save a report session
   * POST /api/supervisor-reports/generate
   */
  static async generateReport(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Allow ADMIN to generate report for any supervisor
      let supervisorId = userId;
      if (userRole === "ADMIN" && req.body.supervisorId) {
        supervisorId = req.body.supervisorId;
      }

      const { reportType, periodStart, periodEnd, title } = req.body;

      if (!reportType || !periodStart || !periodEnd) {
        return res.status(400).json({
          error: "reportType, periodStart, and periodEnd are required",
        });
      }

      // Validate report type
      const validReportTypes = Object.values(ReportType);
      if (!validReportTypes.includes(reportType)) {
        return res.status(400).json({
          error: `Invalid reportType. Must be one of: ${validReportTypes.join(
            ", "
          )}`,
        });
      }

      const report = await SupervisorReportsService.generateReportSession(
        supervisorId,
        reportType as ReportType,
        new Date(periodStart),
        new Date(periodEnd),
        title
      );

      return res.status(201).json(report);
    } catch (error: any) {
      console.error("Error generating report:", error);
      return res.status(500).json({
        error: error.message || "Failed to generate report",
      });
    }
  }

  /**
   * Get all report sessions for a supervisor
   * GET /api/supervisor-reports/sessions
   */
  static async getReportSessions(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Allow ADMIN to view any supervisor's reports
      let supervisorId = userId;
      if (userRole === "ADMIN" && req.query.supervisorId) {
        supervisorId = req.query.supervisorId as string;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await SupervisorReportsService.getReportSessions(
        supervisorId,
        page,
        limit
      );

      return res.json(result);
    } catch (error: any) {
      console.error("Error fetching report sessions:", error);
      return res.status(500).json({
        error: error.message || "Failed to fetch report sessions",
      });
    }
  }

  /**
   * Get a single report session by ID
   * GET /api/supervisor-reports/sessions/:id
   */
  static async getReportSessionById(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Allow ADMIN to view any report
      let supervisorId = userId;
      if (userRole === "ADMIN" && req.query.supervisorId) {
        supervisorId = req.query.supervisorId as string;
      }

      const report = await SupervisorReportsService.getReportSessionById(
        id,
        supervisorId
      );

      return res.json(report);
    } catch (error: any) {
      console.error("Error fetching report session:", error);
      return res.status(500).json({
        error: error.message || "Failed to fetch report session",
      });
    }
  }

  /**
   * Delete a report session
   * DELETE /api/supervisor-reports/sessions/:id
   */
  static async deleteReportSession(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Allow ADMIN to delete any report
      let supervisorId = userId;
      if (userRole === "ADMIN") {
        // Admin can delete any report, but we still check ownership for regular users
        const report = await SupervisorReportsService.getReportSessionById(
          id,
          supervisorId
        );
        if (report) {
          supervisorId = report.supervisorId;
        }
      }

      const result = await SupervisorReportsService.deleteReportSession(
        id,
        supervisorId
      );

      return res.json(result);
    } catch (error: any) {
      console.error("Error deleting report session:", error);
      return res.status(500).json({
        error: error.message || "Failed to delete report session",
      });
    }
  }

  /**
   * Get credit officers under a supervisor
   * GET /api/supervisor-reports/officers
   */
  static async getCreditOfficers(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Allow ADMIN to view any supervisor's officers
      let supervisorId = userId;
      if (userRole === "ADMIN" && req.query.supervisorId) {
        supervisorId = req.query.supervisorId as string;
      }

      const officers = await SupervisorReportsService.getCreditOfficers(
        supervisorId
      );

      return res.json(officers);
    } catch (error: any) {
      console.error("Error fetching credit officers:", error);
      return res.status(500).json({
        error: error.message || "Failed to fetch credit officers",
      });
    }
  }
}
