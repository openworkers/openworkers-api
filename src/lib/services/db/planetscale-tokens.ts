import { kysely } from './kysely-client';
import { uuid, timestamptz, now } from './kysely-helpers';

interface PlanetScaleTokenRow {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UpsertTokenInput {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export async function upsertToken(userId: string, input: UpsertTokenInput): Promise<PlanetScaleTokenRow> {
  return kysely
    .insertInto('planetscaleTokens')
    .values({
      userId: uuid(userId),
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: timestamptz(input.expiresAt)
    })
    .onConflict((oc) =>
      oc.column('userId').doUpdateSet({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: timestamptz(input.expiresAt),
        updatedAt: now()
      })
    )
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getToken(userId: string): Promise<PlanetScaleTokenRow | null> {
  const row = await kysely
    .selectFrom('planetscaleTokens')
    .selectAll()
    .where('userId', '=', uuid(userId))
    .executeTakeFirst();

  return row ?? null;
}

export async function deleteToken(userId: string): Promise<number> {
  const result = await kysely
    .deleteFrom('planetscaleTokens')
    .where('userId', '=', uuid(userId))
    .returning('id')
    .execute();

  return result.length;
}
