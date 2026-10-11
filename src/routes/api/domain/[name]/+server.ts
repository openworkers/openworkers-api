import type { RequestHandler } from './$types';
import { domainsService } from '#lib/services/domains.ts';

// GET /api/domain/:name - Public endpoint for nginx domain → worker mapping
export const GET: RequestHandler = async ({ params }) => {
  const domain = await domainsService.findByName(params.name);

  if (!domain) {
    return Response.json({ error: 'Domain not found' }, { status: 404 });
  }

  return Response.json(
    {
      workerId: domain.workerId
    },
    {
      headers: { 'Worker-Id': domain.workerId }
    }
  );
};
