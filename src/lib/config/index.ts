import { z } from 'zod';

/**
 * Read an environment variable from worker runtime (globalThis.env) or Bun/Node (process.env).
 */
function getEnv(key: string): string | undefined {
  if (typeof globalThis !== 'undefined' && (globalThis as any).env) {
    const val = (globalThis as any).env[key];

    if (val !== undefined) {
      return String(val);
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }

  return undefined;
}

// UUID-like pattern (less strict than RFC 4122)
const uuidLike = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid UUID format');

// Environment schema
const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test']);

// Check if DATABASE binding is available (worker runtime)
const hasDatabaseBinding = !!(globalThis as any).env?.DATABASE?.query;

// Configuration schema
const ConfigSchema = z.object({
  // Environment
  nodeEnv: EnvironmentSchema.default('development'),

  // Server
  port: z.coerce.number().int().positive().default(7000),

  // JWT
  jwt: z.object({
    access: z.object({
      secret: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
      expiresIn: z.string().default('15m')
    }),
    refresh: z.object({
      secret: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
      expiresIn: z.string().default('18h')
    })
  }),

  // GitHub OAuth
  github: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional()
  }),

  // Postgate (SQL proxy)
  postgate: z.object({
    url: z.url().default('http://localhost:6080'),
    // Token (pg_xxx format) - for accessing OpenWorkers database
    token: (() => {
      const pgToken = z.string().regex(/^pg_[a-f0-9]{64}$/, 'POSTGATE_TOKEN must be a valid pg_xxx token');
      return hasDatabaseBinding ? pgToken.optional() : pgToken;
    })(),
    // Secret for generating deterministic system tokens
    systemTokenSecret: z.string().min(32, 'POSTGATE_SYSTEM_TOKEN_SECRET must be at least 32 characters')
  }),

  // Shared S3/R2 for assets and storage bindings
  sharedStorage: z.object({
    bucket: z.string().optional(),
    endpoint: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    publicUrl: z.string().optional()
  }),

  // AI Services
  mistral: z.object({
    apiKey: z.string().optional()
  }),

  anthropic: z.object({
    apiKey: z.string().optional()
  }),

  // Email provider (verification, password reset)
  email: z.object({
    provider: z.enum(['scaleway']).optional(),
    from: z.string().default('noreply@openworkers.dev'),
    // Scaleway-specific
    secretKey: z.string().optional(),
    projectId: z.string().optional(),
    region: z.string().default('fr-par')
  }),

  // App URLs for email links
  appUrl: z.string().url().default('http://localhost:4200')
});

// Type inference
export type Config = z.infer<typeof ConfigSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;

// Parse and validate environment variables
function loadConfig(): Config {
  const rawConfig = {
    nodeEnv: getEnv('NODE_ENV'),
    port: getEnv('PORT'),
    jwt: {
      access: {
        secret: getEnv('JWT_ACCESS_SECRET'),
        expiresIn: getEnv('JWT_ACCESS_EXP')
      },
      refresh: {
        secret: getEnv('JWT_REFRESH_SECRET'),
        expiresIn: getEnv('JWT_REFRESH_EXP')
      }
    },
    github: {
      clientId: getEnv('GITHUB_CLIENT_ID'),
      clientSecret: getEnv('GITHUB_CLIENT_SECRET')
    },
    postgate: {
      url: getEnv('POSTGATE_URL'),
      token: getEnv('POSTGATE_TOKEN'),
      systemTokenSecret: getEnv('POSTGATE_SYSTEM_TOKEN_SECRET')
    },
    sharedStorage: {
      bucket: getEnv('SHARED_STORAGE_BUCKET'),
      endpoint: getEnv('SHARED_STORAGE_ENDPOINT'),
      accessKeyId: getEnv('SHARED_STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: getEnv('SHARED_STORAGE_SECRET_ACCESS_KEY'),
      publicUrl: getEnv('SHARED_STORAGE_PUBLIC_URL')
    },
    mistral: {
      apiKey: getEnv('MISTRAL_API_KEY')
    },
    anthropic: {
      apiKey: getEnv('ANTHROPIC_API_KEY')
    },
    email: {
      provider: getEnv('EMAIL_PROVIDER'),
      from: getEnv('EMAIL_FROM'),
      secretKey: getEnv('SCW_SECRET_KEY'),
      projectId: getEnv('SCW_PROJECT_ID'),
      region: getEnv('SCW_REGION')
    },
    appUrl: getEnv('APP_URL')
  };

  try {
    const config = ConfigSchema.parse(rawConfig);

    // Log configuration status
    if (config.nodeEnv === 'development') {
      console.log('Running in DEVELOPMENT mode');
    } else if (config.nodeEnv === 'production') {
      console.log('Running in PRODUCTION mode');
    }

    // Warn about missing GitHub OAuth
    if (!config.github.clientId || !config.github.clientSecret) {
      console.warn('GitHub OAuth not configured (GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET missing)');
    }

    // Warn about missing email provider
    if (!config.email.provider) {
      console.warn('Email not configured (EMAIL_PROVIDER missing) - email features disabled');
    }

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:', error);
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

// Export singleton config instance
export const config = loadConfig();

// Export individual sections for convenience
export const { nodeEnv, port, jwt, github, postgate, sharedStorage, mistral, anthropic, email, appUrl } = config;
