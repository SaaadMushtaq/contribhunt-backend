import axios from "axios";
import { GitHubIssue, GitHubRepository, SearchParams } from "../types";

const GITHUB_API = "https://api.github.com";
const CONTRIBUTION_LABELS = [
  "good first issue",
  "help wanted",
  "beginner friendly",
  "easy",
  "starter",
  "first-timers-only",
];

function buildAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function buildSearchQuery(params: SearchParams): string {
  const labelQuery = CONTRIBUTION_LABELS.map((l) => `label:"${l}"`).join(" ");
  const parts: string[] = [`(${labelQuery})`, "is:issue", "is:open"];

  if (params.languages.length > 0) {
    parts.push(params.languages.map((l) => `language:${l}`).join(" "));
  }

  if (params.minStars > 0 || params.maxStars > 0) {
    const min = params.minStars || 0;
    const max = params.maxStars || "*";
    parts.push(`stars:${min}..${max}`);
  }

  if (params.labels.length > 0) {
    parts.push(params.labels.map((l) => `label:"${l}"`).join(" "));
  }

  return parts.join(" ");
}

export async function searchIssues(
  params: SearchParams,
  token?: string,
): Promise<GitHubIssue[]> {
  const q = buildSearchQuery(params);
  const response = await axios.get(`${GITHUB_API}/search/issues`, {
    headers: buildAuthHeaders(token),
    params: { q, per_page: 100, sort: "updated", order: "desc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.data.items.map(
    (item: any): GitHubIssue => ({
      id: item.id,
      title: item.title,
      body: item.body ?? "",
      html_url: item.html_url,
      state: item.state,
      labels: item.labels ?? [],
      repository: item.repository ?? {
        id: 0,
        name: "",
        full_name: item.repository_url?.split("/").slice(-2).join("/") ?? "",
        description: null,
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        html_url: "",
        topics: [],
      },
      created_at: item.created_at,
      updated_at: item.updated_at,
      comments: item.comments,
      user: { login: item.user.login, avatar_url: item.user.avatar_url },
    }),
  );
}

export async function getUserRepos(token: string): Promise<GitHubRepository[]> {
  const response = await axios.get(`${GITHUB_API}/user/repos`, {
    headers: buildAuthHeaders(token),
    params: {
      sort: "updated",
      direction: "desc",
      per_page: 100,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.data.map(
    (repo: any): GitHubRepository => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      html_url: repo.html_url,
      topics: repo.topics ?? [],
    }),
  );
}

export async function getRepoLanguages(
  token: string,
  repoFullName: string,
): Promise<string[]> {
  const response = await axios.get(
    `${GITHUB_API}/repos/${repoFullName}/languages`,
    { headers: buildAuthHeaders(token) },
  );
  return Object.keys(response.data);
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET");
  }

  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    { client_id: clientId, client_secret: clientSecret, code },
    { headers: { Accept: "application/json" } },
  );

  const accessToken: string = response.data.access_token;
  if (!accessToken) {
    throw new Error(
      response.data.error_description ?? "Failed to exchange code for token",
    );
  }
  return accessToken;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getGitHubUser(token: string): Promise<any> {
  const response = await axios.get(`${GITHUB_API}/user`, {
    headers: buildAuthHeaders(token),
  });
  return response.data;
}
