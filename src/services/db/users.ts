import { sql } from './client';
import type { ISelf, IResourceLimits } from '../../types';

// Helper to build limits object from flat columns
interface UserRow {
  id: string;
  username: string;
  avatarUrl: string | null;
  limitWorkers: number;
  limitEnvironments: number;
  limitDatabases: number;
  limitKv: number;
  limitStorage: number;
  secondPrecision: boolean;
}

function rowToUser(row: UserRow): ISelf {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    limits: {
      workers: row.limitWorkers,
      environments: row.limitEnvironments,
      databases: row.limitDatabases,
      kv: row.limitKv,
      storage: row.limitStorage,
      secondPrecision: row.secondPrecision
    }
  };
}

const USER_SELECT = `
  id,
  username,
  avatar_url as "avatarUrl",
  limit_workers as "limitWorkers",
  limit_environments as "limitEnvironments",
  limit_databases as "limitDatabases",
  limit_kv as "limitKv",
  limit_storage as "limitStorage",
  second_precision as "secondPrecision"
`;

export async function findUserById(userId: string): Promise<ISelf | null> {
  const users = await sql<UserRow>(
    `SELECT ${USER_SELECT}
    FROM users
    WHERE id = $1::uuid`,
    [userId]
  );

  return users[0] ? rowToUser(users[0]) : null;
}

export async function findUserByGitHub(externalId: string): Promise<ISelf | null> {
  const users = await sql<UserRow>(
    `SELECT
      u.id,
      u.username,
      u.avatar_url as "avatarUrl",
      u.limit_workers as "limitWorkers",
      u.limit_environments as "limitEnvironments",
      u.limit_databases as "limitDatabases",
      u.limit_kv as "limitKv",
      u.limit_storage as "limitStorage",
      u.second_precision as "secondPrecision"
    FROM users u
    INNER JOIN external_users eu ON u.id = eu.user_id
    WHERE eu.external_id = $1 AND eu.provider = 'github'`,
    [externalId]
  );

  return users[0] ? rowToUser(users[0]) : null;
}

export async function createUserWithGitHub(externalId: string, username: string, avatarUrl: string): Promise<ISelf> {
  // Create user (DB auto-generates id, created_at, updated_at)
  const users = await sql<UserRow>(
    `INSERT INTO users (username, avatar_url)
    VALUES ($1, $2)
    RETURNING ${USER_SELECT}`,
    [username, avatarUrl]
  );

  const user = rowToUser(users[0]!);

  // Link GitHub account (DB auto-generates created_at, updated_at)
  await sql(
    `INSERT INTO external_users (external_id, provider, user_id)
    VALUES ($1, 'github', $2::uuid)`,
    [externalId, user.id]
  );

  return user;
}
