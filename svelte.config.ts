import adapter from '@openworkers/adapter-sveltekit';
import type { Config } from '@sveltejs/kit';

const config: Config = {
  kit: {
    inlineStyleThreshold: Number.POSITIVE_INFINITY,
    adapter: adapter({ functions: true, debug: { prettier: false } }),
    csrf: {
      trustedOrigins: ['*']
    },
    prerender: {
      entries: []
    }
  }
};

export default config;
