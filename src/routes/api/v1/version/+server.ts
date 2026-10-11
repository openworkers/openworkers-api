import type { RequestHandler } from './$types';
import pkg from '../../../../../package.json';

export const GET: RequestHandler = async () => {
  return Response.json({ version: pkg.version, name: pkg.name });
};
