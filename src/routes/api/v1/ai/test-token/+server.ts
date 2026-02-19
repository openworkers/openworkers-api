import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getClaudeToken,
  resolveToken,
  getClaudeHeaders,
  CLAUDE_API_URL,
  CLAUDE_MODELS,
  DEFAULT_MODEL
} from '$lib/server/ai';

// POST /api/v1/ai/test-token - Test if Claude token is valid
export const POST: RequestHandler = async ({ request }) => {
  const rawToken = getClaudeToken(request);

  if (!rawToken) {
    return json({ valid: false, error: 'No token provided' }, { status: 400 });
  }

  try {
    const token = await resolveToken(rawToken);

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: getClaudeHeaders(token),
      body: JSON.stringify({
        model: CLAUDE_MODELS[DEFAULT_MODEL],
        max_tokens: 1,
        system: "You are Claude Code, Anthropic's official CLI for Claude.",
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (response.ok) {
      return json({ valid: true });
    }

    const error = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    return json({ valid: false, error: error.error?.message || 'Invalid token' }, { status: 401 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return json({ valid: false, error: message }, { status: 500 });
  }
};
