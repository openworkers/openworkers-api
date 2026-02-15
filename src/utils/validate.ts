import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { z, ZodError } from 'zod';
import { nodeEnv } from '../config';

/**
 * Parse and validate JSON body with Zod schema.
 * Throws HTTPException on validation errors.
 */
export async function parseAndValidate<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new HTTPException(400, { message: 'Invalid JSON in request body' });
    }

    throw error;
  }

  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      throw new HTTPException(400, {
        message: 'Validation failed',
        cause: errors,
      });
    }

    throw error;
  }
}

/**
 * Validates data against a Zod schema and returns a JSON response
 * Throws an error if validation fails (caught by error handler)
 */
export function jsonResponse<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
  data: unknown,
  status: ContentfulStatusCode = 200
) {
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error('API Response validation failed:', result.error.issues);
    console.error('Invalid data:', JSON.stringify(data, null, 2));

    // In production, return generic error to client
    // In development, show detailed validation errors
    if (nodeEnv === 'production') {
      return c.json({ error: 'Internal server error' }, 500);
    } else {
      return c.json(
        {
          error: 'Response validation failed',
          issues: result.error.issues,
          data
        },
        500
      );
    }
  }

  return c.json(result.data, status);
}

/**
 * Validates an array of data against a Zod schema
 */
export function jsonArrayResponse<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
  data: unknown[],
  status: ContentfulStatusCode = 200
) {
  return jsonResponse(c, z.array(schema), data, status);
}
