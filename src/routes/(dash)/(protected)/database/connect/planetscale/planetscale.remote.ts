import { invalid, isValidationError, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { form, getRequestEvent } from '$app/server';
import { issueOnServiceError, requireUserId } from '#lib/server/remote-guards.ts';
import { databasesService } from '#lib/services/databases.ts';
import { DatabaseCreatePlanetScaleInputSchema } from '#lib/types/schemas/database.schema.ts';
import { startPlanetScaleOAuth } from '#lib/server/planetscale-oauth.ts';

export const connectPlanetScale = form(async () => {
  requireUserId();

  const authUrl = startPlanetScaleOAuth(getRequestEvent().cookies);

  if (!authUrl) {
    invalid('PlanetScale is not configured on this platform');
  }

  redirect(303, authUrl, { external: true });
});

const { org, database, branch, name, desc } = DatabaseCreatePlanetScaleInputSchema.shape;

export const createPlanetScaleDatabase = form(
  z.object({ org, database, branch, name, desc, dbName: z.string().trim().min(1).max(100) }),
  async (input) => {
    const userId = requireUserId();
    let created;

    try {
      created = await issueOnServiceError(
        databasesService.create(
          userId,
          DatabaseCreatePlanetScaleInputSchema.parse({
            ...input,
            provider: 'planetscale',
            desc: input.desc || undefined
          })
        )
      );
    } catch (error) {
      if (isValidationError(error)) {
        throw error;
      }

      console.error('Failed to create the PlanetScale database:', error);
      invalid('PlanetScale did not give a password for this branch. Try again.');
    }

    redirect(303, `/database/${created.id}`);
  }
);
