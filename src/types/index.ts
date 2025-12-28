// Global types
declare global {
  type hex = string;
  type uuid = string;
  type timestamp = number;
  type Dictionary<T> = Record<string, T>;
}

export interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
}

// Types-only exports (no Zod runtime, lightweight for frontend)
export type { IResource } from './schemas/base.schema';
export type { ITimestamps } from './schemas/base.schema';

export { LoginResponseSchema } from './schemas/auth.schema';
export type { ILoginResponse } from './schemas/auth.schema';

export { SelfSchema, ResourceLimitsSchema } from './schemas/user.schema';
export type { ISelf, IResourceLimits } from './schemas/user.schema';

export type { ILog } from './schemas/log.schema';

export {
  EnvironmentSchema,
  EnvironmentCreateInputSchema,
  EnvironmentUpdateInputSchema,
  EnvironmentValueSchema,
  EnvironmentValueUpdateInputSchema
} from './schemas/environment.schema';

export type {
  IEnvironment,
  IEnvironmentValue,
  IEnvironmentCreateInput,
  IEnvironmentUpdateInput,
  IEnvironmentValueUpdateInput
} from './schemas/environment.schema';

export { CronSchema, CronCreateInputSchema, CronUpdateInputSchema } from './schemas/cron.schema';

export type { ICron, ICronExpressionInput, ICronCreateInput, ICronUpdateInput } from './schemas/cron.schema';

export { DomainSchema, DomainCreateInputSchema } from './schemas/domain.schema';

export type { IDomain, IDomainCreateInput } from './schemas/domain.schema';

export {
  WorkerSchema,
  WorkerCreateInputSchema,
  WorkerUpdateInputSchema,
  WorkerLanguageSchema
} from './schemas/worker.schema';

export type { IWorker, IWorkerLanguage, IWorkerCreateInput, IWorkerUpdateInput } from './schemas/worker.schema';

export {
  DatabaseSchema,
  DatabaseCreateInputSchema,
  DatabaseProviderSchema,
  ColumnDefinitionSchema,
  ColumnInfoSchema,
  TableInfoSchema,
  TableDetailsSchema,
  CreateTableInputSchema
} from './schemas/database.schema';

export type {
  IDatabase,
  IDatabaseCreateInput,
  DatabaseProvider,
  IColumnDefinition,
  IColumnInfo,
  ITableInfo,
  ITableDetails,
  ICreateTableInput
} from './schemas/database.schema';

export {
  KvNamespaceSchema,
  KvNamespaceCreateInputSchema,
  KvNamespaceUpdateInputSchema
} from './schemas/kv.schema';

export type {
  IKvNamespace,
  IKvNamespaceCreateInput,
  IKvNamespaceUpdateInput
} from './schemas/kv.schema';

export {
  StorageConfigSchema,
  StorageConfigCreateInputSchema,
  StorageConfigUpdateInputSchema,
  MASKED_SECRET
} from './schemas/storage.schema';

export type {
  IStorageConfig,
  IStorageConfigCreateInput,
  IStorageConfigUpdateInput
} from './schemas/storage.schema';
