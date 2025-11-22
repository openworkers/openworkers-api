import { jwt } from "hono/jwt";
import type { JWTPayload } from "../types";
import { jwt as jwtConfig } from "../config";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    username: string;
    jwtPayload: JWTPayload;
  }
}

// Create JWT middleware with secret from config
export function createAuthMiddleware() {
  return jwt({
    secret: jwtConfig.access.secret,
    cookie: "access_token", // Also check cookie for token
  });
}

// Middleware to extract userId from JWT payload
export async function extractUser(c: any, next: any) {
  const payload = c.get("jwtPayload") as JWTPayload;
  if (!payload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", payload.sub);

  await next();
}
