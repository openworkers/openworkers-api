// The dashboard is server-rendered: the root layout disables ssr/csr (the API
// landing is static HTML), here we re-enable both so pages arrive fully styled
// on first paint and the auth guard can redirect server-side.
export const ssr = true;
export const csr = true;
export const prerender = false;
