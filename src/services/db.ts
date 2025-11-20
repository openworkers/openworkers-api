/**
 * Database service with specific functions using Bun.sql template literals
 */

import { SQL } from "bun";
import type { User, Worker } from "../types";

// Initialize DB connection
const sql = new SQL({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "openworkers",
  adapter: "postgres",
});

// Users
export async function findUserById(userId: string): Promise<User | null> {
  const users = await sql`
    SELECT id, username, avatar_url as "avatarUrl", resource_limits as "resourceLimits", created_at as "createdAt", updated_at as "updatedAt"
    FROM users
    WHERE id = ${userId}
  `;
  return users[0] || null;
}

export async function findUserByGitHub(
  externalId: string
): Promise<User | null> {
  const users = await sql`
    SELECT u.id, u.username, u.avatar_url as "avatarUrl", u.resource_limits as "resourceLimits", u.created_at as "createdAt", u.updated_at as "updatedAt"
    FROM users u
    INNER JOIN external_users eu ON u.id = eu.user_id
    WHERE eu.external_id = ${externalId} AND eu.provider = 'github'
  `;
  return users[0] || null;
}

export async function createUserWithGitHub(
  externalId: string,
  username: string,
  avatarUrl: string
): Promise<User> {
  await sql`BEGIN`;

  try {
    const users = await sql`
      INSERT INTO users (username, avatar_url)
      VALUES (${username}, ${avatarUrl})
      RETURNING id, username, avatar_url as "avatarUrl", resource_limits as "resourceLimits", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const user = users[0];

    await sql`
      INSERT INTO external_users (external_id, provider, user_id)
      VALUES (${externalId}, 'github', ${user.id})
    `;

    await sql`COMMIT`;
    return user;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}

// Workers
export async function findAllWorkers(userId: string): Promise<Worker[]> {
  return sql`
    SELECT id, name, script, language, user_id, environment_id, created_at, updated_at
    FROM workers
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
}

export async function findWorkerById(
  userId: string,
  workerId: string
): Promise<Worker | null> {
  const workers = await sql`
    SELECT id, name, script, language, user_id, environment_id, created_at, updated_at
    FROM workers
    WHERE id = ${workerId} AND user_id = ${userId}
  `;
  return workers[0] || null;
}

export async function createWorker(
  userId: string,
  name: string,
  script: string,
  language: "javascript" | "typescript",
  environmentId?: string
): Promise<Worker> {
  const workers = await sql`
    INSERT INTO workers (name, script, language, user_id, environment_id)
    VALUES (${name}, ${script}, ${language}, ${userId}, ${
    environmentId || null
  })
    RETURNING id, name, script, language, user_id, environment_id, created_at, updated_at
  `;
  return workers[0];
}

export async function updateWorker(
  userId: string,
  workerId: string,
  updates: {
    name?: string;
    script?: string;
    language?: "javascript" | "typescript";
    environment_id?: string;
  }
): Promise<Worker | null> {
  // Simple approach: always update all fields (use existing values if not provided)
  const current = await findWorkerById(userId, workerId);
  if (!current) {
    return null;
  }

  const workers = await sql`
    UPDATE workers
    SET
      name = ${updates.name ?? current.name},
      script = ${updates.script ?? current.script},
      language = ${updates.language ?? current.language},
      environment_id = ${updates.environment_id ?? current.environment_id},
      updated_at = NOW()
    WHERE id = ${workerId} AND user_id = ${userId}
    RETURNING id, name, script, language, user_id, environment_id, created_at, updated_at
  `;

  return workers[0] || null;
}

export async function deleteWorker(
  userId: string,
  workerId: string
): Promise<number> {
  const result = await sql`
    DELETE FROM workers
    WHERE id = ${workerId} AND user_id = ${userId}
  `;
  return result.count || 0;
}
