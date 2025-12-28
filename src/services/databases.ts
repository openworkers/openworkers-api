import { sql } from './db/client';
import * as db from './db/databases';
import type { IDatabase, IDatabaseCreateInput } from '../types';

/**
 * Generate a unique schema name for platform provider
 * Format: tenant_<uuid_with_underscores>
 */
function generateSchemaName(): string {
  return `tenant_${crypto.randomUUID().replace(/-/g, '_')}`;
}

/**
 * Map database row to API response
 */
function toApiResponse(row: {
  id: string;
  name: string;
  desc: string | null;
  provider: 'platform' | 'postgres';
  maxRows: number;
  timeoutSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}): IDatabase {
  return {
    id: row.id,
    name: row.name,
    desc: row.desc,
    provider: row.provider,
    maxRows: row.maxRows,
    timeoutSeconds: row.timeoutSeconds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DatabasesService {
  /**
   * Create a new database config
   * - platform provider: creates schema on shared pool
   * - postgres provider: stores connection string
   */
  async create(userId: string, input: IDatabaseCreateInput): Promise<IDatabase> {
    if (input.provider === 'platform') {
      // Generate unique schema name
      const schemaName = generateSchemaName();

      // Create schema on shared pool
      await sql(`SELECT create_tenant_schema($1)`, [schemaName]);

      // Create database config
      const row = await db.createPlatformDatabase(userId, {
        name: input.name,
        desc: input.desc,
        schemaName,
        maxRows: input.maxRows,
        timeoutSeconds: input.timeoutSeconds
      });

      return toApiResponse(row);
    } else {
      // postgres provider - store connection string directly
      const row = await db.createPostgresDatabase(userId, {
        name: input.name,
        desc: input.desc,
        connectionString: input.connectionString,
        maxRows: input.maxRows,
        timeoutSeconds: input.timeoutSeconds
      });

      return toApiResponse(row);
    }
  }

  /**
   * List all databases for a user
   */
  async findAll(userId: string): Promise<IDatabase[]> {
    const rows = await db.findAllDatabases(userId);
    return rows.map(toApiResponse);
  }

  /**
   * Get a specific database by ID
   */
  async findById(userId: string, id: string): Promise<IDatabase | null> {
    const row = await db.findDatabaseById(userId, id);

    if (!row) {
      return null;
    }

    return toApiResponse(row);
  }

  /**
   * Delete a database
   * - platform provider: drops schema from shared pool
   * - postgres provider: just removes config (no external cleanup)
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const row = await db.findDatabaseById(userId, id);

    if (!row) {
      return false;
    }

    // For platform provider, drop the schema
    if (row.provider === 'platform' && row.schemaName) {
      try {
        await sql(`SELECT drop_tenant_schema($1)`, [row.schemaName]);
      } catch (error) {
        console.error('Failed to drop schema:', error);
        // Continue with deletion even if schema drop fails
      }
    }

    const deleted = await db.deleteDatabase(userId, id);
    return deleted > 0;
  }

  /**
   * Update database config (name, desc, limits)
   * Note: provider and connection details cannot be changed
   */
  async update(
    userId: string,
    id: string,
    input: { name?: string; desc?: string | null; maxRows?: number; timeoutSeconds?: number }
  ): Promise<IDatabase | null> {
    const row = await db.updateDatabase(userId, id, input);

    if (!row) {
      return null;
    }

    return toApiResponse(row);
  }
}

export const databasesService = new DatabasesService();
