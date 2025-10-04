import { Router } from "express";
import { NotesController } from "../controllers/notes.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create note (All authenticated users)
router.post("/", NotesController.createNote);

// Update note (All authenticated users - can only update their own notes)
router.put("/:id", NotesController.updateNote);

// Delete note (All authenticated users - can only delete their own notes)
router.delete("/:id", NotesController.deleteNote);

// Get all notes (All authenticated users)
router.get("/", NotesController.getNotes);

// Get specific note (All authenticated users)
router.get("/:id", NotesController.getNoteById);

// Get user notes (All authenticated users)
router.get("/user/:userId", NotesController.getUserNotes);

// Get note categories (All authenticated users)
router.get("/categories", NotesController.getNoteCategories);

// Get notes by category (All authenticated users)
router.get("/category/:category", NotesController.getNotesByCategory);

export default router;
