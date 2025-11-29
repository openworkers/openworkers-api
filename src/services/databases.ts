import { createAdminSqlClient } from './db/client';
import { postgateAdminClient, TENANT_PERMISSIONS } from './postgate';
import * as db from './db/databases';
import type { IDatabase, IDatabaseCreateInput } from '../types';

// Admin SQL client for postgate database management
const adminSql = createAdminSqlClient();

interface PostgateDatabaseRow {
  id: string;
}

export class DatabasesService {
  /**
   * Create a new tenant database
   * 1. Create entry in postgate_databases (via admin sql)
   * 2. Create entry in openworkers databases table
   * Token is created later via POST /databases/:id/token
   */
  async create(userId: string, input: IDatabaseCreateInput): Promise<IDatabase> {
    const { name, desc, max_rows } = input;

    // Create tenant database using PL/pgSQL function (creates schema + entry)
    // Pass random name to postgate - user's display name stays in openworkers only
    const postgateResult = await adminSql<PostgateDatabaseRow>(
      `SELECT id FROM create_tenant_database($1, $2::integer)`,
      [crypto.randomUUID(), max_rows || 1000]
    );

    if (postgateResult.length === 0) {
      throw new Error('Failed to create database in postgate');
    }

    const postgateDb = postgateResult[0]!;

    // Create in openworkers (no token yet)
    const owDb = await db.createDatabase(userId, name, postgateDb.id, desc);

    return {
      id: owDb.id,
      name: owDb.name,
      desc: owDb.desc,
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
      desc: row.desc,
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
      desc: row.desc,
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

    // Delete from postgate using PL/pgSQL function (drops schema + deletes entry)
    await adminSql(`SELECT delete_tenant_database($1::uuid)`, [owDb.postgateId]);

    // Delete from openworkers
    const deleted = await db.deleteDatabase(userId, id);

    return deleted > 0;
  }

  /**
   * Regenerate token for a database
   * 1. Delete existing token (if any)
   * 2. Create new token via postgate API
   * 3. Update token_id in openworkers
   * Returns the new token (shown only once)
   */
  async regenerateToken(userId: string, id: string): Promise<{ token: string; tokenId: string } | null> {
    // Get openworkers entry
    const owDb = await db.findDatabaseById(userId, id);
    if (!owDb) {
      return null;
    }

    // Delete existing token if there is one
    if (owDb.tokenId) {
      try {
        await postgateAdminClient.deleteToken(owDb.tokenId);
      } catch {
        // Token might already be deleted, continue
      }
    }

    // Create new token with tenant permissions (DML + DDL)
    const tokenResponse = await postgateAdminClient.createToken(owDb.postgateId, 'default', TENANT_PERMISSIONS);

    // Update token_id in openworkers
    await db.updateTokenId(userId, id, tokenResponse.id);

    return {
      token: tokenResponse.token,
      tokenId: tokenResponse.id
    };
  }
}

export const databasesService = new DatabasesService();
