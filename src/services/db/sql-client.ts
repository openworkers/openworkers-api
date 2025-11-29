import { postgate as postgateConfig } from '../../config';
import { PostgateClient } from '../postgate';

/**
 * Result type for SQL queries
 */
export interface SqlResult<T = Record<string, unknown>> extends Array<T> {
  count?: number;
}

/**
 * Named parameters object type
 */
export type NamedParams = Record<string, unknown>;

/**
 * Postgate SQL client interface - supports both positional ($1, $2) and named (:name, :userId) params
 */
export interface PostgateSqlClient {
  <T = Record<string, unknown>>(query: string, params?: unknown[] | NamedParams): Promise<SqlResult<T>>;
}

/**
 * Convert named parameters ($name) to positional ($1) and extract values array
 */
function convertNamedParams(query: string, params: NamedParams): { query: string; values: unknown[] } {
  const values: unknown[] = [];
  const paramMap = new Map<string, number>();

  const convertedQuery = query.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, name) => {
    if (!paramMap.has(name)) {
      if (!(name in params)) {
        throw new Error(`Missing parameter: ${name}`);
      }
      paramMap.set(name, values.length + 1);
      values.push(params[name]);
    }
    return `$${paramMap.get(name)}`;
  });

  return { query: convertedQuery, values };
}

/**
 * Check if params is a named params object (not an array)
 */
function isNamedParams(params: unknown[] | NamedParams): params is NamedParams {
  return params !== null && typeof params === 'object' && !Array.isArray(params);
}

/**
 * Create a Postgate-backed SQL client from a token
 */
function createPostgateClientFromToken(baseUrl: string, token: string): PostgateSqlClient {
  const client = new PostgateClient(baseUrl, token);

  return async function sql<T = Record<string, unknown>>(
    query: string,
    params?: unknown[] | NamedParams
  ): Promise<SqlResult<T>> {
    let finalQuery = query;
    let finalParams: unknown[] = [];

    if (params) {
      if (isNamedParams(params)) {
        const converted = convertNamedParams(query, params);
        finalQuery = converted.query;
        finalParams = converted.values;
      } else {
        finalParams = params;
      }
    }

    const result = await client.query<T>(finalQuery, finalParams);

    // Return array-like result with count property
    const rows = result.rows as SqlResult<T>;
    rows.count = result.row_count;
    return rows;
  };
}

/**
 * Create a SQL client for a specific database via postgate
 * @param token - The pg_xxx token for authentication
 */
export function createSqlClient(token: string): PostgateSqlClient {
  return createPostgateClientFromToken(postgateConfig.url, token);
}

/**
 * Create a SQL client for the admin database (tenant management)
 * Uses the admin token from config
 */
export function createAdminSqlClient(): PostgateSqlClient {
  return createPostgateClientFromToken(postgateConfig.url, postgateConfig.adminToken);
}

// Default export: openworkers database client (uses openworkers token)
export const sql = createPostgateClientFromToken(postgateConfig.url, postgateConfig.openworkersToken);
