import { json, error } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import { getNodeEnv } from '$lib/config';

/**
 * Parse and validate JSON body from a Request with Zod schema.
 * Throws SvelteKit error on validation errors.
 */
export async function parseAndValidate<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw error(400, 'Invalid JSON in request body');
    }
    throw err;
  }

  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));

      throw error(400, JSON.stringify({ message: 'Validation failed', errors }));
    }
    throw err;
  }
}

/**
 * Validates data against a Zod schema and returns a JSON response.
 */
export function jsonResponse<T extends z.ZodTypeAny>(schema: T, data: unknown, status: number = 200): Response {
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error('API Response validation failed:', result.error.issues);
    console.error('Invalid data:', JSON.stringify(data, null, 2));

    if (getNodeEnv() === 'production') {
      return json({ error: 'Internal server error' }, { status: 500 });
    } else {
      return json({ error: 'Response validation failed', issues: result.error.issues, data }, { status: 500 });
    }
  }

  return json(result.data, { status });
}

/**
 * Validates an array of data against a Zod schema.
 */
export function jsonArrayResponse<T extends z.ZodTypeAny>(schema: T, data: unknown[], status: number = 200): Response {
  return jsonResponse(z.array(schema), data, status);
}
