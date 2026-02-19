import adapter from '@openworkers/adapter-sveltekit';
import type { Config } from '@sveltejs/kit';

const config: Config = {
  kit: {
    adapter: adapter({ functions: true, debug: { prettier: false } }),
    csrf: {
      trustedOrigins: ['*']
    },
    // API-only: no prerendering
    prerender: {
      entries: []
    }
  }
};

export default config;
