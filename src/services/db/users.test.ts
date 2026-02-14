import { describe, test, expect } from 'bun:test';
import { kysely } from './kysely-client';
import { sql } from 'kysely';

describe('Users service - Kysely SQL generation', () => {
  test('findUserById - generates correct SQL with ::uuid cast', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const query = kysely
      .selectFrom('users')
      .select(['id', 'username', 'avatarUrl', 'limitWorkers', 'limitEnvironments', 'limitDatabases', 'limitKv', 'limitStorage', 'secondPrecision'])
      .where('id', '=', sql<string>`${userId}::uuid`)
      .compile();

    expect(query.sql).toContain('::uuid');
    expect(query.sql).toContain('where "id" = $1::uuid');
    expect(query.parameters).toEqual([userId]);
  });

  test('findUserByGitHub - generates correct SQL with JOIN', () => {
    const externalId = 'github123';

    const query = kysely
      .selectFrom('users as u')
      .innerJoin('externalUsers as eu', 'u.id', 'eu.userId')
      .select(['u.id', 'u.username'])
      .where('eu.externalId', '=', externalId)
      .where('eu.provider', '=', 'github')
      .compile();

    expect(query.sql).toContain('inner join');
    expect(query.sql).toContain('"external_users"');
    expect(query.sql).toContain('"eu"."external_id" = $1');
    expect(query.sql).toContain('"eu"."provider" = $2');
    expect(query.parameters).toEqual([externalId, 'github']);
  });

  test('createUserWithEmail - generates correct INSERT', () => {
    const email = 'test@example.com';

    const query = kysely
      .insertInto('users')
      .values({ username: email })
      .returningAll()
      .compile();

    expect(query.sql).toContain('insert into "users"');
    expect(query.sql).toContain('("username")');
    expect(query.sql).toContain('values ($1)');
    expect(query.sql).toContain('returning *');
    expect(query.parameters).toEqual([email]);
  });

  test('updatePassword - generates correct UPDATE with ::uuid cast', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const passwordHash = 'hash123';

    const query = kysely
      .updateTable('users')
      .set({ passwordHash })
      .where('id', '=', sql<string>`${userId}::uuid`)
      .compile();

    expect(query.sql).toContain('update "users"');
    expect(query.sql).toContain('set "password_hash" = $1');
    expect(query.sql).toContain('where "id" = $2::uuid');
    expect(query.parameters).toEqual([passwordHash, userId]);
  });

  test('createUserWithGitHub - INSERT with ::uuid cast for externalUsers', () => {
    const externalId = 'github123';
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const query = kysely
      .insertInto('externalUsers')
      .values({
        externalId,
        provider: 'github',
        userId: sql<string>`${userId}::uuid`,
      })
      .compile();

    expect(query.sql).toContain('insert into "external_users"');
    expect(query.sql).toContain('values ($1, $2, $3::uuid)');
    expect(query.parameters).toEqual([externalId, 'github', userId]);
  });
});
