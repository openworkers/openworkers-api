# Deploy

## Infrastructure setup (from scratch)

All `ow infra` commands use a **DB alias** with direct PostgreSQL access. This is the only way to bootstrap the platform.

### 1. Configure CLI alias

```bash
ow alias set infra --db postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost/$POSTGRES_DB
```

### 2. Run migrations

```bash
ow infra migrate status
ow infra migrate run
```

### 3. Claim the system user

The system user (`00000000-...`) owns shared resources (the API database config, etc.). Claim it with your username:

```bash
ow infra users create your-username --system
ow alias set infra --db postgres://... --user your-username --force
```

### 4. Configure platform storage

Required for worker uploads (assets are stored in S3/R2):

```bash
ow infra setup-storage \
  --endpoint https://xxx.r2.cloudflarestorage.com \
  --bucket my-bucket \
  --access-key-id AKIA... \
  --secret-access-key ...
```

### 5. Deploy the API

```bash
# Create environment, worker, and link them
ow infra env create openworkers-api-env
ow infra worker create openworkers-api
ow infra worker link openworkers-api openworkers-api-env

# Bind the database (migration 15 creates 'openworkers-api' database config)
ow infra env bind openworkers-api-env DATABASE openworkers-api --type database

# Bind assets storage (for SvelteKit client files)
ow infra storage create openworkers-api-storage
ow infra env bind openworkers-api-env ASSETS openworkers-api-storage --type assets

# Set variables and secrets (see environment variables table below)
ow infra env set openworkers-api-env APP_URL https://dash.example.com
ow infra env set openworkers-api-env POSTGATE_SYSTEM_TOKEN_SECRET --secret
ow infra env set openworkers-api-env JWT_ACCESS_SECRET --secret
ow infra env set openworkers-api-env JWT_REFRESH_SECRET --secret

# Build and upload
cd openworkers-api
bun install && bun run build
ow infra worker upload openworkers-api ./build
```

### 6. Deploy the dashboard

```bash
cd openworkers-dash
bun install && bun run deploy:prepare

ow infra worker create openworkers-dash
ow infra storage create openworkers-dash-storage
ow infra env create openworkers-dash-env
ow infra env bind openworkers-dash-env ASSETS openworkers-dash-storage --type assets
ow infra worker link openworkers-dash openworkers-dash-env
ow infra worker upload openworkers-dash ./dist/openworkers
```

## Worker mode (subsequent deploys)

Once the platform is running, use a **space alias** (goes through the API) for subsequent deploys:

```bash
bun run build
ow <space> worker upload openworkers-api ./build
```

Where `<space>` is the target space (`dev`, `main`, `ps`, ...).

Create the environment **before** the first upload so the project inherits it automatically. If the worker was already uploaded without an environment, `worker link` will cascade it to the project and all function workers.

## Environment variables

Secrets are prompted interactively (masked input) when value is omitted:

```bash
# Variables (plain text)
ow <space> env set openworkers-api-env APP_URL https://dash.example.com

# Secrets (prompted interactively, not stored in shell history)
ow <space> env set openworkers-api-env JWT_ACCESS_SECRET --secret
```

| Variable                           | Type    | Required | Description                              |
| ---------------------------------- | ------- | -------- | ---------------------------------------- |
| `DATABASE`                         | binding | yes      | Database binding (type: database)        |
| `ASSETS`                           | binding | yes      | Assets storage binding (SvelteKit files) |
| `APP_URL`                          | var     | yes      | Dashboard URL (for OAuth redirects)      |
| `POSTGATE_SYSTEM_TOKEN_SECRET`     | secret  | yes      | System token HMAC secret (>= 32 chars)   |
| `JWT_ACCESS_SECRET`                | secret  | yes      | JWT signing secret (>= 32 chars)         |
| `JWT_REFRESH_SECRET`               | secret  | yes      | JWT refresh token secret (>= 32 chars)   |
| `GITHUB_CLIENT_ID`                 | var     | no       | GitHub OAuth app client ID               |
| `GITHUB_CLIENT_SECRET`             | secret  | no       | GitHub OAuth app client secret           |
| `MISTRAL_API_KEY`                  | secret  | no       | Mistral AI API key                       |
| `ANTHROPIC_API_KEY`                | secret  | no       | Anthropic API key                        |
| `SHARED_STORAGE_BUCKET`            | var     | no       | S3 bucket name                           |
| `SHARED_STORAGE_ENDPOINT`          | var     | no       | S3 endpoint URL                          |
| `SHARED_STORAGE_ACCESS_KEY_ID`     | secret  | no       | S3 access key                            |
| `SHARED_STORAGE_SECRET_ACCESS_KEY` | secret  | no       | S3 secret key                            |
| `SHARED_STORAGE_PUBLIC_URL`        | var     | no       | S3 public URL                            |
| `EMAIL_PROVIDER`                   | var     | no       | Email provider (e.g. `scaleway`)         |
| `EMAIL_FROM`                       | var     | no       | Sender email address                     |
| `SCW_SECRET_KEY`                   | secret  | no       | Scaleway secret key                      |
| `SCW_PROJECT_ID`                   | var     | no       | Scaleway project ID                      |
| `SCW_REGION`                       | var     | no       | Scaleway region                          |

In worker mode, the `DATABASE` binding provides direct database access. `POSTGATE_URL` and `POSTGATE_TOKEN` are only needed in Docker mode (see below).

## Docker mode

```bash
docker build -t openworkers-api .
docker run -p 7000:7000 --env-file .env openworkers-api
```

Or without Docker:

```bash
bun run build
bun start
```

The server listens on `PORT` (default `7000`).

In Docker mode, there is no `DATABASE` binding. Set these additional variables in `.env`:

| Variable         | Required | Description                      |
| ---------------- | -------- | -------------------------------- |
| `POSTGATE_URL`   | yes      | Postgate HTTP proxy URL          |
| `POSTGATE_TOKEN` | yes      | Postgate token (`pg_xxx` format) |

All other environment variables from the table above also apply (without the bindings).

## Managing projects

Workers that are uploaded with multiple routes/functions are automatically promoted to **projects**. Projects group related workers.

```bash
ow <space> projects list              # List all projects
ow <space> projects delete my-app     # Delete project and all its workers
```

To delete a worker that belongs to a project, delete the project instead:

```bash
# This fails:
ow <space> worker delete my-app
# → "Cannot delete main worker - delete the project instead"

# Do this instead:
ow <space> projects delete my-app
```
