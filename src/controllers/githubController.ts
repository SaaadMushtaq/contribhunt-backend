import { Request, Response } from "express";
import supabase from "../config/supabase";
import { AuthRequest } from "../types";
import * as githubService from "../services/githubService";
import { detectSkillsFromRepos } from "../services/skillDetectionService";

export async function detectSkills(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const user = req.user!;

  try {
    const repos = await githubService.getUserRepos(user.github_token);
    const skills = detectSkillsFromRepos(repos);

    await supabase
      .from("user_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("auto_detected", true);

    if (skills.length > 0) {
      const rows = skills.map((skill) => ({
        user_id: user.id,
        skill,
        auto_detected: true,
      }));
      await supabase.from("user_skills").insert(rows);

      await supabase.from("users").update({ skills }).eq("id", user.id);
    }

    res.json({ skills });
  } catch (err) {
    console.error("Skill detection error:", err);
    res.status(500).json({ error: "Failed to detect skills" });
  }
}

export function getAuthUrl(_req: Request, res: Response): void {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    res.status(500).json({ error: "GitHub OAuth is not configured" });
    return;
  }

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&scope=read:user,user:email,repo`;

  res.json({ url });
}
