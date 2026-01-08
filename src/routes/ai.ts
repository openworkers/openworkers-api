import { Hono } from 'hono';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { mistral } from '../config';
import contextPromptTemplate from './ai.txt';

const VOXTRAL_API_URL = 'https://api.mistral.ai/v1/audio/transcriptions';
const VOXTRAL_MODEL = 'voxtral-mini-2507';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Model mapping
type ClaudeModelName = 'haiku' | 'sonnet' | 'opus';
const DEFAULT_MODEL: ClaudeModelName = 'sonnet';
const CLAUDE_MODELS: Record<ClaudeModelName, string> = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-5',
  opus: 'claude-opus-4-5'
};

// OAuth requires this exact system prompt
const CLAUDE_SYSTEM_PROMPT_OAUTH = "You are Claude Code, Anthropic's official CLI for Claude.";
const CLAUDE_SYSTEM_PROMPT_API =
  "You are Claude Code, Anthropic's official CLI for Claude.\nYou are a helpful assistant for OpenWorkers, a Cloudflare Workers-compatible runtime.\nThe user is editing a worker script. Help them with their code.";

// OAuth token refresh
const TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

// Cache for refreshed tokens: hash(originalRefreshToken) -> { accessToken, refreshToken, expiresAt }
const tokenCache = new Map<string, { accessToken: string; refreshToken: string; expiresAt: number }>();

// Hash refresh token for cache key
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Refresh access token using refresh token
async function refreshAccessToken(originalRefreshToken: string): Promise<string> {
  const cacheKey = await hashToken(originalRefreshToken);

  // Check cache first
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60000) {
    // Still valid with 1 min buffer
    return cached.accessToken;
  }

  // Use the rotated refresh token if we have one, otherwise use the original
  const currentRefreshToken = cached?.refreshToken || originalRefreshToken;

  // Refresh the token
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: currentRefreshToken
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[refresh] Token refresh failed:', error);
    throw new Error('Token refresh failed');
  }

  const data = (await response.json()) as { access_token: string; refresh_token: string; expires_in: number };

  // Cache the new tokens (access + rotated refresh)
  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000
  });

  return data.access_token;
}

// Get Claude token from header
function getClaudeToken(c: Context): string | null {
  return c.req.header('X-Claude-Token') || null;
}

// Check token type by prefix
function isOAuthToken(token: string): boolean {
  return token.startsWith('sk-ant-oat');
}

function isRefreshToken(token: string): boolean {
  return token.startsWith('sk-ant-ort');
}

// Resolve token: if refresh token, get access token; otherwise return as-is
async function resolveToken(token: string): Promise<string> {
  if (isRefreshToken(token)) {
    return refreshAccessToken(token);
  }

  return token;
}

// Build headers for Claude API based on token type
function getClaudeHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01'
  };

  if (isOAuthToken(token)) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['anthropic-beta'] = 'oauth-2025-04-20';
  } else {
    headers['x-api-key'] = token;
  }

  return headers;
}

// Get system prompt based on token type
function getSystemPrompt(token: string): string {
  return isOAuthToken(token) ? CLAUDE_SYSTEM_PROMPT_OAUTH : CLAUDE_SYSTEM_PROMPT_API;
}

// Build context prompt from code and diagnostics
function buildContextPrompt(code: string, diagnostics: string[]): string {
  const diagnosticsText = diagnostics?.length > 0 ? `\n\nTypeScript diagnostics:\n${diagnostics.join('\n')}` : '';
  return contextPromptTemplate.replace('{{CODE}}', code).replace('{{DIAGNOSTICS}}', diagnosticsText);
}

// Build messages with context injected as first exchange (OAuth workaround)
function buildClaudeMessages(
  contextPrompt: string,
  messages: Array<{ role: string; content: string }>,
  userMessage: string
) {
  return [
    { role: 'user', content: contextPrompt },
    { role: 'assistant', content: "I understand. I'll help you with your OpenWorkers code." },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];
}

// Tool for applying code changes
const APPLY_CODE_TOOL = {
  name: 'apply_code',
  description:
    'Apply new code to the editor. Use this when the user asks to modify, fix, update, or change the code. This will replace the entire code in the editor.',
  input_schema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The complete updated TypeScript/JavaScript code to apply to the editor'
      },
      explanation: {
        type: 'string',
        description: 'Brief explanation of what was changed'
      }
    },
    required: ['code', 'explanation']
  }
};

const ai = new Hono();

