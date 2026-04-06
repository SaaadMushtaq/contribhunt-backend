import { Router } from "express";
import {
  searchIssues,
  saveSearch,
  deleteSearch,
  trackIssue,
  updateIssueStatus,
} from "../controllers/issueController";
import { authenticateUser, optionalAuth } from "../middleware/authMiddleware";
import { searchLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/search", optionalAuth, searchLimiter, searchIssues);
router.post("/save-search", authenticateUser, saveSearch);
router.delete("/save-search/:id", authenticateUser, deleteSearch);
router.post("/track", authenticateUser, trackIssue);
router.put("/track/:id", authenticateUser, updateIssueStatus);

export default router;
