// The beta UI is a client-rendered SPA. The root layout disables both ssr and
// csr (the API landing page is static HTML); here we re-enable csr so the
// dashboard runs in the browser, while keeping ssr off (no per-request render).
export const ssr = false;
export const csr = true;
export const prerender = false;
