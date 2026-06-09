import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function load({ locals }) {
  // Logged-in users skip the landing and go straight to the dashboard.
  if (locals.userId) {
    throw redirect(307, '/workers');
  }

  return {
    dashboardUrl: env.APP_URL || 'https://dash.openworkers.com'
  };
}
