import type { RequestHandler } from './$types';

// Should be intercepted by Nginx before reaching API.
// If the CLI receives 418, it means Nginx is not intercepting this path.
export const GET: RequestHandler = async () => {
  return Response.json({ status: 'not_intercepted', layer: 'proxy' }, { status: 418 });
};
