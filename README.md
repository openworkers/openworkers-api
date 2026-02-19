# OpenWorkers API

REST API for the OpenWorkers platform, built with SvelteKit and deployed as a worker on OpenWorkers itself.

## Features

- **SvelteKit** - File-based routing (`src/routes/api/...`)
- **Postgate** - HTTP-based PostgreSQL access via [postgate](https://github.com/openworkers/postgate)
- **Zod validation** - Type-safe input/output validation
- **JWT auth** - Authentication middleware in `hooks.server.ts`

## Quick Start

```bash
bun install
cp .env.example .env
bun run dev
```

## Build & Deploy

```bash
bun run build
```

The build **must** run with `NODE_ENV=production` (already set in the build script).
This is required because SvelteKit and Svelte use `esm-env` to gate Node.js-specific
code behind `if (DEV)` blocks (`node:path`, `node:process` imports for stack trace
formatting). Without production mode, these imports leak into the bundle and cause
`SyntaxError` in the OpenWorkers runtime which supports neither `node:*` builtins
nor dynamic `import()`.

## Docker

```bash
docker build -t openworkers-api .
docker run -p 7000:7000 --env-file .env openworkers-api
```

Or use `bun run build && bun start` to run locally without Docker.

## API Endpoints

### Auth (Public)

- `POST /api/v1/openid/github` - Initiate GitHub OAuth flow
- `GET /api/v1/callback/github` - GitHub OAuth callback (creates JWT)
- `POST /api/v1/refresh` - Refresh access token using refresh token

### Users (Protected)

- `GET /api/v1/profile` - Get current user profile

### Workers (Protected)

- `GET /api/v1/workers` - List all workers
- `GET /api/v1/workers/name-exists/:name` - Check if worker name exists
- `GET /api/v1/workers/:id` - Get single worker
- `POST /api/v1/workers` - Create worker
- `PUT /api/v1/workers/:id` - Update worker
- `POST /api/v1/workers/:id/crons` - Create cron for worker
- `DELETE /api/v1/workers/:id` - Delete worker

### Crons (Protected)

- `POST /api/v1/crons` - Create cron
- `PUT /api/v1/crons/:id` - Update cron
- `DELETE /api/v1/crons/:id` - Delete cron

### Environments (Protected)

- `GET /api/v1/environments` - List all environments
- `GET /api/v1/environments/:id` - Get environment by ID (includes values)
- `POST /api/v1/environments` - Create environment
- `PUT /api/v1/environments/:id` - Update environment (name/desc and/or values)
- `DELETE /api/v1/environments/:id` - Delete environment

### Domains (Protected)

- `GET /api/v1/domains` - List all domains
- `POST /api/v1/domains` - Create domain
- `DELETE /api/v1/domains/:name` - Delete domain

### Authentication

All `/api/v1/*` endpoints (except auth endpoints) require JWT Bearer token in `Authorization` header:

```
Authorization: Bearer <token>
```

OAuth flow:

1. User initiates login → `POST /api/v1/openid/github`
2. GitHub redirects to → `GET /api/v1/callback/github?code=...`
3. Server exchanges code for user profile
4. Creates/finds user in DB
5. Issues JWT tokens (access + refresh)
6. Returns tokens in response body + sets cookie

## Database Access via Postgate

All database access goes through [Postgate](https://github.com/openworkers/postgate) - a secure HTTP proxy for PostgreSQL.

```typescript
import { sql } from './services/db/sql-client';

// Named parameters ($name style)
const users = await sql<User>('SELECT * FROM users WHERE id = $id', { id: 1 });

// Positional parameters ($1 style)
const users = await sql<User>('SELECT * FROM users WHERE id = $1', [1]);

// Result is an array with .count property
console.log(users[0], users.count);
```

**Why Postgate?**

- No native Postgres driver needed - just HTTP `fetch()`
- Multi-tenant isolation via schema separation
- SQL validation and injection prevention
- Token-based access control per database
- Same API works from workers (OpenWorkers runtime)
