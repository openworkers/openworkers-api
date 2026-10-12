import type { RequestHandler } from './$types';
import { version } from '../../../../package.json';

export const GET: RequestHandler = async () => {
  return Response.json({
    status: 'ok',
    version,
    commit: __GIT_COMMIT__,
    timestamp: new Date().toISOString()
  });
};
