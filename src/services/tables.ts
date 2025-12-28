import { sql } from './db/client';
import * as db from './db/databases';
import type { ITableInfo, IColumnInfo, IColumnDefinition } from '../types';

export class TablesService {
  /**
   * List all tables in a database schema
   */
  async listTables(userId: string, databaseId: string): Promise<ITableInfo[]> {
    // Get database config to find schema name
    const dbConfig = await db.findDatabaseById(userId, databaseId);

    if (!dbConfig) {
      throw new Error('Database not found');
    }

    if (dbConfig.provider !== 'platform') {
      throw new Error('Table management only available for platform databases');
    }

    if (!dbConfig.schemaName) {
      throw new Error('Schema not configured');
    }

    const rows = await sql<{ table_name: string; row_count: string }>(
      `SELECT * FROM list_tenant_tables($1::uuid, $2)`,
      [userId, dbConfig.schemaName]
    );

    return rows.map((row) => ({
      name: row.table_name,
      rowCount: parseInt(row.row_count, 10)
    }));
  }

  /**
   * Get column information for a table
   */
  async describeTable(userId: string, databaseId: string, tableName: string): Promise<IColumnInfo[]> {
    const dbConfig = await db.findDatabaseById(userId, databaseId);

    if (!dbConfig) {
      throw new Error('Database not found');
    }

    if (dbConfig.provider !== 'platform') {
      throw new Error('Table management only available for platform databases');
    }

    if (!dbConfig.schemaName) {
      throw new Error('Schema not configured');
    }

    const rows = await sql<{
      column_name: string;
      data_type: string;
      is_nullable: boolean;
      column_default: string | null;
      is_primary_key: boolean;
    }>(`SELECT * FROM describe_tenant_table($1::uuid, $2, $3)`, [userId, dbConfig.schemaName, tableName]);

    return rows.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable,
      defaultValue: row.column_default,
      primaryKey: row.is_primary_key
    }));
  }

  /**
   * Create a new table
   */
  async createTable(
    userId: string,
    databaseId: string,
    tableName: string,
    columns: IColumnDefinition[]
  ): Promise<void> {
    const dbConfig = await db.findDatabaseById(userId, databaseId);

    if (!dbConfig) {
      throw new Error('Database not found');
    }

    if (dbConfig.provider !== 'platform') {
      throw new Error('Table management only available for platform databases');
    }

    if (!dbConfig.schemaName) {
      throw new Error('Schema not configured');
    }

    await sql(`SELECT create_tenant_table($1::uuid, $2, $3, $4::jsonb)`, [
      userId,
      dbConfig.schemaName,
      tableName,
      JSON.stringify(columns)
    ]);
  }

  /**
   * Drop a table
   */
  async dropTable(userId: string, databaseId: string, tableName: string): Promise<void> {
    const dbConfig = await db.findDatabaseById(userId, databaseId);

    if (!dbConfig) {
      throw new Error('Database not found');
    }

    if (dbConfig.provider !== 'platform') {
      throw new Error('Table management only available for platform databases');
    }

    if (!dbConfig.schemaName) {
      throw new Error('Schema not configured');
    }

    await sql(`SELECT drop_tenant_table($1::uuid, $2, $3)`, [userId, dbConfig.schemaName, tableName]);
  }

  /**
   * Add a column to a table
   */
  async addColumn(
    userId: string,
    databaseId: string,
    tableName: string,
    column: IColumnDefinition
  ): Promise<void> {
    const dbConfig = await db.findDatabaseById(userId, databaseId);

    if (!dbConfig) {
      throw new Error('Database not found');
    }

    if (dbConfig.provider !== 'platform') {
      throw new Error('Table management only available for platform databases');
    }

    if (!dbConfig.schemaName) {
      throw new Error('Schema not configured');
    }

    await sql(`SELECT add_tenant_column($1::uuid, $2, $3, $4::jsonb)`, [
      userId,
      dbConfig.schemaName,
      tableName,
      JSON.stringify(column)
    ]);
  }

  /**
   * Drop a column from a table
   */
  async dropColumn(userId: string, databaseId: string, tableName: string, columnName: string): Promise<void> {
    const dbConfig = await db.findDatabaseById(userId, databaseId);

    if (!dbConfig) {
      throw new Error('Database not found');
    }

    if (dbConfig.provider !== 'platform') {
      throw new Error('Table management only available for platform databases');
    }

    if (!dbConfig.schemaName) {
      throw new Error('Schema not configured');
    }

    await sql(`SELECT drop_tenant_column($1::uuid, $2, $3, $4)`, [
      userId,
      dbConfig.schemaName,
      tableName,
      columnName
    ]);
  }
}

export const tablesService = new TablesService();
