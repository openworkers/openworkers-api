import { z } from 'zod';

// UUID-like pattern (less strict than RFC 4122)
const uuidLike = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid UUID format');

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
    url: z.string().url().default('http://localhost:6080'),
    // Admin database (tenant management functions) - mode schema on public
    adminDatabaseId: uuidLike.default('00000000-0000-0000-0000-000000000000'),
    // OpenWorkers database (API data) - mode dedicated
    openworkersDatabaseId: uuidLike,
    jwtSecret: z.string().min(32, 'POSTGATE_JWT_SECRET must be at least 32 characters')
  })
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
      adminDatabaseId: process.env.POSTGATE_ADMIN_DATABASE_ID,
      openworkersDatabaseId: process.env.POSTGATE_OPENWORKERS_DATABASE_ID,
      jwtSecret: process.env.POSTGATE_JWT_SECRET
    }
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

console.log('Loading configuration...', process.env.POSTGATE_OPENWORKERS_DATABASE_ID);

// Export singleton config instance
export const config = loadConfig();

// Export individual sections for convenience
export const { nodeEnv, port, jwt, github, postgate } = config;
