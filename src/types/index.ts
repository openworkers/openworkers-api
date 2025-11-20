export interface User {
  id: string;
  username: string;
  avatar_url?: string;
  resource_limits?: {
    workers: number;
    environments: number;
    secondPrecision: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

export interface Worker {
  id: string;
  name: string;
  script: string;
  language: 'javascript' | 'typescript';
  user_id: string;
  environment_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Environment {
  id: string;
  name: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface EnvironmentValue {
  id: string;
  key: string;
  value: string;
  secret: boolean;
  environment_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Domain {
  name: string;
  worker_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Cron {
  id: string;
  value: string;
  worker_id: string;
  next_run?: Date;
  last_run?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}
