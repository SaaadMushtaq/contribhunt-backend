import { Router } from "express";
import {
  getDashboard,
  updateSkills,
  updateExperienceLevel,
} from "../controllers/userController";
import { authenticateUser } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateUser);

router.get("/dashboard", getDashboard);
router.put("/skills", updateSkills);
router.put("/experience", updateExperienceLevel);

export default router;
