import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getClaudeToken,
  resolveToken,
  getClaudeHeaders,
  getSystemPrompt,
  buildContextPrompt,
  buildClaudeMessages,
  APPLY_CODE_TOOL,
  CLAUDE_API_URL,
  CLAUDE_MODELS,
  DEFAULT_MODEL,
  type ChatRequest
} from '$lib/server/ai';

// POST /api/v1/ai/chat - Chat with Claude (non-streaming)
export const POST: RequestHandler = async ({ request }) => {
  const rawToken = getClaudeToken(request);

  if (!rawToken) {
    return json({ error: 'AI chat service not configured' }, { status: 503 });
  }

  try {
    const token = await resolveToken(rawToken);

    const body = (await request.json()) as ChatRequest;
    const { code, diagnostics, messages, userMessage, model = DEFAULT_MODEL } = body;
    const claudeModel = CLAUDE_MODELS[model] || CLAUDE_MODELS[DEFAULT_MODEL];

    if (!userMessage?.trim()) {
      return json({ error: 'No message provided' }, { status: 400 });
    }

    const contextPrompt = buildContextPrompt(code, diagnostics);
    const claudeMessages = buildClaudeMessages(contextPrompt, messages, userMessage);

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: getClaudeHeaders(token),
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 4096,
        system: getSystemPrompt(token),
        tools: [APPLY_CODE_TOOL],
        messages: claudeMessages
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[chat] Claude API error:', error);
      return json({ error: 'AI chat failed' }, { status: 500 });
    }

    const data = (await response.json()) as {
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; name: string; input: { code: string; explanation: string } }
      >;
    };

    if (!data.content || data.content.length === 0) {
      return json({ error: 'Invalid API response' }, { status: 500 });
    }

    let textResponse = '';
    let appliedCode: string | null = null;

    for (const block of data.content) {
      if (block.type === 'text') {
        textResponse += block.text;
      } else if (block.type === 'tool_use' && block.name === 'apply_code') {
        const { code: newCode, explanation } = block.input;
        appliedCode = newCode;
        textResponse += `✅ Code applied: ${explanation}`;
      }
    }

    return json({
      response: textResponse || 'Done!',
      appliedCode
    });
  } catch (error) {
    console.error('Chat error:', error);
    return json({ error: 'AI chat failed' }, { status: 500 });
  }
};
