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
  await sql`BEGIN`;

  try {
    const id = crypto.randomUUID();
    // TODO: Let DB handle ID and timestamps
    const users = await sql`
      INSERT INTO users (id, username, avatar_url, created_at, updated_at)
      VALUES (${id}, ${username}, ${avatarUrl}, NOW(), NOW())
      RETURNING id, username, avatar_url as "avatarUrl", resource_limits as "resourceLimits", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const user = users[0];

    await sql`
      INSERT INTO external_users (id, external_id, provider, user_id)
      VALUES (${crypto.randomUUID()}, ${externalId}, 'github', ${user.id})
    `;

    await sql`COMMIT`;
    return user;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}
