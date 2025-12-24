import { Hono } from 'hono';
import { mistral, anthropic } from '../config';

const VOXTRAL_API_URL = 'https://api.mistral.ai/v1/audio/transcriptions';
const VOXTRAL_MODEL = 'voxtral-mini-2507';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'; // 'claude-sonnet-4-20250514';

const ai = new Hono();

// POST /ai/transcribe - Transcribe audio using Voxtral
ai.post('/transcribe', async (c) => {
  console.log('Received transcription request');

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

    console.log('Sending transcription request to Mistral API');

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
}

// Extended request with optional thinking mode
interface ExtendedChatRequest extends ChatRequest {
  enableThinking?: boolean;
  thinkingBudget?: number;
}

// POST /ai/chat/stream - Stream chat with Claude (SSE)
ai.post('/chat/stream', async (c) => {
  if (!anthropic.apiKey) {
    return c.json({ error: 'AI chat service not configured' }, 503);
  }

  try {
    const body = (await c.req.json()) as ExtendedChatRequest;
    const { code, diagnostics, messages, userMessage, enableThinking = false, thinkingBudget = 10000 } = body;

    if (!userMessage?.trim()) {
      return c.json({ error: 'No message provided' }, 400);
    }

    // Build system prompt with code context
    let systemPrompt = `You are a helpful assistant for OpenWorkers, a Cloudflare Workers-compatible runtime.
The user is editing a worker script. Help them with their code.

Current code:
\`\`\`typescript
${code}
\`\`\``;

    if (diagnostics && diagnostics.length > 0) {
      systemPrompt += `\n\nTypeScript diagnostics:\n${diagnostics.join('\n')}`;
    }

    systemPrompt += `\n\nWhen the user asks you to modify, fix, or update the code, use the apply_code tool to directly update the editor. For explanations or questions, just respond with text.`;

    const tools = [
      {
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
      }
    ];

    // Build message history
    const claudeMessages = [
      ...messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    // Build request body with optional extended thinking
    const requestBody: Record<string, unknown> = {
      model: CLAUDE_MODEL,
      max_tokens: enableThinking ? Math.max(16000, thinkingBudget + 4096) : 4096,
      stream: true,
      system: systemPrompt,
      tools,
      messages: claudeMessages
    };

    // Add extended thinking if enabled
    if (enableThinking) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: thinkingBudget
      };
    }

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropic.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return c.json({ error: 'AI chat failed' }, 500);
    }

    // Stream the response as SSE
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();

        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let currentToolInput = '';
        let inToolUse = false;
        let toolName = '';
        let inThinking = false;

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

                // Handle message_start - send initial metadata
                if (event.type === 'message_start') {
                  const msg = event.message;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'message_start',
                        id: msg?.id,
                        model: msg?.model,
                        usage: msg?.usage
                      })}\n\n`
                    )
                  );
                }
                // Handle ping events - forward for keep-alive
                else if (event.type === 'ping') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ping' })}\n\n`));
                }
                // Handle error events in stream
                else if (event.type === 'error') {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'error',
                        message: event.error?.message || 'Unknown error',
                        errorType: event.error?.type
                      })}\n\n`
                    )
                  );
                }
                // Handle content block start
                else if (event.type === 'content_block_start') {
                  if (event.content_block?.type === 'tool_use') {
                    inToolUse = true;
                    toolName = event.content_block.name;
                    currentToolInput = '';
                    // Signal start of code block
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'code_start', tool: toolName })}\n\n`)
                    );
                  } else if (event.content_block?.type === 'thinking') {
                    inThinking = true;
                    // Signal start of thinking
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking_start' })}\n\n`));
                  }
                }
                // Handle content block delta
                else if (event.type === 'content_block_delta') {
                  if (event.delta?.type === 'text_delta') {
                    // Stream text
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`)
                    );
                  } else if (event.delta?.type === 'input_json_delta') {
                    // Accumulate tool input JSON
                    currentToolInput += event.delta.partial_json;
                  } else if (event.delta?.type === 'thinking_delta') {
                    // Stream thinking content
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: event.delta.thinking })}\n\n`)
                    );
                  } else if (event.delta?.type === 'signature_delta') {
                    // Thinking signature (integrity verification) - we can skip forwarding this
                  }
                }
                // Handle content block stop
                else if (event.type === 'content_block_stop') {
                  if (inToolUse && toolName === 'apply_code') {
                    try {
                      const input = JSON.parse(currentToolInput) as { code: string; explanation: string };
                      // Send complete code
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: 'code_complete', code: input.code, explanation: input.explanation })}\n\n`
                        )
                      );
                    } catch {
                      // JSON parsing failed, ignore
                    }

                    inToolUse = false;
                    toolName = '';
                    currentToolInput = '';
                  } else if (inThinking) {
                    inThinking = false;
                    // Signal end of thinking
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking_stop' })}\n\n`));
                  }
                }
                // Handle message_delta - send stop reason and final usage
                else if (event.type === 'message_delta') {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'message_delta',
                        stopReason: event.delta?.stop_reason,
                        usage: event.usage
                      })}\n\n`
                    )
                  );
                }
                // Handle message_stop
                else if (event.type === 'message_stop') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
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
        Connection: 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Chat stream error:', error);
    return c.json({ error: 'AI chat failed' }, 500);
  }
});

// POST /ai/chat - Chat with Claude
ai.post('/chat', async (c) => {
  if (!anthropic.apiKey) {
    return c.json({ error: 'AI chat service not configured' }, 503);
  }

  try {
    const body = (await c.req.json()) as ChatRequest;
    const { code, diagnostics, messages, userMessage } = body;

    if (!userMessage?.trim()) {
      return c.json({ error: 'No message provided' }, 400);
    }

    // Build system prompt with code context
    let systemPrompt = `You are a helpful assistant for OpenWorkers, a Cloudflare Workers-compatible runtime.
The user is editing a worker script. Help them with their code.

Current code:
\`\`\`typescript
${code}
\`\`\``;

    if (diagnostics && diagnostics.length > 0) {
      systemPrompt += `\n\nTypeScript diagnostics:\n${diagnostics.join('\n')}`;
    }

    systemPrompt += `\n\nWhen the user asks you to modify, fix, or update the code, use the apply_code tool to directly update the editor. For explanations or questions, just respond with text.`;

    const tools = [
      {
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
      }
    ];

    // Build message history
    const claudeMessages = [
      ...messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropic.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: claudeMessages
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
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
