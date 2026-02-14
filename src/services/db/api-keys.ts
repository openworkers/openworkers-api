import { kysely } from './kysely-client';
import { uuid, timestamptzOrNull, now } from './kysely-helpers';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `ow_${random}`;
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createApiKey(
  userId: string,
  name: string,
  expiresAt?: Date
): Promise<{ apiKey: ApiKey; token: string }> {
  const token = generateToken();
  const tokenPrefix = token.substring(0, 12);
  const tokenHash = await hashToken(token);

  const apiKey = await kysely
    .insertInto('apiKeys')
    .values({
      userId: uuid(userId),
      name,
      tokenPrefix,
      tokenHash,
      expiresAt: timestamptzOrNull(expiresAt)
    })
    .returning(['id', 'userId', 'name', 'tokenPrefix', 'lastUsedAt', 'expiresAt', 'createdAt'])
    .executeTakeFirstOrThrow();

  return {
    apiKey,
    token
  };
}

export async function findApiKeyByToken(token: string): Promise<ApiKey | null> {
  const tokenHash = await hashToken(token);

  const apiKey = await kysely
    .selectFrom('apiKeys')
    .select(['id', 'userId', 'name', 'tokenPrefix', 'lastUsedAt', 'expiresAt', 'createdAt'])
    .where('tokenHash', '=', tokenHash)
    .where((eb) => eb.or([eb('expiresAt', 'is', null), eb('expiresAt', '>', now())]))
    .executeTakeFirst();

  return apiKey ?? null;
}

export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  return kysely
    .selectFrom('apiKeys')
    .select(['id', 'userId', 'name', 'tokenPrefix', 'lastUsedAt', 'expiresAt', 'createdAt'])
    .where('userId', '=', uuid(userId))
    .orderBy('createdAt', 'desc')
    .execute();
}

export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await kysely
    .deleteFrom('apiKeys')
    .where('id', '=', uuid(keyId))
    .where('userId', '=', uuid(userId))
    .returning('id')
    .execute();

  return result.length > 0;
}

export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
  await kysely.updateTable('apiKeys').set({ lastUsedAt: now() }).where('id', '=', uuid(keyId)).execute();
}
