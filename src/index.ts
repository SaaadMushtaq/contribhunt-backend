import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";

import { testConnection } from "./config/db";
import { generalLimiter } from "./middleware/rateLimiter";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import issueRoutes from "./routes/issueRoutes";
import githubRoutes from "./routes/githubRoutes";

const app = express();
const PORT = process.env.PORT ?? 5000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors()); // handle preflight for all routes
app.use(helmet());
app.use(express.json());
app.use(generalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/github", githubRoutes);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal server error" });
  } else {
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`ContribHunt API running on port ${PORT}`);
  });
})();
