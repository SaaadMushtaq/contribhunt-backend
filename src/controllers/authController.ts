import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import supabase from "../config/supabase";
import { AuthRequest } from "../types";
import * as githubService from "../services/githubService";
import { detectSkillsFromRepos } from "../services/skillDetectionService";

export async function githubCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const code = req.query.code as string | undefined;
  const frontendUrl = process.env.FRONTEND_URL;
  const jwtSecret = process.env.JWT_SECRET;

  if (!code) {
    res.status(400).json({ error: "Missing code parameter" });
    return;
  }
  if (!jwtSecret) throw new Error("JWT_SECRET is not set");

  try {
    const githubToken = await githubService.exchangeCodeForToken(code);
    const githubUser = await githubService.getGitHubUser(githubToken);

    // Upsert user
    const { data: user, error: upsertError } = await supabase
      .from("users")
      .upsert(
        {
          github_id: String(githubUser.id),
          username: githubUser.login,
          avatar_url: githubUser.avatar_url,
          email: githubUser.email ?? null,
          github_token: githubToken,
        },
        { onConflict: "github_id" },
      )
      .select()
      .single();

    if (upsertError || !user) {
      console.error("Upsert error:", upsertError);
      res.status(500).json({ error: "Failed to save user" });
      return;
    }

    // Detect skills for new users (no existing user_skills rows)
    const { count } = await supabase
      .from("user_skills")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count === 0) {
      try {
        const repos = await githubService.getUserRepos(githubToken);
        const skills = detectSkillsFromRepos(repos);

        if (skills.length > 0) {
          const rows = skills.map((skill) => ({
            user_id: user.id,
            skill,
            auto_detected: true,
          }));
          await supabase.from("user_skills").insert(rows);

          // Mirror skills array on the users row
          await supabase.from("users").update({ skills }).eq("id", user.id);
        }
      } catch (skillErr) {
        console.error("Skill detection failed (non-fatal):", skillErr);
      }
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, avatar_url: user.avatar_url },
      jwtSecret,
      { expiresIn: "7d" },
    );

    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("GitHub callback error:", err);
    res.redirect(`${frontendUrl}/auth/callback?error=auth_failed`);
  }
}

export function getMe(req: AuthRequest, res: Response): void {
  res.json({ user: req.user });
}

export function logout(_req: Request, res: Response): void {
  res.json({ success: true, message: "Logged out successfully" });
}
