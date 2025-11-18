import { Request, Response } from "express";
import { UnionService } from "../service/union.service";

export class UnionController {
  static async createUnion(req: Request, res: Response) {
    try {
      const { name, location, address, creditOfficerId } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!name || !creditOfficerId) {
        return res.status(400).json({
          success: false,
          message: "Name and creditOfficerId are required",
        });
      }

      const union = await UnionService.createUnion(
        {
          name,
          location,
          address,
          creditOfficerId,
        },
        userRole
      );

      res.status(201).json({
        success: true,
        message: "Union created successfully",
        data: union,
      });
    } catch (error: any) {
      console.error("UnionController.createUnion error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create union",
      });
    }
  }

  static async getUnions(req: Request, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : 20;
      const creditOfficerId = req.query.creditOfficerId as string;
      const search = req.query.search as string;

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await UnionService.getUnions(
        {
          page,
          limit,
          creditOfficerId,
          search,
        },
        userRole,
        userId
      );

      res.json({
        success: true,
        data: result.unions,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error: any) {
      console.error("UnionController.getUnions error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch unions",
      });
    }
  }

  static async getUnionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const union = await UnionService.getUnionById(id, userRole, userId);

      res.json({
        success: true,
        data: union,
      });
    } catch (error: any) {
      console.error("UnionController.getUnionById error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to fetch union",
      });
    }
  }

  static async updateUnion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, location, address, creditOfficerId } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const union = await UnionService.updateUnion(
        id,
        {
          name,
          location,
          address,
          creditOfficerId,
        },
        userId,
        userRole
      );

      res.json({
        success: true,
        message: "Union updated successfully",
        data: union,
      });
    } catch (error: any) {
      console.error("UnionController.updateUnion error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update union",
      });
    }
  }

  static async deleteUnion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      await UnionService.deleteUnion(id, userId, userRole);

      res.json({
        success: true,
        message: "Union deleted successfully",
      });
    } catch (error: any) {
      console.error("UnionController.deleteUnion error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to delete union",
      });
    }
  }

  static async assignUnionToCreditOfficer(req: Request, res: Response) {
    try {
      const { unionId } = req.params;
      const { creditOfficerId, reason } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!creditOfficerId) {
        return res.status(400).json({
          success: false,
          message: "creditOfficerId is required",
        });
      }

      const union = await UnionService.assignUnionToCreditOfficer(
        unionId,
        creditOfficerId,
        userId,
        userRole,
        reason
      );

      res.json({
        success: true,
        message: "Union reassigned successfully",
        data: union,
      });
    } catch (error: any) {
      console.error(
        "UnionController.assignUnionToCreditOfficer error:",
        error
      );
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to reassign union",
      });
    }
  }

  static async exportUnions(req: Request, res: Response) {
    try {
      const creditOfficerId = req.query.creditOfficerId as string;
      const search = req.query.search as string;

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const unions = await UnionService.exportUnions(
        {
          creditOfficerId,
          search,
        },
        userRole,
        userId
      );

      res.json({
        success: true,
        data: unions,
      });
    } catch (error: any) {
      console.error("UnionController.exportUnions error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to export unions",
      });
    }
  }
}
