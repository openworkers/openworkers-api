import { createAdminSqlClient } from './db/client';
import * as db from './db/databases';
import type { IDatabase, IDatabaseCreateInput } from '../types';

// Admin SQL client for postgate database management
const adminSql = createAdminSqlClient();

interface PostgateDatabaseRow {
  id: string;
  name: string;
  schema_name: string | null;
}

export class DatabasesService {
  /**
   * Create a new tenant database
   * 1. Create entry in postgate_databases (via admin sql)
   * 2. Create entry in openworkers databases table
   */
  async create(userId: string, input: IDatabaseCreateInput): Promise<IDatabase> {
    const { name, allowed_operations, max_rows, timeout_seconds } = input;

    // Generate schema name
    const schemaName = `tenant_${userId.substring(0, 8)}_${name}`;

    // Build rules JSON
    const rules = {
      allowed_operations: allowed_operations || ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      max_rows: max_rows || 1000,
      timeout_seconds: timeout_seconds || 30
    };

    // Create in postgate
    const postgateResult = await adminSql<PostgateDatabaseRow>(
      `INSERT INTO postgate_databases (name, backend_type, schema_name, rules)
      VALUES ($1, 'schema', $2, $3::jsonb)
      RETURNING id, name, schema_name`,
      [name, schemaName, JSON.stringify(rules)]
    );

    if (postgateResult.length === 0) {
      throw new Error('Failed to create database in postgate');
    }

    const postgateDb = postgateResult[0]!;

    // Create in openworkers
    const owDb = await db.createDatabase(userId, name, postgateDb.id, postgateDb.schema_name);

    return {
      id: owDb.id,
      name: owDb.name,
      desc: null,
      schemaName: owDb.schemaName ?? undefined,
      createdAt: owDb.createdAt,
      updatedAt: owDb.updatedAt
    };
  }

  /**
   * List all databases for a user
   */
  async findAll(userId: string): Promise<IDatabase[]> {
    const rows = await db.findAllDatabases(userId);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      desc: null,
      schemaName: row.schemaName ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  /**
   * Get a specific database by ID
   */
  async findById(userId: string, id: string): Promise<IDatabase | null> {
    const row = await db.findDatabaseById(userId, id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      desc: null,
      schemaName: row.schemaName ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Delete a database
   * 1. Get openworkers db entry to find postgate_id
   * 2. Delete from postgate
   * 3. Delete from openworkers
   */
  async delete(userId: string, id: string): Promise<boolean> {
    // Get openworkers entry
    const owDb = await db.findDatabaseById(userId, id);
    if (!owDb) {
      return false;
    }

    // Delete from postgate
    await adminSql(
      `DELETE FROM postgate_databases WHERE id = $1::uuid`,
      [owDb.postgateId]
    );

    // Delete from openworkers
    const deleted = await db.deleteDatabase(userId, id);

    return deleted > 0;
  }
}

export const databasesService = new DatabasesService();
