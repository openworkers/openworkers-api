import { kysely } from './kysely-client';
import { sql } from 'kysely';
import { uuid, enumCast } from './kysely-helpers';
import type { ISelf } from '../../types';

const userSelect = [
  'users.id',
  'users.username',
  'users.avatarUrl',
  'users.limitWorkers',
  'users.limitEnvironments',
  'users.limitDatabases',
  'users.limitKv',
  'users.limitStorage',
  'users.secondPrecision'
] as const;

export async function findUserById(userId: string): Promise<ISelf | null> {
  const user = await kysely.selectFrom('users').select(userSelect).where('id', '=', uuid(userId)).executeTakeFirst();

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    limits: {
      workers: user.limitWorkers,
      environments: user.limitEnvironments,
      databases: user.limitDatabases,
      kv: user.limitKv,
      storage: user.limitStorage,
      secondPrecision: user.secondPrecision
    }
  };
}

export async function findUserByGitHub(externalId: string): Promise<ISelf | null> {
  const user = await kysely
    .selectFrom('users')
    .innerJoin('externalUsers as eu', 'users.id', 'eu.userId')
    .select(userSelect)
    .where('eu.externalId', '=', externalId)
    .where('eu.provider', '=', enumCast('github', 'enum_external_users_provider'))
    .executeTakeFirst();

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    limits: {
      workers: user.limitWorkers,
      environments: user.limitEnvironments,
      databases: user.limitDatabases,
      kv: user.limitKv,
      storage: user.limitStorage,
      secondPrecision: user.secondPrecision
    }
  };
}

export async function createUserWithGitHub(externalId: string, username: string, avatarUrl: string): Promise<ISelf> {
  const newUser = await kysely
    .insertInto('users')
    .values({
      username,
      avatarUrl
    })
    .returning(userSelect)
    .executeTakeFirstOrThrow();

  const user: ISelf = {
    id: newUser.id,
    username: newUser.username,
    avatarUrl: newUser.avatarUrl,
    limits: {
      workers: newUser.limitWorkers,
      environments: newUser.limitEnvironments,
      databases: newUser.limitDatabases,
      kv: newUser.limitKv,
      storage: newUser.limitStorage,
      secondPrecision: newUser.secondPrecision
    }
  };

  await kysely
    .insertInto('externalUsers')
    .values({
      externalId,
      provider: enumCast('github', 'enum_external_users_provider'),
      userId: uuid(user.id)
    })
    .execute();

  return user;
}

// ============================================================================
// Password Authentication (Email-first flow)
// ============================================================================

export async function findUserByEmail(email: string): Promise<ISelf | null> {
  const user = await kysely.selectFrom('users').select(userSelect).where('username', '=', email).executeTakeFirst();

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    limits: {
      workers: user.limitWorkers,
      environments: user.limitEnvironments,
      databases: user.limitDatabases,
      kv: user.limitKv,
      storage: user.limitStorage,
      secondPrecision: user.secondPrecision
    }
  };
}

export async function emailExists(email: string): Promise<boolean> {
  const result = await kysely
    .selectFrom('users')
    .select(sql<boolean>`EXISTS(SELECT 1 FROM users WHERE username = ${email})`.as('exists'))
    .executeTakeFirst();

  return result?.exists ?? false;
}

export async function getPasswordHash(email: string): Promise<string | null> {
  const result = await kysely
    .selectFrom('users')
    .select('passwordHash')
    .where('username', '=', email)
    .executeTakeFirst();

  return result?.passwordHash ?? null;
}

export async function createUserWithEmail(email: string): Promise<ISelf> {
  const user = await kysely
    .insertInto('users')
    .values({ username: email })
    .returning(userSelect)
    .executeTakeFirstOrThrow();

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    limits: {
      workers: user.limitWorkers,
      environments: user.limitEnvironments,
      databases: user.limitDatabases,
      kv: user.limitKv,
      storage: user.limitStorage,
      secondPrecision: user.secondPrecision
    }
  };
}

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  await kysely.updateTable('users').set({ passwordHash }).where('id', '=', uuid(userId)).execute();
}
