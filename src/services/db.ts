/**
 * Database service abstraction.
 *
 * Uses Bun's native Postgres client for now.
 * Can be swapped with postgres-gateway later by changing this file only.
 */

import { sql as bunSql } from 'bun';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbService {
  query<T = any>(query: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T>;
}

export interface DbTransaction {
  query<T = any>(query: string, params?: any[]): Promise<QueryResult<T>>;
}

class BunPostgresService implements DbService {
  private sql: ReturnType<typeof bunSql>;

  constructor(connectionString: string) {
    this.sql = bunSql(connectionString);
  }

  async query<T = any>(query: string, params: any[] = []): Promise<QueryResult<T>> {
    const result = await this.sql(query, params);

    return {
      rows: result as T[],
      rowCount: Array.isArray(result) ? result.length : 0,
    };
  }

  async transaction<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T> {
    // Bun's sql doesn't have explicit transaction API yet
    // We'll use BEGIN/COMMIT manually
    await this.sql`BEGIN`;

    try {
      const tx: DbTransaction = {
        query: async <T>(query: string, params: any[] = []) => {
          const result = await this.sql(query, params);
          return {
            rows: result as T[],
            rowCount: Array.isArray(result) ? result.length : 0,
          };
        }
      };

      const result = await callback(tx);
      await this.sql`COMMIT`;
      return result;
    } catch (error) {
      await this.sql`ROLLBACK`;
      throw error;
    }
  }

  async close() {
    // Bun sql doesn't expose close method
    // Connection is managed automatically
  }
}

// Singleton instance
let dbInstance: DbService | null = null;

export function initDb(connectionString: string): DbService {
  if (!dbInstance) {
    dbInstance = new BunPostgresService(connectionString);
  }
  return dbInstance;
}

export function getDb(): DbService {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}

// Future: Gateway implementation
// class GatewayDbService implements DbService {
//   private gatewayUrl: string;
//
//   constructor(gatewayUrl: string) {
//     this.gatewayUrl = gatewayUrl;
//   }
//
//   async query<T>(query: string, params?: any[]): Promise<QueryResult<T>> {
//     const response = await fetch(`${this.gatewayUrl}/query`, {
//       method: 'POST',
//       body: JSON.stringify({ query, params })
//     });
//     return response.json();
//   }
// }
