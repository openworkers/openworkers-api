// Global types
declare global {
  type hex = string;
  type uuid = string;
  type timestamp = number;
  type Dictionary<T> = Record<string, T>;
}

// Types-only exports (no Zod runtime, lightweight for frontend)
export type {
  Timestamps,
  Resource
} from './schemas/base.schema';

export type {
  ILoginResponse
} from './schemas/auth.schema';

export type {
  ISelf,
  IResourceLimits
} from './schemas/user.schema';

export type {
  ILog
} from './schemas/log.schema';

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

export type {
  ICron,
  ICronExpressionInput,
  ICronCreateInput,
  ICronUpdateInput
} from './schemas/cron.schema';

export {
  WorkerSchema,
  WorkerCreateInputSchema,
  WorkerUpdateInputSchema,
  WorkerLanguageSchema,
  DomainSchema
} from './schemas/worker.schema';

export type {
  IWorker,
  IWorkerLanguage,
  IWorkerCreateInput,
  IWorkerUpdateInput,
  IDomain
} from './schemas/worker.schema';

// Utility types
export type ITokenType = 'create_account' | 'reset_password';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
