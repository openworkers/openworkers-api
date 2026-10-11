import { z } from 'zod';
import type { RequestHandler } from './$types';
import { databasesService } from '#lib/services/databases.ts';
import { getSystemToken } from '#lib/services/db/database-tokens.ts';
import { PostgateClient } from '#lib/services/postgate.ts';
import { getPostgateConfig } from '#lib/config/index.ts';
import { parseAndValidate } from '#lib/server/validate.ts';

const ExecSchema = z.object({
  sql: z.string().min(1),
  params: z.array(z.unknown()).optional()
});

// POST /api/v1/databases/:id/exec - Execute SQL on a database
export const POST: RequestHandler = async ({ locals, params, request }) => {
  const userId = locals.userId;
  const idOrName = params.id;
  const { sql, params: sqlParams } = await parseAndValidate(request, ExecSchema);

  try {
    const database = await databasesService.findByIdOrName(userId, idOrName);

    if (!database) {
      return Response.json({ error: 'Database not found' }, { status: 404 });
    }

    const systemToken = await getSystemToken(database.id);
    const client = new PostgateClient(getPostgateConfig().url, systemToken);
    const result = await client.query(sql, sqlParams);

    return Response.json({
      rows: result.rows,
      rowCount: result.row_count
    });
  } catch (error) {
    console.error('SQL execution failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
};
