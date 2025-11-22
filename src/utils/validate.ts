import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { nodeEnv } from "../config";

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
    console.error("API Response validation failed:", result.error.issues);
    console.error("Invalid data:", JSON.stringify(data, null, 2));

    // In production, return generic error to client
    // In development, show detailed validation errors
    if (nodeEnv === "production") {
      return c.json({ error: "Internal server error" }, 500);
    } else {
      return c.json(
        {
          error: "Response validation failed",
          issues: result.error.issues,
          data,
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
