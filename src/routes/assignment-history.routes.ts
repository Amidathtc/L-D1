import { Router } from "express";
import { AssignmentHistoryController } from "../controllers/assignment-history.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// Get assignment history
router.get("/", authenticate, AssignmentHistoryController.getAssignmentHistory);

export default router;
