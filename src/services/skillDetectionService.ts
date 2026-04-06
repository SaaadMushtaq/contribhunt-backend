import { GitHubRepository } from "../types";

const LANGUAGE_TO_SKILL: Record<string, string> = {
  TypeScript: "TypeScript",
  JavaScript: "JavaScript",
  Python: "Python",
  Java: "Java",
  Ruby: "Ruby",
  Go: "Go",
  Rust: "Rust",
  "C#": "C#",
  "C++": "C++",
  C: "C",
  PHP: "PHP",
  Swift: "Swift",
  Kotlin: "Kotlin",
  Dart: "Dart",
  Scala: "Scala",
  Elixir: "Elixir",
  Haskell: "Haskell",
  Lua: "Lua",
  R: "R",
  Julia: "Julia",
  Clojure: "Clojure",
  Erlang: "Erlang",
  "F#": "F#",
  Shell: "Shell/Bash",
  Dockerfile: "Docker",
  HCL: "Terraform",
  Nix: "Nix",
  Vim: "Vim Script",
  HTML: "HTML",
  CSS: "CSS",
  SCSS: "SCSS",
  Sass: "Sass",
  Less: "Less",
  Vue: "Vue.js",
  Svelte: "Svelte",
  "Jupyter Notebook": "Jupyter / Data Science",
  CoffeeScript: "CoffeeScript",
  Groovy: "Groovy",
  MATLAB: "MATLAB",
  Perl: "Perl",
  Assembly: "Assembly",
  "Objective-C": "Objective-C",
  Zig: "Zig",
  Crystal: "Crystal",
  Nim: "Nim",
  OCaml: "OCaml",
};

const TOPIC_TO_SKILL: Record<string, string> = {
  react: "React",
  reactjs: "React",
  "react-native": "React Native",
  nextjs: "Next.js",
  "next-js": "Next.js",
  vue: "Vue.js",
  vuejs: "Vue.js",
  svelte: "Svelte",
  sveltekit: "SvelteKit",
  angular: "Angular",
  express: "Express.js",
  expressjs: "Express.js",
  fastify: "Fastify",
  nestjs: "NestJS",
  nodejs: "Node.js",
  "node-js": "Node.js",
  deno: "Deno",
  bun: "Bun",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  rails: "Ruby on Rails",
  "ruby-on-rails": "Ruby on Rails",
  laravel: "Laravel",
  spring: "Spring Boot",
  "spring-boot": "Spring Boot",
  graphql: "GraphQL",
  "rest-api": "REST API",
  grpc: "gRPC",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  redis: "Redis",
  sqlite: "SQLite",
  supabase: "Supabase",
  firebase: "Firebase",
  prisma: "Prisma",
  typeorm: "TypeORM",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  terraform: "Terraform",
  ansible: "Ansible",
  "github-actions": "GitHub Actions",
  ci: "CI/CD",
  cicd: "CI/CD",
  aws: "AWS",
  gcp: "Google Cloud",
  azure: "Azure",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  jest: "Jest",
  testing: "Testing",
  webpack: "Webpack",
  vite: "Vite",
  electron: "Electron",
  tauri: "Tauri",
  wasm: "WebAssembly",
  webassembly: "WebAssembly",
  "machine-learning": "Machine Learning",
  "deep-learning": "Deep Learning",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  langchain: "LangChain",
  llm: "LLM / AI",
  "open-ai": "OpenAI",
  openai: "OpenAI",
};

export function detectSkillsFromRepos(repos: GitHubRepository[]): string[] {
  const frequency = new Map<string, number>();

  function bump(skill: string): void {
    frequency.set(skill, (frequency.get(skill) ?? 0) + 1);
  }

  for (const repo of repos) {
    if (repo.language) {
      const mapped = LANGUAGE_TO_SKILL[repo.language];
      if (mapped) bump(mapped);
    }

    for (const topic of repo.topics) {
      const normalized = topic.toLowerCase().replace(/\s+/g, "-");
      const mapped = TOPIC_TO_SKILL[normalized];
      if (mapped) bump(mapped);
    }
  }

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([skill]) => skill);
}
