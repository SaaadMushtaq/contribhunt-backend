import axios from "axios";
import { GitHubIssue, RankedIssue, SearchParams } from "../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const BATCH_SIZE = 5;
const MAX_ISSUES = 20;

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

interface GroqIssueAnalysis {
  id: number;
  mergeabilityScore: number;
  difficultyScore: number;
  estimatedTime: string;
  reasonsToApply: string[];
  reasonsToAvoid: string[];
}

function computeMatchScore(issue: GitHubIssue, params: SearchParams): number {
  let score = 50;

  const repoLanguage = issue.repository?.language?.toLowerCase() ?? "";
  const userSkillsLower = params.skills.map((s) => s.toLowerCase());

  if (repoLanguage && userSkillsLower.includes(repoLanguage)) {
    score += 20;
  }

  if (issue.repository?.description) {
    score += 15;
  }

  const labelNames = issue.labels.map((l) => l.name.toLowerCase());
  if (labelNames.includes("good first issue")) {
    score += 10;
  }

  if (issue.comments < 3) {
    score += 10;
  }

  const stars = issue.repository?.stargazers_count ?? 0;
  if (stars >= 100 && stars <= 10000) {
    score += 15;
  }

  const ageMs = Date.now() - new Date(issue.created_at).getTime();
  if (ageMs > SIX_MONTHS_MS) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function buildPrompt(issues: GitHubIssue[], params: SearchParams): string {
  const issuesSummary = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    body: issue.body?.slice(0, 400) ?? "",
    labels: issue.labels.map((l) => l.name),
    repo: issue.repository?.full_name ?? "",
    repo_description: issue.repository?.description ?? "",
    repo_stars: issue.repository?.stargazers_count ?? 0,
    repo_language: issue.repository?.language ?? "",
    comments: issue.comments,
    created_at: issue.created_at,
  }));

  return JSON.stringify({
    developer: {
      skills: params.skills,
      experience_level: params.experienceLevel,
    },
    issues: issuesSummary,
  });
}

async function analyzeWithGroq(
  issues: GitHubIssue[],
  params: SearchParams,
): Promise<GroqIssueAnalysis[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an open source contribution advisor. Given a list of GitHub issues " +
            "and a developer's skill level and skills, analyze each issue and return a " +
            "JSON array with for each issue:\n" +
            "{ \n" +
            "  id: number,\n" +
            "  mergeabilityScore: 0-100 (how likely a PR will get merged based on repo activity),\n" +
            "  difficultyScore: 0-100 (how hard is this issue),\n" +
            "  estimatedTime: string (e.g '2-4 hours', '1-2 days'),\n" +
            "  reasonsToApply: string[] (max 3, specific reasons this matches the developer),\n" +
            "  reasonsToAvoid: string[] (max 2, honest reasons this might be hard)\n" +
            "}\n" +
            "Return ONLY a valid JSON array. No explanation. No markdown.",
        },
        {
          role: "user",
          content: buildPrompt(issues, params),
        },
      ],
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const content: string = response.data.choices[0].message.content.trim();

  // Strip markdown code fences if the model wraps output in them
  const jsonText = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(jsonText) as GroqIssueAnalysis[];
}

export async function rankIssues(
  issues: GitHubIssue[],
  params: SearchParams,
): Promise<RankedIssue[]> {
  const limited = issues.slice(0, MAX_ISSUES);

  const matchScores = new Map<number, number>(
    limited.map((issue) => [issue.id, computeMatchScore(issue, params)]),
  );

  const groqResults = new Map<number, GroqIssueAnalysis>();

  for (let i = 0; i < limited.length; i += BATCH_SIZE) {
    const batch = limited.slice(i, i + BATCH_SIZE);
    try {
      const analyses = await analyzeWithGroq(batch, params);
      for (const analysis of analyses) {
        groqResults.set(analysis.id, analysis);
      }
    } catch (err) {
      console.error(`Groq batch ${i / BATCH_SIZE + 1} failed:`, err);
      for (const issue of batch) {
        groqResults.set(issue.id, {
          id: issue.id,
          mergeabilityScore: 50,
          difficultyScore: 50,
          estimatedTime: "Unknown",
          reasonsToApply: [],
          reasonsToAvoid: [],
        });
      }
    }
  }

  const ranked: RankedIssue[] = limited.map((issue): RankedIssue => {
    const groq = groqResults.get(issue.id) ?? {
      id: issue.id,
      mergeabilityScore: 50,
      difficultyScore: 50,
      estimatedTime: "Unknown",
      reasonsToApply: [],
      reasonsToAvoid: [],
    };

    const matchScore = matchScores.get(issue.id) ?? 50;

    return {
      ...issue,
      matchScore,
      mergeabilityScore: groq.mergeabilityScore,
      difficultyScore: groq.difficultyScore,
      estimatedTime: groq.estimatedTime,
      reasonsToApply: groq.reasonsToApply,
      reasonsToAvoid: groq.reasonsToAvoid,
    };
  });

  return ranked.sort(
    (a, b) =>
      b.matchScore + b.mergeabilityScore - (a.matchScore + a.mergeabilityScore),
  );
}
