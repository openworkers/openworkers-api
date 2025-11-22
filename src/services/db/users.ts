import { sql } from "./client";
import type { ISelf } from "../../types";

export async function findUserById(userId: string): Promise<ISelf | null> {
  const users = await sql`
    SELECT id, username, avatar_url as "avatarUrl", resource_limits as "resourceLimits", created_at as "createdAt", updated_at as "updatedAt"
    FROM users
    WHERE id = ${userId}
  `;
  return users[0] || null;
}

export async function findUserByGitHub(
  externalId: string
): Promise<ISelf | null> {
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
): Promise<ISelf> {
  return await sql.begin(async (tx) => {
    // Create user (DB auto-generates id, created_at, updated_at)
    const users = await tx`
      INSERT INTO users (username, avatar_url)
      VALUES (${username}, ${avatarUrl})
      RETURNING id, username, avatar_url as "avatarUrl", resource_limits as "resourceLimits", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const user = users[0];

    // Link GitHub account (DB auto-generates created_at, updated_at)
    await tx`
      INSERT INTO external_users (external_id, provider, user_id)
      VALUES (${externalId}, 'github', ${user.id})
    `;

    return user;
  });
}
