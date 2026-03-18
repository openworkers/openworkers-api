import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { domainsService } from '$lib/services/domains';

// GET /api/domain/:name - Public endpoint for nginx domain → worker mapping
export const GET: RequestHandler = async ({ params }) => {
  const domain = await domainsService.findByName(params.name);

  if (!domain) {
    return json({ error: 'Domain not found' }, { status: 404 });
  }

  return json(
    {
      workerId: domain.workerId
    },
    {
      headers: { 'Worker-Id': domain.workerId }
    }
  );
};
