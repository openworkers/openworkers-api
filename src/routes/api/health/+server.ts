import type { RequestHandler } from './$types';
import pkg from '../../../../package.json';

export const GET: RequestHandler = async () => {
  return Response.json({
    status: 'ok',
    version: pkg.version,
    commit: __GIT_COMMIT__,
    timestamp: new Date().toISOString()
  });
};
