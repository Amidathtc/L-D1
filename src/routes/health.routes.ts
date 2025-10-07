import { Router } from "express";
import { HealthController } from "../controllers/health.controller";

const router = Router();

// Health check endpoints (no authentication required for keepalive)
router.get("/health", HealthController.healthCheck);
router.get("/ping", HealthController.ping);

export default router;
