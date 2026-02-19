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
 * SQL client interface - supports both positional ($1, $2) and named ($name) params
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
 * Resolve query params (named → positional conversion)
 */
function resolveParams(query: string, params?: unknown[] | NamedParams): { query: string; params: unknown[] } {
  if (!params) {
    return { query, params: [] };
  }

  if (isNamedParams(params)) {
    const converted = convertNamedParams(query, params);
    return { query: converted.query, params: converted.values };
  }

  return { query, params };
}

/**
 * Database binding interface (worker runtime)
 */
interface DatabaseBinding {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
}

/**
 * Create a SQL client backed by a DATABASE binding (worker runtime)
 */
function createBindingSqlClient(db: DatabaseBinding): PostgateSqlClient {
  return async function sql<T = Record<string, unknown>>(
    query: string,
    params?: unknown[] | NamedParams
  ): Promise<SqlResult<T>> {
    const resolved = resolveParams(query, params);
    const rows = (await db.query(resolved.query, resolved.params)) as SqlResult<T>;
    return rows;
  };
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
    const resolved = resolveParams(query, params);
    const result = await client.query<T>(resolved.query, resolved.params);

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
 * Get the default SQL client: DATABASE binding if available, otherwise Postgate HTTP
 */
function getDefaultSqlClient(): PostgateSqlClient {
  const binding = (globalThis as any).env?.DATABASE as DatabaseBinding | undefined;

  if (binding?.query) {
    console.log('Using DATABASE binding for SQL client');
    return createBindingSqlClient(binding);
  }

  if (postgateConfig.token) {
    return createPostgateClientFromToken(postgateConfig.url, postgateConfig.token);
  }

  throw new Error('No database client available: neither DATABASE binding nor POSTGATE_TOKEN configured');
}

// Default SQL client for OpenWorkers database
export const sql = getDefaultSqlClient();
