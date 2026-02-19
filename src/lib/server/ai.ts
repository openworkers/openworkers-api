/**
 * Shared AI helpers for Claude and Mistral API integration.
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

type ClaudeModelName = 'haiku' | 'sonnet' | 'opus';
export const DEFAULT_MODEL: ClaudeModelName = 'sonnet';
export const CLAUDE_MODELS: Record<ClaudeModelName, string> = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-5',
  opus: 'claude-opus-4-5'
};

export { CLAUDE_API_URL };
export type { ClaudeModelName };

// OAuth requires this exact system prompt
const CLAUDE_SYSTEM_PROMPT_OAUTH = "You are Claude Code, Anthropic's official CLI for Claude.";
const CLAUDE_SYSTEM_PROMPT_API =
  "You are Claude Code, Anthropic's official CLI for Claude.\nYou are a helpful assistant for OpenWorkers, a Cloudflare Workers-compatible runtime.\nThe user is editing a worker script. Help them with their code.";

// OAuth token refresh
const TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

// Cache for refreshed tokens
const tokenCache = new Map<string, { accessToken: string; refreshToken: string; expiresAt: number }>();

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function refreshAccessToken(originalRefreshToken: string): Promise<string> {
  const cacheKey = await hashToken(originalRefreshToken);

  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const currentRefreshToken = cached?.refreshToken || originalRefreshToken;

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

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000
  });

  return data.access_token;
}

export function getClaudeToken(request: Request): string | null {
  return request.headers.get('X-Claude-Token') || null;
}

export function isOAuthToken(token: string): boolean {
  return token.startsWith('sk-ant-oat');
}

function isRefreshToken(token: string): boolean {
  return token.startsWith('sk-ant-ort');
}

export async function resolveToken(token: string): Promise<string> {
  if (isRefreshToken(token)) {
    return refreshAccessToken(token);
  }
  return token;
}

export function getClaudeHeaders(token: string): Record<string, string> {
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

export function getSystemPrompt(token: string): string {
  return isOAuthToken(token) ? CLAUDE_SYSTEM_PROMPT_OAUTH : CLAUDE_SYSTEM_PROMPT_API;
}

import contextPromptTemplate from '$lib/assets/ai-context.txt';

export function buildContextPrompt(code: string, diagnostics: string[]): string {
  const diagnosticsText = diagnostics?.length > 0 ? `\n\nTypeScript diagnostics:\n${diagnostics.join('\n')}` : '';
  return contextPromptTemplate.replace('{{CODE}}', code).replace('{{DIAGNOSTICS}}', diagnosticsText);
}

export function buildClaudeMessages(
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

export const APPLY_CODE_TOOL = {
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  code: string;
  diagnostics: string[];
  messages: ChatMessage[];
  userMessage: string;
  model?: ClaudeModelName;
}

export interface ExtendedChatRequest extends ChatRequest {
  model?: ClaudeModelName;
  enableThinking?: boolean;
  thinkingBudget?: number;
}
