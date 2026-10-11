import { invalid, redirect } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
import { requireUserId } from '#lib/server/remote-guards.ts';
import { startPlanetScaleOAuth } from '#lib/server/planetscale-oauth.ts';

export const connectPlanetScale = form(async () => {
  requireUserId();

  const authUrl = startPlanetScaleOAuth(getRequestEvent().cookies);

  if (!authUrl) {
    invalid('PlanetScale is not configured on this platform');
  }

  redirect(303, authUrl, { external: true });
});