// POST /ai/test-token - Test if Claude token is valid
ai.post('/test-token', async (c) => {
  const rawToken = getClaudeToken(c);

  if (!rawToken) {
    return c.json({ valid: false, error: 'No token provided' }, 400);
  }

  try {
    // Resolve refresh token to access token if needed
    const token = await resolveToken(rawToken);

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: getClaudeHeaders(token),
      body: JSON.stringify({
        model: CLAUDE_MODELS[DEFAULT_MODEL],
        max_tokens: 1,
        system: CLAUDE_SYSTEM_PROMPT_OAUTH,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (response.ok) {
      return c.json({ valid: true });
    }

    const error = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    return c.json(
      {
        valid: false,
        error: error.error?.message || 'Invalid token'
      },
      401
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return c.json({ valid: false, error: message }, 500);
  }
});

// POST /ai/transcribe - Transcribe audio using Voxtral
ai.post('/transcribe', async (c) => {
  if (!mistral.apiKey) {
    return c.json({ error: 'Transcription service not configured' }, 503);
  }

  try {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    // Forward to Mistral API
    const mistralForm = new FormData();
    mistralForm.append('file', audioFile, 'audio.webm');
    mistralForm.append('model', VOXTRAL_MODEL);

    const response = await fetch(VOXTRAL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mistral.apiKey}`
      },
      body: mistralForm
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Voxtral API error:', error);
      return c.json({ error: 'Transcription failed' }, 500);
    }

    const result = (await response.json()) as { text: string };

    return c.json({ text: result.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return c.json({ error: 'Transcription failed' }, 500);
  }
});

// Request body types
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  code: string;
  diagnostics: string[];
  messages: ChatMessage[];
  userMessage: string;
  model?: ClaudeModelName;
}

// Extended request with optional thinking mode
interface ExtendedChatRequest extends ChatRequest {
  model?: ClaudeModelName;
  enableThinking?: boolean;
  thinkingBudget?: number;
}

// POST /ai/chat/stream - Stream chat with Claude (SSE)
ai.post('/chat/stream', async (c) => {
  const rawToken = getClaudeToken(c);

  if (!rawToken) {
    return c.json({ error: 'AI chat service not configured' }, 503);
  }

  try {
    // Resolve refresh token to access token if needed
    const token = await resolveToken(rawToken);

    const body = (await c.req.json()) as ExtendedChatRequest;
    const {
      code,
      diagnostics,
      messages,
      userMessage,
      model = DEFAULT_MODEL,
      enableThinking = false,
      thinkingBudget = 16384
    } = body;
    const claudeModel = CLAUDE_MODELS[model] || CLAUDE_MODELS[DEFAULT_MODEL];

    if (!userMessage?.trim()) {
      return c.json({ error: 'No message provided' }, 400);
    }

    const contextPrompt = buildContextPrompt(code, diagnostics);
    const claudeMessages = buildClaudeMessages(contextPrompt, messages, userMessage);

    // Build request body with optional extended thinking
    const requestBody: Record<string, unknown> = {
      model: claudeModel,
      max_tokens: enableThinking ? Math.max(16384, thinkingBudget + 8192) : 8192,
      stream: true,
      system: getSystemPrompt(token),
      tools: [APPLY_CODE_TOOL],
      messages: claudeMessages
    };

    if (enableThinking) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: thinkingBudget
      };
    }

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: getClaudeHeaders(token),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[chat/stream] Claude API error:', error);
      return c.json({ error: 'AI chat failed' }, 500);
    }

    // Set header before streaming to disable proxy buffering
    c.header('X-Accel-Buffering', 'no');

    // Stream using Hono's streamSSE helper
    return streamSSE(c, async (stream) => {
      const reader = response.body?.getReader();

      if (!reader) {
        await stream.writeSSE({ data: JSON.stringify({ type: 'error', message: 'No response body' }) });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentToolInput = '';
      let inToolUse = false;
      let toolName = '';
      let inThinking = false;

      // Send initial ping
      await stream.writeSSE({ data: JSON.stringify({ type: 'ping' }) });

      // Helper to read with timeout and send pings
      const readWithPing = async () => {
        const PING_INTERVAL = 2000;
        const readPromise = reader.read(); // Create read promise ONCE

        while (true) {
          const timeoutPromise = new Promise<'timeout'>((resolve) =>
            setTimeout(() => resolve('timeout'), PING_INTERVAL)
          );
          const result = await Promise.race([readPromise, timeoutPromise]);

          if (result === 'timeout') {
            await stream.writeSSE({ data: JSON.stringify({ type: 'ping' }) });
            continue; // Keep waiting for the SAME readPromise
          }

          return result;
        }
      };

      try {
        while (true) {
          const { done, value } = await readWithPing();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);

            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              // Handle message_start
              if (event.type === 'message_start') {
                const msg = event.message;
                await stream.writeSSE({
                  data: JSON.stringify({
                    type: 'message_start',
                    id: msg?.id,
                    model: msg?.model,
                    usage: msg?.usage
                  })
                });
              }
              // Handle ping events
              else if (event.type === 'ping') {
                await stream.writeSSE({ data: JSON.stringify({ type: 'ping' }) });
              }
              // Handle error events
              else if (event.type === 'error') {
                await stream.writeSSE({
                  data: JSON.stringify({
                    type: 'error',
                    message: event.error?.message || 'Unknown error',
                    errorType: event.error?.type
                  })
                });
              }
              // Handle content block start
              else if (event.type === 'content_block_start') {
                if (event.content_block?.type === 'tool_use') {
                  inToolUse = true;
                  toolName = event.content_block.name;
                  currentToolInput = '';
                  await stream.writeSSE({ data: JSON.stringify({ type: 'code_start', tool: toolName }) });
                } else if (event.content_block?.type === 'thinking') {
                  inThinking = true;
                  await stream.writeSSE({ data: JSON.stringify({ type: 'thinking_start' }) });
                }
              }
              // Handle content block delta
              else if (event.type === 'content_block_delta') {
                if (event.delta?.type === 'text_delta') {
                  await stream.writeSSE({ data: JSON.stringify({ type: 'text', content: event.delta.text }) });
                } else if (event.delta?.type === 'input_json_delta') {
                  currentToolInput += event.delta.partial_json || '';
                  await stream.writeSSE({
                    data: JSON.stringify({ type: 'code_progress', bytes: currentToolInput.length })
                  });
                } else if (event.delta?.type === 'thinking_delta') {
                  await stream.writeSSE({ data: JSON.stringify({ type: 'thinking', content: event.delta.thinking }) });
                }
              }
              // Handle content block stop
              else if (event.type === 'content_block_stop') {
                if (inToolUse && toolName === 'apply_code') {
                  try {
                    const input = JSON.parse(currentToolInput) as { code: string; explanation: string };
                    await stream.writeSSE({
                      data: JSON.stringify({ type: 'code_complete', code: input.code, explanation: input.explanation })
                    });
                  } catch {
                    // JSON parsing failed for tool input
                  }

                  inToolUse = false;
                  toolName = '';
                  currentToolInput = '';
                } else if (inThinking) {
                  inThinking = false;
                  await stream.writeSSE({ data: JSON.stringify({ type: 'thinking_stop' }) });
                }
              }
              // Handle message_delta
              else if (event.type === 'message_delta') {
                await stream.writeSSE({
                  data: JSON.stringify({
                    type: 'message_delta',
                    stopReason: event.delta?.stop_reason,
                    usage: event.usage
                  })
                });
              }
              // Handle message_stop
              else if (event.type === 'message_stop') {
                await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) });
              }
            } catch {
              // JSON parsing failed, continue
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    });
  } catch (error) {
    console.error('Chat stream error:', error);
    return c.json({ error: 'AI chat failed' }, 500);
  }
});

// POST /ai/chat - Chat with Claude
ai.post('/chat', async (c) => {
  const rawToken = getClaudeToken(c);

  if (!rawToken) {
    return c.json({ error: 'AI chat service not configured' }, 503);
  }

  try {
    // Resolve refresh token to access token if needed
    const token = await resolveToken(rawToken);

    const body = (await c.req.json()) as ChatRequest;
    const { code, diagnostics, messages, userMessage, model = DEFAULT_MODEL } = body;
    const claudeModel = CLAUDE_MODELS[model] || CLAUDE_MODELS[DEFAULT_MODEL];

    if (!userMessage?.trim()) {
      return c.json({ error: 'No message provided' }, 400);
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
      return c.json({ error: 'AI chat failed' }, 500);
    }

    const data = (await response.json()) as {
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; name: string; input: { code: string; explanation: string } }
      >;
    };

    if (!data.content || data.content.length === 0) {
      return c.json({ error: 'Invalid API response' }, 500);
    }

    // Process response - check for tool use
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

    return c.json({
      response: textResponse || 'Done!',
      appliedCode
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'AI chat failed' }, 500);
  }
});

export default ai;
