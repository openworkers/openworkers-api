import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMistralConfig } from '$lib/config';

const VOXTRAL_API_URL = 'https://api.mistral.ai/v1/audio/transcriptions';
const VOXTRAL_MODEL = 'voxtral-mini-2507';

// POST /api/v1/ai/transcribe - Transcribe audio using Voxtral
export const POST: RequestHandler = async ({ request }) => {
  const mistral = getMistralConfig();

  if (!mistral.apiKey) {
    return json({ error: 'Transcription service not configured' }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return json({ error: 'No audio file provided' }, { status: 400 });
    }

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
      return json({ error: 'Transcription failed' }, { status: 500 });
    }

    const result = (await response.json()) as { text: string };

    return json({ text: result.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return json({ error: 'Transcription failed' }, { status: 500 });
  }
};
