import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import supabase from "../config/supabase";
import { AuthRequest, User } from "../types";

interface JwtPayload {
  id: string;
}

async function resolveUser(token: string): Promise<User | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");

  const payload = jwt.verify(token, secret) as JwtPayload;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", payload.id)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function authenticateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const user = await resolveUser(token);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const user = await resolveUser(token);
    if (user) req.user = user;
  } catch {
    // ignore invalid tokens in optional mode
  }

  next();
}
