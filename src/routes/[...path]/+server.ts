import { json } from '@sveltejs/kit';

const response = json({ error: 'Not Found' }, { status: 404 });

export const fallback = () => response;
