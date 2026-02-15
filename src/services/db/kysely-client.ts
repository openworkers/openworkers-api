import { Kysely, CamelCasePlugin } from 'kysely';
import type { Generated } from 'kysely';
import { SqlClientDialect } from './kysely-dialect';
import { sql, createSqlClient } from './sql-client';
import type { PostgateSqlClient } from './sql-client';
import type { DatabaseOperation } from '../../types/schemas/database-token.schema';

/**
 * Database schema interface (using camelCase thanks to CamelCasePlugin)
 */
export interface Database {
  users: {
    id: Generated<string>;
    username: string;
    email: string | null;
    passwordHash: string | null;
    avatarUrl: string | null;
    limitWorkers: Generated<number>;
    limitEnvironments: Generated<number>;
    limitDatabases: Generated<number>;
    limitKv: Generated<number>;
    limitStorage: Generated<number>;
    secondPrecision: Generated<boolean>;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  externalUsers: {
    id: Generated<string>;
    userId: string;
    externalId: string;
    provider: string;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  kvConfigs: {
    id: Generated<string>;
    userId: string;
    name: string;
    desc: string | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  kvData: {
    namespaceId: string;
    key: string;
    value: unknown; // JSONB
    expiresAt: Date | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  domains: {
    name: string;
    workerId: string;
    userId: string;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  storageConfigs: {
    id: Generated<string>;
    userId: string;
    name: string;
    desc: string | null;
    bucket: string;
    prefix: string | null;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string | null;
    region: string | null;
    publicUrl: string | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  apiKeys: {
    id: Generated<string>;
    userId: string;
    name: string;
    tokenPrefix: string;
    tokenHash: string;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Generated<Date>;
  };
  authTokens: {
    id: Generated<string>;
    userId: string;
    token: string;
    type: 'set_password' | 'password_reset';
    expiresAt: Date;
    createdAt: Generated<Date>;
  };
  crons: {
    id: Generated<string>;
    value: string;
    workerId: string;
    nextRun: Date;
    lastRun: Date | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  workers: {
    id: Generated<string>;
    name: string | null;
    userId: string;
    environmentId: string | null;
    projectId: string | null;
    currentVersion: number | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  environments: {
    id: Generated<string>;
    name: string;
    desc: string | null;
    userId: string;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  environmentValues: {
    id: Generated<string>;
    key: string;
    value: string;
    type: 'var' | 'secret' | 'assets' | 'storage' | 'kv' | 'database' | 'worker';
    environmentId: string;
    userId: string;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  databaseTokens: {
    id: Generated<string>;
    databaseId: string;
    name: string;
    tokenHash: string;
    tokenPrefix: string;
    allowedOperations: DatabaseOperation[];
    lastUsedAt: Date | null;
    createdAt: Generated<Date>;
  };
  databaseConfigs: {
    id: Generated<string>;
    userId: string;
    name: string;
    desc: string | null;
    provider: 'platform' | 'postgres';
    connectionString: string | null;
    schemaName: string | null;
    maxRows: number;
    timeoutSeconds: number;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };
  workerDeployments: {
    workerId: string;
    version: number;
    hash: string;
    codeType: 'javascript' | 'typescript' | 'python' | 'rust';
    code: Uint8Array;
    deployedBy: string;
    message: string | null;
    createdAt: Generated<Date>;
  };
  // Add more tables here as needed...
}

/**
 * Create a Kysely instance for a specific database
 *
 * @param token - The pg_xxx token for authentication
 *
 * @example
 * ```typescript
 * import { createKyselyClient } from './services/db/kysely-client';
 *
 * const db = createKyselyClient('pg_xxx...');
 *
 * // Type-safe queries
 * const users = await db
 *   .selectFrom('users')
 *   .select(['id', 'email'])
 *   .where('email', 'like', '%@example.com')
 *   .execute();
 * ```
 */
export function createKyselyClient(token: string): Kysely<Database> {
  const sqlClient = createSqlClient(token);

  return new Kysely<Database>({
    dialect: new SqlClientDialect({ client: sqlClient }),
    plugins: [new CamelCasePlugin()]
  });
}

/**
 * Default Kysely client: uses DATABASE binding if available, otherwise Postgate HTTP
 */
export const kysely = new Kysely<Database>({
  dialect: new SqlClientDialect({ client: sql }),
  plugins: [new CamelCasePlugin()]
});
