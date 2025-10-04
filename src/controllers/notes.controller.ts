import { Request, Response } from "express";
import { NotesService } from "../service/notes.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class NotesController {
  static async createNote(req: Request, res: Response) {
    try {
      const { userId, title, content, category, isPrivate } = req.body;
      const createdByUserId = req.user?.id;

      if (!createdByUserId) {
        return ApiResponseUtil.error(res, "User not authenticated", 401);
      }

      if (!userId || !title || !content) {
        return ApiResponseUtil.error(res, "Missing required fields", 400);
      }

      const note = await NotesService.createNote({
        userId,
        title,
        content,
        category,
        isPrivate,
        createdByUserId,
      });

      return ApiResponseUtil.success(res, note, "Note created successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async updateNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, content, category, isPrivate } = req.body;
      const updatedByUserId = req.user?.id;

      if (!updatedByUserId) {
        return ApiResponseUtil.error(res, "User not authenticated", 401);
      }

      const note = await NotesService.updateNote(id, {
        title,
        content,
        category,
        isPrivate,
      }, updatedByUserId);

      return ApiResponseUtil.success(res, note, "Note updated successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async deleteNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedByUserId = req.user?.id;

      if (!deletedByUserId) {
        return ApiResponseUtil.error(res, "User not authenticated", 401);
      }

      const result = await NotesService.deleteNote(id, deletedByUserId);

      return ApiResponseUtil.success(res, result, "Note deleted successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getNotes(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        category,
        isPrivate,
        createdByUserId,
        search,
      } = req.query;

      const filters = {
        page: Number(page),
        limit: Number(limit),
        userId: userId as string,
        category: category as string,
        isPrivate: isPrivate ? isPrivate === "true" : undefined,
        createdByUserId: createdByUserId as string,
        search: search as string,
      };

      const result = await NotesService.getNotes(filters);

      return ApiResponseUtil.success(res, result, "Notes fetched successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getNoteById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const note = await NotesService.getNoteById(id);

      return ApiResponseUtil.success(res, note, "Note fetched successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getUserNotes(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const viewerUserId = req.user?.id;

      if (!viewerUserId) {
        return ApiResponseUtil.error(res, "User not authenticated", 401);
      }

      const notes = await NotesService.getUserNotes(userId, viewerUserId);

      return ApiResponseUtil.success(res, notes, "User notes fetched successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getNoteCategories(req: Request, res: Response) {
    try {
      const categories = await NotesService.getNoteCategories();

      return ApiResponseUtil.success(res, categories, "Note categories fetched successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getNotesByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const {
        page = 1,
        limit = 10,
        userId,
        isPrivate,
        search,
      } = req.query;

      const filters = {
        page: Number(page),
        limit: Number(limit),
        userId: userId as string,
        isPrivate: isPrivate ? isPrivate === "true" : undefined,
        search: search as string,
      };

      const result = await NotesService.getNotesByCategory(category, filters);

      return ApiResponseUtil.success(res, result, "Notes by category fetched successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }
}
