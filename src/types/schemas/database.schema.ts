import { z } from 'zod';
import { ResourceSchema, ResourceCreateInputSchema } from './base.schema';

// Database provider enum
export const DatabaseProviderSchema = z.enum(['platform', 'postgres']);
export type DatabaseProvider = z.infer<typeof DatabaseProviderSchema>;

// Database schema (extends Resource: id, name, desc, createdAt, updatedAt)
export const DatabaseSchema = ResourceSchema.extend({
  provider: DatabaseProviderSchema,
  // Connection string (for postgres provider) - not exposed to API responses
  // Schema name (for platform provider) - not exposed to API responses
  maxRows: z.number().int().positive(),
  timeoutSeconds: z.number().int().positive()
});

// Create input for platform provider (shared multi-tenant)
export const DatabaseCreatePlatformInputSchema = ResourceCreateInputSchema.extend({
  provider: z.literal('platform').default('platform'),
  maxRows: z.number().int().positive().max(10000).default(1000),
  timeoutSeconds: z.number().int().positive().max(300).default(30)
});

// Create input for postgres provider (direct connection)
export const DatabaseCreatePostgresInputSchema = ResourceCreateInputSchema.extend({
  provider: z.literal('postgres'),
  connectionString: z.string().min(1),
  maxRows: z.number().int().positive().max(10000).default(1000),
  timeoutSeconds: z.number().int().positive().max(300).default(30)
});

// Union of create inputs
export const DatabaseCreateInputSchema = z.discriminatedUnion('provider', [
  DatabaseCreatePlatformInputSchema,
  DatabaseCreatePostgresInputSchema
]);

// ============================================================================
// Table and Column schemas
// ============================================================================

// Column definition for creating tables/columns
export const ColumnDefinitionSchema = z.object({
  name: z.string().min(1).max(63).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  type: z.string().min(1).max(100),
  primaryKey: z.boolean().optional(),
  notNull: z.boolean().optional(),
  unique: z.boolean().optional(),
  default: z.string().max(255).optional()
});

// Column info returned from describe
export const ColumnInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  defaultValue: z.string().nullable(),
  primaryKey: z.boolean()
});

// Table info returned from list
export const TableInfoSchema = z.object({
  name: z.string(),
  rowCount: z.number().int()
});

// Table details with columns
export const TableDetailsSchema = z.object({
  name: z.string(),
  columns: z.array(ColumnInfoSchema)
});

// Create table input
export const CreateTableInputSchema = z.object({
  name: z.string().min(1).max(63).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  columns: z.array(ColumnDefinitionSchema).min(1).max(100)
});

// Types
export type IDatabase = z.infer<typeof DatabaseSchema>;
export type IDatabaseCreateInput = z.infer<typeof DatabaseCreateInputSchema>;
export type IColumnDefinition = z.infer<typeof ColumnDefinitionSchema>;
export type IColumnInfo = z.infer<typeof ColumnInfoSchema>;
export type ITableInfo = z.infer<typeof TableInfoSchema>;
export type ITableDetails = z.infer<typeof TableDetailsSchema>;
export type ICreateTableInput = z.infer<typeof CreateTableInputSchema>;
