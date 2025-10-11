import { Router } from "express";
import { NotesController } from "../controllers/notes.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireStaff } from "../middlewares/role.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create note (All staff)
router.post("/", requireStaff, NotesController.createNote);

// Update note (All staff - can only update their own notes)
router.put("/:id", requireStaff, NotesController.updateNote);

// Delete note (All staff - can only delete their own notes)
router.delete("/:id", requireStaff, NotesController.deleteNote);

// Get all notes (All staff)
router.get("/", requireStaff, NotesController.getNotes);

// Get specific note (All staff)
router.get("/:id", requireStaff, NotesController.getNoteById);

// Get user notes (All staff)
router.get("/user/:userId", requireStaff, NotesController.getUserNotes);

// Get note categories (All staff)
router.get("/categories", requireStaff, NotesController.getNoteCategories);

// Get notes by category (All staff)
router.get(
  "/category/:category",
  requireStaff,
  NotesController.getNotesByCategory
);

export default router;
