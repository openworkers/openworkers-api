import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { domainsService } from '$lib/services/domains';
import { DomainSchema, DomainCreateInputSchema } from '$lib/types';
import { jsonResponse, jsonArrayResponse, parseAndValidate } from '$lib/server/validate';

// GET /api/v1/domains - List all domains
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.userId;
  try {
    const domains = await domainsService.findAll(userId);
    return jsonArrayResponse(DomainSchema, domains);
  } catch (error) {
    console.error('Failed to fetch domains:', error);
    return json({ error: 'Failed to fetch domains' }, { status: 500 });
  }
};

// POST /api/v1/domains - Create domain
export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = locals.userId;
  const payload = await parseAndValidate(request, DomainCreateInputSchema);

  try {
    const domain = await domainsService.create(userId, payload);
    return jsonResponse(DomainSchema, domain, 201);
  } catch (error) {
    console.error('Failed to create domain:', error);
    return json(
      { error: 'Failed to create domain', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
