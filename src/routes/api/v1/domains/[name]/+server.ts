import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { domainsService } from '$lib/services/domains';

// DELETE /api/v1/domains/:name - Delete domain
export const DELETE: RequestHandler = async ({ locals, params }) => {
  const userId = locals.userId;
  const name = params.name;

  try {
    const deleted = await domainsService.delete(userId, name);
    if (deleted === 0) {
      return json({ error: 'Domain not found' }, { status: 404 });
    }
    return json({ deleted });
  } catch (error) {
    console.error('Failed to delete domain:', error);
    return json({ error: 'Failed to delete domain' }, { status: 500 });
  }
};
