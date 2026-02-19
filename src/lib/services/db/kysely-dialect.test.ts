import { describe, test, expect } from 'bun:test';
import { Kysely } from 'kysely';
import { SqlClientDialect } from './kysely-dialect';
import type { Database } from './kysely-client';
import type { PostgateSqlClient } from './sql-client';

describe('SQL Client Dialect', () => {
  // Mock SQL client that doesn't actually execute queries
  const mockSqlClient: PostgateSqlClient = async () => {
    return [] as any;
  };

  const db = new Kysely<Database>({
    dialect: new SqlClientDialect({ client: mockSqlClient })
  });

  test('creates dialect with PostgresAdapter', () => {
    const dialect = new SqlClientDialect({ client: mockSqlClient });

    expect(dialect.createAdapter()).toBeDefined();
    expect(dialect.createDriver()).toBeDefined();
    expect(dialect.createQueryCompiler()).toBeDefined();
  });

  test('compiles simple SELECT query', () => {
    const query = db.selectFrom('users').selectAll();
    const compiled = query.compile();

    expect(compiled.sql).toBe('select * from "users"');
    expect(compiled.parameters).toEqual([]);
  });

  test('compiles SELECT with WHERE', () => {
    const query = db.selectFrom('users').selectAll().where('email', '=', 'test@example.com');

    const compiled = query.compile();

    expect(compiled.sql).toContain('where');
    expect(compiled.sql).toContain('"email" = $1');
    expect(compiled.parameters).toEqual(['test@example.com']);
  });

  test('compiles INSERT query', () => {
    const query = db.insertInto('users').values({
      username: 'testuser',
      email: 'test@example.com'
    });

    const compiled = query.compile();

    expect(compiled.sql).toContain('insert into "users"');
    expect(compiled.sql).toContain('("username", "email")');
    expect(compiled.sql).toContain('values ($1, $2)');
    expect(compiled.parameters).toEqual(['testuser', 'test@example.com']);
  });

  test('compiles UPDATE query', () => {
    const query = db.updateTable('users').set({ email: 'new@example.com' }).where('id', '=', '123');

    const compiled = query.compile();

    expect(compiled.sql).toContain('update "users"');
    expect(compiled.sql).toContain('set "email" = $1');
    expect(compiled.sql).toContain('where "id" = $2');
    expect(compiled.parameters).toEqual(['new@example.com', '123']);
  });

  test('compiles DELETE query', () => {
    const query = db.deleteFrom('users').where('id', '=', '123');

    const compiled = query.compile();

    expect(compiled.sql).toContain('delete from "users"');
    expect(compiled.sql).toContain('where "id" = $1');
    expect(compiled.parameters).toEqual(['123']);
  });

  test('transactions throw error (not supported)', async () => {
    await expect(
      db.transaction().execute(async (trx) => {
        await trx.selectFrom('users').selectAll().execute();
      })
    ).rejects.toThrow('Transactions not supported');
  });

  test('compiles JOIN query', () => {
    const query = db
      .selectFrom('users')
      .innerJoin('externalUsers', 'users.id', 'externalUsers.userId')
      .select(['users.id', 'users.username', 'externalUsers.provider']);

    const compiled = query.compile();

    expect(compiled.sql).toContain('inner join "externalUsers"');
    expect(compiled.sql).toContain('on "users"."id" = "externalUsers"."userId"');
  });

  test('compiles aggregate query', () => {
    const query = db
      .selectFrom('users')
      .select((eb) => [eb.fn.count('id').as('total'), eb.fn.max('createdAt').as('latest')]);

    const compiled = query.compile();

    expect(compiled.sql).toContain('count("id")');
    expect(compiled.sql).toContain('max("createdAt")');
  });
});
