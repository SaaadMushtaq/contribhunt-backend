import { Router } from "express";
import { githubCallback, getMe, logout } from "../controllers/authController";
import { getAuthUrl } from "../controllers/githubController";
import { authenticateUser } from "../middleware/authMiddleware";

const router = Router();

router.get("/github/url", getAuthUrl);
router.get("/github/callback", githubCallback);
router.get("/me", authenticateUser, getMe);
router.post("/logout", logout);

export default router;
