import { env } from '$env/dynamic/private';

export function load() {
  return {
    dashboardUrl: env.APP_URL || 'https://dash.openworkers.com'
  };
}
