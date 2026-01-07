import { postgate as postgateConfig } from '../config';

export interface PostgateQueryRequest {
  sql: string;
  params?: unknown[];
}

export interface PostgateQueryResponse<T = Record<string, unknown>> {
  rows: T[];
  row_count: number;
}

export interface PostgateError {
  error: string;
  message?: string;
}

export type TokenPermission = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP';

export const TENANT_PERMISSIONS: TokenPermission[] = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'ALTER',
  'DROP'
];
export const DEFAULT_PERMISSIONS: TokenPermission[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

/**
 * HTTP client for postgate - secure PostgreSQL proxy
 * Uses API tokens (pg_xxx format) for authentication
 */
export class PostgateClient {
  protected baseUrl: string;
  protected token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = token;
  }

  /**
   * Execute a SQL query against a tenant database
   */
  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<PostgateQueryResponse<T>> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify({ sql, params } satisfies PostgateQueryRequest)
    });

    if (!response.ok) {
      const error = (await response.json()) as PostgateError;
      throw new Error(error.message || error.error || `Postgate error: ${response.status}`);
    }

    return response.json() as Promise<PostgateQueryResponse<T>>;
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Postgate health check failed: ${response.status}`);
    }
    return response.json() as Promise<{ status: string }>;
  }
}

interface CreateTokenResult {
  id: string;
  token: string;
}

/**
 * Admin client for postgate - manages tokens and databases via SQL
 * Uses the main token for authentication (access to public schema)
 */
export class PostgateAdminClient extends PostgateClient {
  /**
   * Create a new token for a database using PL/pgSQL function
   * Returns the token secret - must be shown to user only once
   */
  async createToken(
    databaseId: string,
    name: string = 'default',
    permissions: TokenPermission[] = DEFAULT_PERMISSIONS
  ): Promise<CreateTokenResult> {
    const result = await this.query<CreateTokenResult>('SELECT * FROM create_tenant_token($1::uuid, $2, $3::text[])', [
      databaseId,
      name,
      permissions
    ]);

    if (result.rows.length === 0) {
      throw new Error('Failed to create token');
    }

    return result.rows[0]!;
  }

  /**
   * Delete a token using PL/pgSQL function
   */
  async deleteToken(tokenId: string): Promise<boolean> {
    const result = await this.query<{ delete_tenant_token: boolean }>('SELECT delete_tenant_token($1::uuid)', [
      tokenId
    ]);

    return result.rows[0]?.delete_tenant_token ?? false;
  }
}

// Admin client singleton - uses token from config
export const postgateAdminClient = new PostgateAdminClient(postgateConfig.url, postgateConfig.token);
