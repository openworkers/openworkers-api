const response = Response.json({ error: 'Not Found' }, { status: 404 });

export const fallback = () => response;
