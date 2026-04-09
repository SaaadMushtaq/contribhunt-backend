import { Response } from "express";
import supabase from "../config/supabase";
import { AuthRequest, SearchParams } from "../types";
import * as githubService from "../services/githubService";
import { rankIssues } from "../services/issueRankingService";

export async function searchIssues(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const params: SearchParams = req.body;

  try {
    const token = req.user?.github_token;
    const issues = await githubService.searchIssues(params, token);
    const ranked = await rankIssues(issues, params);

    if (req.user) {
      const name = `Auto: ${new Date().toISOString()}`;
      await supabase.from("saved_searches").insert({
        user_id: req.user.id,
        name,
        params,
      });
    }

    res.json({ issues: ranked });
  } catch (err) {
    console.error("Search issues error:", err);
    res.status(500).json({ error: "Failed to search issues" });
  }
}

export async function saveSearch(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const { name, params } = req.body as { name: string; params: SearchParams };

  if (!name || !params) {
    res.status(400).json({ error: "name and params are required" });
    return;
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({ user_id: userId, name, params })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to save search" });
    return;
  }

  res.status(201).json({ savedSearch: data });
}

export async function deleteSearch(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    res.status(500).json({ error: "Failed to delete saved search" });
    return;
  }

  res.json({ success: true });
}

export async function trackIssue(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const {
    issue_id,
    issue_title,
    issue_url,
    repo_name,
    repo_url,
    language,
    status,
  } = req.body;

  if (!issue_id || !issue_title || !issue_url || !repo_name || !repo_url) {
    res.status(400).json({
      error:
        "issue_id, issue_title, issue_url, repo_name, and repo_url are required",
    });
    return;
  }

  const { data, error } = await supabase
    .from("contribution_history")
    .upsert(
      {
        user_id: userId,
        issue_id,
        issue_title,
        issue_url,
        repo_name,
        repo_url,
        language: language ?? null,
        status: status ?? "interested",
      },
      { onConflict: "user_id,issue_id" },
    )
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to track issue" });
    return;
  }

  res.status(201).json({ contribution: data });
}

export async function updateIssueStatus(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["interested", "in-progress", "completed", "abandoned"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  const { data, error } = await supabase
    .from("contribution_history")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    res
      .status(404)
      .json({ error: "Contribution record not found or access denied" });
    return;
  }

  res.json({ contribution: data });
}
