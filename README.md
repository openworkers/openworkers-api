# OpenWorkers API (Hono + Bun)

Rewrite of dash-api using Hono framework and Bun runtime.

## Features

- **Hono** - Ultra-fast web framework
- **Bun native Postgres** - `Bun.sql()` for database access
- **Isolated services** - Easy to swap Postgres with gateway later
- **Pure REST** - No GraphQL complexity
- **JWT auth** - Using `hono/jwt`

## Structure

```
src/
├── services/
│   ├── db.ts           - Database abstraction (Bun Postgres or Gateway)
│   └── workers.ts      - Workers business logic
├── routes/
│   └── workers.ts      - Workers REST endpoints
├── middlewares/
│   └── auth.ts         - JWT authentication
├── types/
│   └── index.ts        - TypeScript types
└── index.ts            - Main app
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

# Production
bun run start
```

## API Endpoints

### Workers

- `GET /api/workers` - List all workers
- `GET /api/workers/:id` - Get single worker
- `POST /api/workers` - Create worker
- `PUT /api/workers/:id` - Update worker
- `DELETE /api/workers/:id` - Delete worker

### Auth

All `/api/*` endpoints require JWT Bearer token in `Authorization` header:

```
Authorization: Bearer <token>
```

## Database Service Abstraction

The `db.ts` service can be swapped between implementations:

**Current**: Bun native Postgres
```typescript
import { sql } from 'bun';
```

**Future**: Postgres Gateway
```typescript
fetch('http://postgres-gateway:8080/query', ...)
```

Change only happens in `src/services/db.ts` - all other code stays the same.

## TODO

- [ ] Auth routes (login, register, refresh)
- [ ] Users routes
- [ ] Environments routes
- [ ] Domains routes
- [ ] Crons routes
- [ ] Server-Sent Events for logs
- [ ] Input validation
- [ ] Error handling middleware
- [ ] Tests

## Migration from NestJS

This replaces `openworkers-dash/dash-api` with simpler implementation:

- ✅ No NestJS boilerplate
- ✅ ~90% less code
- ✅ Faster startup (<50ms vs ~2s)
- ✅ Native Bun performance
- ✅ Easier to audit (~500 lines vs ~5000 lines)
