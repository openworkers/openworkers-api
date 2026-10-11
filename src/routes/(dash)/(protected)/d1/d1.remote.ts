import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { command, form } from '$app/server';
import { d1Service } from '#lib/services/d1.ts';
import {
  errorOnServiceError,
  issueOnServiceError,
  requireUserId,
  requireUserIdInCommand
} from '#lib/server/remote-guards.ts';
import { ResourceSettingsSchema } from '#lib/server/remote-schemas.ts';
import { ResourceCreateInputSchema } from '#lib/types/schemas/base.schema.ts';

export const createD1Database = form(ResourceCreateInputSchema, async (input) => {
  const userId = requireUserId();

  const database = await issueOnServiceError(
    d1Service.create(userId, { name: input.name, desc: input.desc || undefined })
  );

  redirect(303, `/d1/${database.id}`);
});

export const updateD1Database = form(ResourceSettingsSchema, async (input) => {
  const userId = requireUserId();

  const database = await issueOnServiceError(
    d1Service.update(userId, input.id, { name: input.name, desc: input.desc || null })
  );

  if (!database) {
    error(404, 'D1 database not found');
  }
});

export const deleteD1Database = command(z.uuid(), async (id) => {
  const userId = requireUserIdInCommand();

  if (!(await errorOnServiceError(d1Service.delete(userId, id)))) {
    error(404, 'D1 database not found');
  }
});

// One statement through the runner, like ow d1 execute --command
export const runD1Statement = form(
  z.object({ databaseId: z.uuid(), sql: z.string().trim().min(1).max(100_000) }),
  async ({ databaseId, sql }) => {
    const userId = requireUserId();

    if (!(await d1Service.findById(userId, databaseId))) {
      error(404, 'D1 database not found');
    }

    const result = await issueOnServiceError(
      d1Service.request(databaseId, {
        type: 'op',
        op: { kind: 'query', statement: { sql, params: [] }, rows: 'all' }
      })
    );

    return result as D1StatementResult;
  }
);

export type D1StatementResult =
  | { type: 'query'; columns: string[]; rows: unknown[][]; meta?: { changes?: number; duration?: number } }
  | { type: 'error'; kind: string; message: string }
  | { type: string };
