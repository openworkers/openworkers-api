import type {
  CompiledQuery,
  DatabaseConnection,
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  QueryCompiler,
  QueryResult,
} from 'kysely';

import {
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from 'kysely';

import type { PostgateSqlClient } from './sql-client';

/**
 * Configuration for the SQL client dialect
 */
export interface SqlClientDialectConfig {
  /**
   * The SQL client (handles both DATABASE binding and Postgate HTTP)
   */
  client: PostgateSqlClient;
}

/**
 * Kysely dialect using SQL client (supports both DATABASE binding and Postgate HTTP)
 *
 * This dialect uses the existing SQL client which automatically chooses between:
 * - DATABASE binding (Cloudflare Workers) in production
 * - Postgate HTTP proxy in development
 *
 * Limitations:
 * - No native transaction support (use PL/pgSQL procedures instead)
 * - No streaming support
 *
 * @example
 * ```typescript
 * import { Kysely } from 'kysely';
 * import { SqlClientDialect } from './services/db/kysely-dialect';
 * import { sql } from './services/db/sql-client';
 *
 * const db = new Kysely<Database>({
 *   dialect: new SqlClientDialect({ client: sql })
 * });
 *
 * // Simple queries
 * const users = await db.selectFrom('users').selectAll().execute();
 *
 * // Call PL/pgSQL procedures for transactions
 * const result = await sql`SELECT * FROM create_user(${name}, ${email})`.execute(db);
 * ```
 */
export class SqlClientDialect implements Dialect {
  readonly #config: SqlClientDialectConfig;

  constructor(config: SqlClientDialectConfig) {
    this.#config = { ...config };
  }

  createAdapter(): DialectAdapter {
    return new PostgresAdapter();
  }

  createDriver(): Driver {
    return new SqlClientDriver(this.#config);
  }

  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler();
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new PostgresIntrospector(db);
  }
}

/**
 * Driver implementation using SQL client
 *
 * The SQL client handles both DATABASE binding and Postgate HTTP automatically.
 */
class SqlClientDriver implements Driver {
  readonly #config: SqlClientDialectConfig;

  constructor(config: SqlClientDialectConfig) {
    this.#config = config;
  }

  async init(): Promise<void> {
    // No initialization needed
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    return new SqlClientConnection(this.#config.client);
  }

  async releaseConnection(_connection: DatabaseConnection): Promise<void> {
    // No cleanup needed
  }

  async destroy(): Promise<void> {
    // No cleanup needed
  }

  async beginTransaction(): Promise<void> {
    throw new Error('Transactions not supported. Use PL/pgSQL procedures instead.');
  }

  async commitTransaction(): Promise<void> {
    throw new Error('Transactions not supported. Use PL/pgSQL procedures instead.');
  }

  async rollbackTransaction(): Promise<void> {
    throw new Error('Transactions not supported. Use PL/pgSQL procedures instead.');
  }
}

/**
 * Connection implementation using SQL client
 */
class SqlClientConnection implements DatabaseConnection {
  readonly #client: PostgateSqlClient;

  constructor(client: PostgateSqlClient) {
    this.#client = client;
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const result = await this.#client<R>(compiledQuery.sql, compiledQuery.parameters as unknown[]);

    // Map SqlResult to Kysely QueryResult
    return {
      rows: result,
      numAffectedRows: result.count !== undefined ? BigInt(result.count) : undefined,
    };
  }

  async *streamQuery<R>(
    _compiledQuery: CompiledQuery,
    _chunkSize: number
  ): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('Streaming queries not supported');
  }
}
