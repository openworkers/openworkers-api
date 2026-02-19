import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import pkg from '../../../../../package.json';

export const GET: RequestHandler = async () => {
  return json({ version: pkg.version, name: pkg.name });
};
