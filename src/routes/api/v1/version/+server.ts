import type { RequestHandler } from './$types';
import { name, version } from '../../../../../package.json';

export const GET: RequestHandler = async () => {
  return Response.json({ version, name });
};
