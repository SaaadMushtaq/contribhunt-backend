import { Router } from "express";
import { detectSkills } from "../controllers/githubController";
import { authenticateUser } from "../middleware/authMiddleware";
import { githubApiLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/detect-skills", authenticateUser, githubApiLimiter, detectSkills);

export default router;
