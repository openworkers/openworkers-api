import { describe, test, expect } from 'bun:test';
import { kysely } from './kysely-client';
import { sql } from 'kysely';

describe('KV service - Kysely SQL generation', () => {
  test('findAllKvNamespaces - generates correct SQL with ORDER BY', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const query = kysely
      .selectFrom('kvConfigs')
      .select(['id', 'name', 'desc'])
      .where('userId', '=', sql<string>`${userId}::uuid`)
      .orderBy('createdAt', 'desc')
      .compile();

    expect(query.sql).toContain('where "user_id" = $1::uuid');
    expect(query.sql).toContain('order by "created_at" desc');
    expect(query.parameters).toEqual([userId]);
  });

  test('createKvNamespace - generates correct INSERT with ::uuid cast', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const name = 'my-kv';
    const desc = 'My KV store';

    const query = kysely
      .insertInto('kvConfigs')
      .values({
        userId: sql<string>`${userId}::uuid`,
        name,
        desc,
      })
      .returningAll()
      .compile();

    expect(query.sql).toContain('insert into "kv_configs"');
    expect(query.sql).toContain('values ($1::uuid, $2, $3)');
    expect(query.parameters).toEqual([userId, name, desc]);
  });

  test('updateKvNamespace - generates correct dynamic UPDATE', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const id = '456e4567-e89b-12d3-a456-426614174000';
    const name = 'updated-name';

    const query = kysely
      .updateTable('kvConfigs')
      .set({
        name,
        updatedAt: sql`now()`,
      })
      .where('userId', '=', sql<string>`${userId}::uuid`)
      .where('id', '=', sql<string>`${id}::uuid`)
      .returningAll()
      .compile();

    expect(query.sql).toContain('update "kv_configs"');
    expect(query.sql).toContain('set "name" = $1');
    expect(query.sql).toContain('where "user_id" = $2::uuid');
    expect(query.sql).toContain('and "id" = $3::uuid');
    expect(query.parameters).toEqual([name, userId, id]);
  });

  test('deleteKvNamespace - generates correct DELETE', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const id = '456e4567-e89b-12d3-a456-426614174000';

    const query = kysely
      .deleteFrom('kvConfigs')
      .where('userId', '=', sql<string>`${userId}::uuid`)
      .where('id', '=', sql<string>`${id}::uuid`)
      .returning('id')
      .compile();

    expect(query.sql).toContain('delete from "kv_configs"');
    expect(query.sql).toContain('where "user_id" = $1::uuid');
    expect(query.sql).toContain('and "id" = $2::uuid');
    expect(query.sql).toContain('returning "id"');
    expect(query.parameters).toEqual([userId, id]);
  });

  test('countKvNamespaces - generates correct COUNT with ::text cast', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const query = kysely
      .selectFrom('kvConfigs')
      .select(sql<string>`COUNT(*)::text`.as('count'))
      .where('userId', '=', sql<string>`${userId}::uuid`)
      .compile();

    expect(query.sql).toContain('select COUNT(*)::text as "count"');
    expect(query.sql).toContain('where "user_id" = $1::uuid');
    expect(query.parameters).toEqual([userId]);
  });

  test('putKvData - generates UPSERT with ::jsonb and ::timestamptz casts', () => {
    const namespaceId = '123e4567-e89b-12d3-a456-426614174000';
    const key = 'mykey';
    const value = { foo: 'bar' };
    const jsonValue = JSON.stringify(value);
    const expiresAt = new Date('2025-12-31T23:59:59Z').toISOString();

    const query = kysely
      .insertInto('kvData')
      .values({
        namespaceId: sql<string>`${namespaceId}::uuid`,
        key,
        value: sql`${jsonValue}::jsonb`,
        expiresAt: sql`${expiresAt}::timestamptz`,
      })
      .onConflict((oc) =>
        oc.columns(['namespaceId', 'key']).doUpdateSet({
          value: sql`${jsonValue}::jsonb`,
          expiresAt: sql`${expiresAt}::timestamptz`,
          updatedAt: sql`now()`,
        })
      )
      .returningAll()
      .compile();

    expect(query.sql).toContain('insert into "kv_data"');
    expect(query.sql).toContain('values ($1::uuid, $2, $3::jsonb, $4::timestamptz)');
    expect(query.sql).toContain('on conflict ("namespace_id", "key")');
    expect(query.sql).toContain('do update set');
    expect(query.sql).toContain('"value" = $5::jsonb');
    expect(query.sql).toContain('"expires_at" = $6::timestamptz');
    expect(query.parameters).toEqual([namespaceId, key, jsonValue, expiresAt, jsonValue, expiresAt]);
  });

  test('listKvData - generates SELECT with pagination and filters', () => {
    const namespaceId = '123e4567-e89b-12d3-a456-426614174000';
    const prefix = 'user:';
    const cursor = 'user:123';
    const limit = 10;

    const query = kysely
      .selectFrom('kvData')
      .selectAll()
      .where('namespaceId', '=', sql<string>`${namespaceId}::uuid`)
      .where((eb) => eb.or([eb('expiresAt', 'is', null), eb('expiresAt', '>', sql<Date>`now()`)]))
      .where('key', 'like', `${prefix}%`)
      .where('key', '>', cursor)
      .orderBy('key', 'asc')
      .limit(limit + 1)
      .compile();

    expect(query.sql).toContain('where "namespace_id" = $1::uuid');
    expect(query.sql).toContain('"expires_at" is null');
    expect(query.sql).toContain('or "expires_at" > now()');
    expect(query.sql).toContain('"key" like $2');
    expect(query.sql).toContain('"key" > $3');
    expect(query.sql).toContain('order by "key" asc');
    expect(query.sql).toContain('limit $4');
    expect(query.parameters).toEqual([namespaceId, `${prefix}%`, cursor, limit + 1]);
  });

  test('deleteKvData - generates correct DELETE', () => {
    const namespaceId = '123e4567-e89b-12d3-a456-426614174000';
    const key = 'mykey';

    const query = kysely
      .deleteFrom('kvData')
      .where('namespaceId', '=', sql<string>`${namespaceId}::uuid`)
      .where('key', '=', key)
      .returning('key')
      .compile();

    expect(query.sql).toContain('delete from "kv_data"');
    expect(query.sql).toContain('where "namespace_id" = $1::uuid');
    expect(query.sql).toContain('and "key" = $2');
    expect(query.sql).toContain('returning "key"');
    expect(query.parameters).toEqual([namespaceId, key]);
  });
});
