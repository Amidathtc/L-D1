import { Request, Response } from "express";
import { UnionMemberService } from "../service/union-member.service";

export class UnionMemberController {
  static async checkEmailUnique(req: Request, res: Response) {
    try {
      const email = (req.query.email as string)?.toLowerCase().trim();
      if (!email) {
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });
      }
      const exists = await UnionMemberService.emailExists(email);
      res.json({
        success: !exists,
        message: exists ? "Email already exists" : "Email is unique",
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Error checking email",
        });
    }
  }
  static async createUnionMember(req: Request, res: Response) {
    try {
      const {
        firstName,
        lastName,
        phone,
        email,
        address,
        dateOfBirth,
        gender,
        maritalStatus,
        profession,
        company,
        city,
        state,
        country,
        zipCode,
        note,
        unionId,
        currentOfficerId,
      } = req.body;

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!firstName || !lastName || !unionId) {
        return res.status(400).json({
          success: false,
          message: "firstName, lastName, and unionId are required",
        });
      }

      const member = await UnionMemberService.createUnionMember(
        {
          firstName,
          lastName,
          phone,
          email,
          address,
          dateOfBirth,
          gender,
          maritalStatus,
          profession,
          company,
          city,
          state,
          country,
          zipCode,
          note,
          unionId,
          currentOfficerId,
        },
        userId,
        userRole
      );

      res.status(201).json({
        success: true,
        message: "Union member created successfully",
        data: member,
      });
    } catch (error: any) {
      console.error("UnionMemberController.createUnionMember error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create union member",
      });
    }
  }

  static async getUnionMembers(req: Request, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const unionId = req.query.unionId as string;
      const currentOfficerId = req.query.currentOfficerId as string;
      const search = req.query.search as string;

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await UnionMemberService.getUnionMembers(
        {
          page,
          limit,
          unionId,
          currentOfficerId,
          search,
        },
        userRole,
        userId
      );

      res.json({
        success: true,
        data: result.members,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error: any) {
      console.error("UnionMemberController.getUnionMembers error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch union members",
      });
    }
  }

  static async getUnionMemberById(req: Request, res: Response) {
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

      const member = await UnionMemberService.getUnionMemberById(
        id,
        userRole,
        userId
      );

      res.json({
        success: true,
        data: member,
      });
    } catch (error: any) {
      console.error("UnionMemberController.getUnionMemberById error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to fetch union member",
      });
    }
  }

  static async updateUnionMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        phone,
        email,
        address,
        dateOfBirth,
        gender,
        maritalStatus,
        profession,
        company,
        city,
        state,
        country,
        zipCode,
        note,
        unionId,
        currentOfficerId,
      } = req.body;

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const member = await UnionMemberService.updateUnionMember(
        id,
        {
          firstName,
          lastName,
          phone,
          email,
          address,
          dateOfBirth,
          gender,
          maritalStatus,
          profession,
          company,
          city,
          state,
          country,
          zipCode,
          note,
          unionId,
          currentOfficerId,
        },
        userId,
        userRole
      );

      res.json({
        success: true,
        message: "Union member updated successfully",
        data: member,
      });
    } catch (error: any) {
      console.error("UnionMemberController.updateUnionMember error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update union member",
      });
    }
  }

  static async deleteUnionMember(req: Request, res: Response) {
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

      await UnionMemberService.deleteUnionMember(id, userId, userRole);

      res.json({
        success: true,
        message: "Union member deleted successfully",
      });
    } catch (error: any) {
      console.error("UnionMemberController.deleteUnionMember error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to delete union member",
      });
    }
  }

  static async reassignUnionMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { newUnionId, reason } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!newUnionId) {
        return res.status(400).json({
          success: false,
          message: "newUnionId is required",
        });
      }

      const member = await UnionMemberService.reassignUnionMember(
        id,
        { newUnionId, reason },
        userId,
        userRole
      );

      res.json({
        success: true,
        message: "Union member reassigned successfully",
        data: member,
      });
    } catch (error: any) {
      console.error("UnionMemberController.reassignUnionMember error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to reassign union member",
      });
    }
  }

  static async exportUnionMembers(req: Request, res: Response) {
    try {
      const unionId = req.query.unionId as string;
      const currentOfficerId = req.query.currentOfficerId as string;
      const search = req.query.search as string;

      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const members = await UnionMemberService.exportUnionMembers(
        {
          unionId,
          currentOfficerId,
          search,
        },
        userRole,
        userId
      );

      res.json({
        success: true,
        data: members,
      });
    } catch (error: any) {
      console.error("UnionMemberController.exportUnionMembers error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to export union members",
      });
    }
  }
}
