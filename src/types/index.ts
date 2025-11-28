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
export type { Timestamps, Resource } from './schemas/base.schema';

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
  SqlOperationSchema,
  DatabaseRulesSchema
} from './schemas/database.schema';

export type { IDatabase, IDatabaseCreateInput, ISqlOperation, IDatabaseRules } from './schemas/database.schema';
