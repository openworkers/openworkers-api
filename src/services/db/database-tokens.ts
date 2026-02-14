import { kysely } from './kysely-client';
import { uuid, enumArray, now } from './kysely-helpers';
import { sql } from 'kysely';
import { postgate } from '../../config';
import type { DatabaseOperation } from '../../types/schemas/database-token.schema';

const SYSTEM_TOKEN_NAME = '__system__';
const ALL_OPERATIONS: DatabaseOperation[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];

export interface DatabaseToken {
  id: string;
  databaseId: string;
  name: string;
  tokenPrefix: string;
  allowedOperations: DatabaseOperation[];
  lastUsedAt: Date | null;
  createdAt: Date;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `pg_${random}`;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createDatabaseToken(
  databaseId: string,
  name: string,
  allowedOperations: DatabaseOperation[]
): Promise<{ token: DatabaseToken; fullToken: string }> {
  const fullToken = generateToken();
  const tokenPrefix = fullToken.substring(0, 8);
  const tokenHash = await hashToken(fullToken);

  const token = await kysely
    .insertInto('databaseTokens')
    .values({
      databaseId: uuid(databaseId),
      name,
      tokenHash,
      tokenPrefix,
      allowedOperations: enumArray(allowedOperations, 'database_operation'),
    })
    .returning(['id', 'databaseId', 'name', 'tokenPrefix', 'allowedOperations', 'lastUsedAt', 'createdAt'])
    .executeTakeFirstOrThrow();

  return {
    token,
    fullToken,
  };
}

export async function listDatabaseTokens(databaseId: string): Promise<DatabaseToken[]> {
  return kysely
    .selectFrom('databaseTokens')
    .select(['id', 'databaseId', 'name', 'tokenPrefix', 'allowedOperations', 'lastUsedAt', 'createdAt'])
    .where('databaseId', '=', uuid(databaseId))
    .orderBy('createdAt', 'desc')
    .execute();
}

export async function deleteDatabaseToken(databaseId: string, tokenId: string): Promise<boolean> {
  const result = await kysely
    .deleteFrom('databaseTokens')
    .where('id', '=', uuid(tokenId))
    .where('databaseId', '=', uuid(databaseId))
    .returning('id')
    .execute();

  return result.length > 0;
}

export async function updateTokenLastUsed(tokenId: string): Promise<void> {
  await kysely.updateTable('databaseTokens').set({ lastUsedAt: now() }).where('id', '=', uuid(tokenId)).execute();
}

async function generateSystemToken(databaseId: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(postgate.systemTokenSecret);
  const message = encoder.encode(`system_token:${databaseId}`);

  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  const signature = await crypto.subtle.sign('HMAC', key, message);
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `pg_${hex}`;
}

async function systemTokenExists(databaseId: string): Promise<boolean> {
  const result = await kysely
    .selectFrom('databaseTokens')
    .select(sql<string>`COUNT(*)::text`.as('count'))
    .where('databaseId', '=', uuid(databaseId))
    .where('name', '=', SYSTEM_TOKEN_NAME)
    .executeTakeFirst();

  return parseInt(result?.count ?? '0', 10) > 0;
}

async function createSystemToken(databaseId: string): Promise<string> {
  const fullToken = await generateSystemToken(databaseId);
  const tokenPrefix = fullToken.substring(0, 8);
  const tokenHash = await hashToken(fullToken);

  await kysely
    .insertInto('databaseTokens')
    .values({
      databaseId: uuid(databaseId),
      name: SYSTEM_TOKEN_NAME,
      tokenHash,
      tokenPrefix,
      allowedOperations: enumArray(ALL_OPERATIONS, 'database_operation'),
    })
    .onConflict((oc) => oc.columns(['databaseId', 'name']).doNothing())
    .execute();

  return fullToken;
}

export async function getSystemToken(databaseId: string): Promise<string> {
  const exists = await systemTokenExists(databaseId);

  if (!exists) {
    return createSystemToken(databaseId);
  }

  // Token exists, regenerate it (it's deterministic)
  return generateSystemToken(databaseId);
}
