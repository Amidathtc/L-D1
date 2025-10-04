import prisma from "../prismaClient";

interface CreateNoteData {
  userId: string;
  title: string;
  content: string;
  category?: string;
  isPrivate?: boolean;
  createdByUserId: string;
}

interface UpdateNoteData {
  title?: string;
  content?: string;
  category?: string;
  isPrivate?: boolean;
}

interface NoteFilters {
  page?: number;
  limit?: number;
  userId?: string;
  category?: string;
  isPrivate?: boolean;
  createdByUserId?: string;
  search?: string;
}

export class NotesService {
  static async createNote(data: CreateNoteData) {
    try {
      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Validate creator exists
      const creator = await prisma.user.findUnique({
        where: { id: data.createdByUserId },
      });

      if (!creator) {
        throw new Error("Creator not found");
      }

      const note = await prisma.userNote.create({
        data: {
          userId: data.userId,
          title: data.title,
          content: data.content,
          category: data.category || "general",
          isPrivate: data.isPrivate || false,
          createdByUserId: data.createdByUserId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return note;
    } catch (error: any) {
      throw new Error(error.message || "Failed to create note");
    }
  }

  static async updateNote(
    noteId: string,
    data: UpdateNoteData,
    updatedByUserId: string
  ) {
    try {
      const note = await prisma.userNote.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        throw new Error("Note not found");
      }

      // Check if user can update the note
      // Users can only update their own notes unless they're admin
      const updater = await prisma.user.findUnique({
        where: { id: updatedByUserId },
      });

      if (!updater) {
        throw new Error("Updater not found");
      }

      if (
        note.createdByUserId !== updatedByUserId &&
        updater.role !== "ADMIN"
      ) {
        throw new Error("You can only update your own notes");
      }

      const updatedNote = await prisma.userNote.update({
        where: { id: noteId },
        data: {
          title: data.title,
          content: data.content,
          category: data.category,
          isPrivate: data.isPrivate,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return updatedNote;
    } catch (error: any) {
      throw new Error(error.message || "Failed to update note");
    }
  }

  static async deleteNote(noteId: string, deletedByUserId: string) {
    try {
      const note = await prisma.userNote.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        throw new Error("Note not found");
      }

      // Check if user can delete the note
      const deleter = await prisma.user.findUnique({
        where: { id: deletedByUserId },
      });

      if (!deleter) {
        throw new Error("Deleter not found");
      }

      if (
        note.createdByUserId !== deletedByUserId &&
        deleter.role !== "ADMIN"
      ) {
        throw new Error("You can only delete your own notes");
      }

      await prisma.userNote.delete({
        where: { id: noteId },
      });

      return { success: true };
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete note");
    }
  }

  static async getNotes(filters: NoteFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.isPrivate !== undefined) {
        where.isPrivate = filters.isPrivate;
      }

      if (filters.createdByUserId) {
        where.createdByUserId = filters.createdByUserId;
      }

      if (filters.search) {
        where.OR = [
          {
            title: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
        ];
      }

      const [notes, total] = await Promise.all([
        prisma.userNote.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        prisma.userNote.count({ where }),
      ]);

      return {
        notes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch notes");
    }
  }

  static async getNoteById(noteId: string) {
    try {
      const note = await prisma.userNote.findUnique({
        where: { id: noteId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!note) {
        throw new Error("Note not found");
      }

      return note;
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch note");
    }
  }

  static async getUserNotes(userId: string, viewerUserId: string) {
    try {
      // Get viewer's role to determine what notes they can see
      const viewer = await prisma.user.findUnique({
        where: { id: viewerUserId },
        select: { role: true },
      });

      if (!viewer) {
        throw new Error("Viewer not found");
      }

      const where: any = {
        userId,
      };

      // Non-admin users can only see non-private notes or their own notes
      if (viewer.role !== "ADMIN") {
        where.OR = [{ isPrivate: false }, { createdByUserId: viewerUserId }];
      }

      const notes = await prisma.userNote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return notes;
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch user notes");
    }
  }

  static async getNoteCategories() {
    try {
      const categories = await prisma.userNote.findMany({
        select: { category: true },
        distinct: ["category"],
        where: {
          category: {
            not: null,
          },
        },
      });

      return categories.map((cat: any) => cat.category).filter(Boolean);
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch note categories");
    }
  }

  static async getNotesByCategory(category: string, filters: NoteFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {
        category,
      };

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.isPrivate !== undefined) {
        where.isPrivate = filters.isPrivate;
      }

      if (filters.search) {
        where.OR = [
          {
            title: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
        ];
      }

      const [notes, total] = await Promise.all([
        prisma.userNote.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        prisma.userNote.count({ where }),
      ]);

      return {
        notes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch notes by category");
    }
  }
}
