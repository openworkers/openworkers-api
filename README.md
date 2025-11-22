# OpenWorkers API (Hono + Bun)

Lightweight REST API for OpenWorkers platform using Hono framework and Bun runtime.

## Features

- **Hono** - Ultra-fast web framework
- **Bun native Postgres** - `Bun.sql()` for database access
- **Zod validation** - Type-safe input/output validation
- **Isolated services** - Easy to swap Postgres with gateway later
- **Pure REST** - No GraphQL complexity
- **JWT auth** - Using `hono/jwt`
- **Standalone binary** - Compile to single executable

## Structure

```
src/
├── services/
│   ├── db/
│   │   ├── client.ts        - Bun Postgres client
│   │   ├── users.ts         - User DB queries
│   │   ├── workers.ts       - Worker DB queries
│   │   ├── crons.ts         - Cron DB queries
│   │   ├── environments.ts  - Environment DB queries
│   │   └── domains.ts       - Domain DB queries
│   ├── auth.ts              - Authentication logic
│   ├── workers.ts           - Workers business logic
│   ├── crons.ts             - Crons business logic
│   ├── environments.ts      - Environments business logic
│   └── domains.ts           - Domains business logic
├── routes/
│   ├── auth.ts              - Auth endpoints
│   ├── users.ts             - User endpoints
│   ├── workers.ts           - Workers endpoints
│   ├── crons.ts             - Crons endpoints
│   ├── environments.ts      - Environments endpoints
│   └── domains.ts           - Domains endpoints
├── middlewares/
│   └── auth.ts              - JWT middleware
├── types/
│   ├── schemas/             - Zod validation schemas
│   ├── validators.ts        - Schema validators
│   └── index.ts             - Type exports
├── utils/
│   └── validate.ts          - Response validation helpers
├── config/
│   └── index.ts             - Configuration
└── index.ts                 - Main app
```

## Quick Start

```bash
# Install dependencies
bun install

# Create .env from example
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT secrets

# Run development server (hot reload)
bun run dev

# Production (run with Bun)
bun run start

# Compile standalone binary
bun run compile
# → Creates dist/openworkers-api (executable)
```

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

## Database Service Abstraction

The `db.ts` service can be swapped between implementations:

**Current**: Bun native Postgres

```typescript
import { sql } from "bun";
```

**Future**: Postgres Gateway (HTTP-based)

```typescript
fetch('http://postgres-gateway:8080/query', ...)
```

Change only happens in `src/services/db/` - all other code stays the same.

## Status

### ✅ Implemented

- [x] Auth routes (GitHub OAuth, refresh)
- [x] Users routes (profile)
- [x] Workers routes (CRUD + name uniqueness check)
- [x] Environments routes (CRUD + values management)
- [x] Domains routes (CRUD)
- [x] Crons routes (CRUD)
- [x] Zod input/output validation
- [x] JWT authentication middleware
- [x] Standalone binary compilation

### 🚧 TODO

- [ ] Error handling middleware (standardized error responses)
- [ ] Request validation middleware
- [ ] Rate limiting
- [ ] Tests (unit + integration)
- [ ] API documentation (OpenAPI/Swagger)
