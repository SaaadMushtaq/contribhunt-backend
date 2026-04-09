import { Response } from "express";
import supabase from "../config/supabase";
import { AuthRequest } from "../types";

export async function updateSkills(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const skills: string[] = req.body.skills;

  if (!Array.isArray(skills)) {
    res.status(400).json({ error: "skills must be an array" });
    return;
  }

  const { error: deleteError } = await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", userId)
    .eq("auto_detected", true);

  if (deleteError) {
    res.status(500).json({ error: "Failed to update skills" });
    return;
  }

  if (skills.length > 0) {
    const rows = skills.map((skill) => ({
      user_id: userId,
      skill,
      auto_detected: true,
    }));

    const { error: insertError } = await supabase
      .from("user_skills")
      .insert(rows);
    if (insertError) {
      res.status(500).json({ error: "Failed to save skills" });
      return;
    }
  }

  await supabase.from("users").update({ skills }).eq("id", userId);

  res.json({ skills });
}

export async function updateExperienceLevel(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const { experienceLevel } = req.body;

  const valid = ["junior", "mid", "senior"];
  if (!valid.includes(experienceLevel)) {
    res
      .status(400)
      .json({ error: "experienceLevel must be junior, mid, or senior" });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .update({ experience_level: experienceLevel })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to update experience level" });
    return;
  }

  res.json({ user: data });
}

export async function getDashboard(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;

  const [
    savedSearchesResult,
    historyResult,
    skillsResult,
    completedResult,
    inProgressResult,
  ] = await Promise.all([
    supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("contribution_history")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase.from("user_skills").select("*").eq("user_id", userId),
    supabase
      .from("contribution_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("contribution_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "in-progress"),
  ]);

  res.json({
    savedSearches: savedSearchesResult.data ?? [],
    contributionHistory: historyResult.data ?? [],
    skills: skillsResult.data ?? [],
    stats: {
      completed: completedResult.count ?? 0,
      inProgress: inProgressResult.count ?? 0,
    },
  });
}
