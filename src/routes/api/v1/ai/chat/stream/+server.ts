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
  type ExtendedChatRequest
} from '$lib/server/ai';

// POST /api/v1/ai/chat/stream - Stream chat with Claude (SSE)
export const POST: RequestHandler = async ({ request }) => {
  const rawToken = getClaudeToken(request);

  if (!rawToken) {
    return json({ error: 'AI chat service not configured' }, { status: 503 });
  }

  try {
    const token = await resolveToken(rawToken);

    const body = (await request.json()) as ExtendedChatRequest;
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
      return json({ error: 'No message provided' }, { status: 400 });
    }

    const contextPrompt = buildContextPrompt(code, diagnostics);
    const claudeMessages = buildClaudeMessages(contextPrompt, messages, userMessage);

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
      return json({ error: 'AI chat failed' }, { status: 500 });
    }

    // Stream SSE response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        function sendSSE(data: unknown) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        const reader = response.body?.getReader();

        if (!reader) {
          sendSSE({ type: 'error', message: 'No response body' });
          controller.close();
          return;
        }

        let buffer = '';
        let currentToolInput = '';
        let inToolUse = false;
        let toolName = '';
        let inThinking = false;

        sendSSE({ type: 'ping' });

        try {
          while (true) {
            const { done, value } = await reader.read();

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

                if (event.type === 'message_start') {
                  const msg = event.message;
                  sendSSE({
                    type: 'message_start',
                    id: msg?.id,
                    model: msg?.model,
                    usage: msg?.usage
                  });
                } else if (event.type === 'ping') {
                  sendSSE({ type: 'ping' });
                } else if (event.type === 'error') {
                  sendSSE({
                    type: 'error',
                    message: event.error?.message || 'Unknown error',
                    errorType: event.error?.type
                  });
                } else if (event.type === 'content_block_start') {
                  if (event.content_block?.type === 'tool_use') {
                    inToolUse = true;
                    toolName = event.content_block.name;
                    currentToolInput = '';
                    sendSSE({ type: 'code_start', tool: toolName });
                  } else if (event.content_block?.type === 'thinking') {
                    inThinking = true;
                    sendSSE({ type: 'thinking_start' });
                  }
                } else if (event.type === 'content_block_delta') {
                  if (event.delta?.type === 'text_delta') {
                    sendSSE({ type: 'text', content: event.delta.text });
                  } else if (event.delta?.type === 'input_json_delta') {
                    currentToolInput += event.delta.partial_json || '';
                    sendSSE({ type: 'code_progress', bytes: currentToolInput.length });
                  } else if (event.delta?.type === 'thinking_delta') {
                    sendSSE({ type: 'thinking', content: event.delta.thinking });
                  }
                } else if (event.type === 'content_block_stop') {
                  if (inToolUse && toolName === 'apply_code') {
                    try {
                      const input = JSON.parse(currentToolInput) as { code: string; explanation: string };
                      sendSSE({ type: 'code_complete', code: input.code, explanation: input.explanation });
                    } catch {
                      // JSON parsing failed for tool input
                    }

                    inToolUse = false;
                    toolName = '';
                    currentToolInput = '';
                  } else if (inThinking) {
                    inThinking = false;
                    sendSSE({ type: 'thinking_stop' });
                  }
                } else if (event.type === 'message_delta') {
                  sendSSE({
                    type: 'message_delta',
                    stopReason: event.delta?.stop_reason,
                    usage: event.usage
                  });
                } else if (event.type === 'message_stop') {
                  sendSSE({ type: 'done' });
                }
              } catch {
                // JSON parsing failed, continue
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (error) {
    console.error('Chat stream error:', error);
    return json({ error: 'AI chat failed' }, { status: 500 });
  }
};
