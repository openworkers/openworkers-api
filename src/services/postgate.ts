import { postgate as postgateConfig, jwt as jwtConfig } from '../config';
import { sign } from 'hono/jwt';

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

/**
 * HTTP client for postgate - secure PostgreSQL proxy
 */
export class PostgateClient {
  private baseUrl: string;
  private jwtSecret: string;

  constructor(baseUrl: string, jwtSecret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.jwtSecret = jwtSecret;
  }

  /**
   * Generate a JWT token for a specific database
   */
  private async generateToken(databaseId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: databaseId,
      iat: now,
      exp: now + 3600 // 1 hour expiry
    };

    return sign(payload, this.jwtSecret);
  }

  /**
   * Execute a SQL query against a tenant database
   */
  async query<T = Record<string, unknown>>(
    databaseId: string,
    sql: string,
    params?: unknown[]
  ): Promise<PostgateQueryResponse<T>> {
    const token = await this.generateToken(databaseId);

    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
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

// Singleton instance using config - uses postgate secret if configured, else falls back to API JWT secret
const jwtSecret = postgateConfig.jwtSecret || jwtConfig.access.secret;
export const postgateClient = new PostgateClient(postgateConfig.url, jwtSecret);
