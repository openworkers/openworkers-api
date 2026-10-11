import type { RequestHandler } from './$types';
import { domainsService } from '#lib/services/domains.ts';

// DELETE /api/v1/domains/:name - Delete domain
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const name = params.name;

  try {
    const deleted = await domainsService.delete(userId, name);
    if (deleted === 0) {
      return Response.json({ error: 'Domain not found' }, { status: 404 });
    }
    return Response.json({ deleted });
  } catch (error) {
    console.error('Failed to delete domain:', error);
    return Response.json({ error: 'Failed to delete domain' }, { status: 500 });
  }
};
