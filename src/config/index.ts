import { z } from 'zod';

// UUID-like pattern (less strict than RFC 4122)
const uuidLike = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid UUID format');

// Environment schema
const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test']);

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
    token: z.string().regex(/^pg_[a-f0-9]{64}$/, 'POSTGATE_TOKEN must be a valid pg_xxx token')
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

  // SMTP for email (verification, password reset)
  smtp: z.object({
    host: z.string().optional(),
    port: z.coerce.number().int().positive().default(587),
    user: z.string().optional(),
    pass: z.string().optional(),
    from: z.string().default('noreply@openworkers.dev')
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
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    jwt: {
      access: {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXP
      },
      refresh: {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXP
      }
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    },
    postgate: {
      url: process.env.POSTGATE_URL,
      token: process.env.POSTGATE_TOKEN
    },
    sharedStorage: {
      bucket: process.env.SHARED_STORAGE_BUCKET,
      endpoint: process.env.SHARED_STORAGE_ENDPOINT,
      accessKeyId: process.env.SHARED_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.SHARED_STORAGE_SECRET_ACCESS_KEY,
      publicUrl: process.env.SHARED_STORAGE_PUBLIC_URL
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM
    },
    appUrl: process.env.APP_URL
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

    // Warn about missing SMTP
    if (!config.smtp.host) {
      console.warn('SMTP not configured (SMTP_HOST missing) - email features disabled');
    }

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

// Export singleton config instance
export const config = loadConfig();

// Export individual sections for convenience
export const { nodeEnv, port, jwt, github, postgate, sharedStorage, mistral, anthropic, smtp, appUrl } = config;
