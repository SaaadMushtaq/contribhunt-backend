import { Request } from "express";

export type ExperienceLevel = "junior" | "mid" | "senior";

export interface User {
  id: string;
  github_id: string;
  username: string;
  avatar_url: string;
  email: string | null;
  github_token: string;
  skills: string[];
  experience_level: ExperienceLevel;
  created_at: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  topics: string[];
}

export interface GitHubIssue {
  id: number;
  title: string;
  body: string;
  html_url: string;
  state: string;
  labels: GitHubLabel[];
  repository: GitHubRepository;
  created_at: string;
  updated_at: string;
  comments: number;
  user: {
    login: string;
    avatar_url: string;
  };
}

export interface RankedIssue extends GitHubIssue {
  mergeabilityScore: number;
  difficultyScore: number;
  matchScore: number;
  estimatedTime: string;
  reasonsToApply: string[];
  reasonsToAvoid: string[];
}

export interface SearchParams {
  skills: string[];
  experienceLevel: ExperienceLevel;
  languages: string[];
  labels: string[];
  minStars: number;
  maxStars: number;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  params: SearchParams;
  created_at: string;
}

export interface ContributionHistory {
  id: string;
  user_id: string;
  issue_id: number;
  issue_title: string;
  issue_url: string;
  repo_name: string;
  status: "interested" | "in-progress" | "completed" | "abandoned";
  created_at: string;
  updated_at: string;
}

export interface AuthRequest extends Request {
  user?: User;
}
