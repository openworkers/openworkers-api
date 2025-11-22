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
export type { Timestamps, Resource } from "./schemas/base.schema";

export type { ILoginResponse } from "./schemas/auth.schema";

export type { ISelf, IResourceLimits } from "./schemas/user.schema";

export type { ILog } from "./schemas/log.schema";

export {
  EnvironmentSchema,
  EnvironmentCreateInputSchema,
  EnvironmentUpdateInputSchema,
  EnvironmentValueSchema,
  EnvironmentValueUpdateInputSchema,
} from "./schemas/environment.schema";

export type {
  IEnvironment,
  IEnvironmentValue,
  IEnvironmentCreateInput,
  IEnvironmentUpdateInput,
  IEnvironmentValueUpdateInput,
} from "./schemas/environment.schema";

export type {
  ICron,
  ICronExpressionInput,
  ICronCreateInput,
  ICronUpdateInput,
} from "./schemas/cron.schema";

export {
  WorkerSchema,
  WorkerCreateInputSchema,
  WorkerUpdateInputSchema,
  WorkerLanguageSchema,
  DomainSchema,
} from "./schemas/worker.schema";

export type {
  IWorker,
  IWorkerLanguage,
  IWorkerCreateInput,
  IWorkerUpdateInput,
  IDomain,
} from "./schemas/worker.schema";
