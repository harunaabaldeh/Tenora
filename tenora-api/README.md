# Tenora API

Backend for [Tenora](../README.md), a centralized property-maintenance platform. Tenora connects tenants, landlords, property managers, and real estate agencies throughout the entire maintenance process—from reporting an issue to its resolution.

This service is a NestJS API. PostgreSQL and schema migrations run in Docker. You can run the API in Docker as well, or on the host against that database.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose v2)
- [Node.js](https://nodejs.org/) 20 or later — only needed if you run the API on the host (`npm run start:dev`)
- npm (bundled with Node.js)

## Getting started

From this directory (`tenora-api`), copy the example environment file and keep `.env` out of git:

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

The example values are local-only placeholders. They are enough to run on your machine.

### Option A — entire stack in Docker

No local Node install required:

```bash
docker compose up -d --build
```

Or:

```bash
npm run docker:up
```

Compose waits until Postgres is healthy, applies migrations, then starts the API. The API is at [http://localhost:3000](http://localhost:3000).

Follow logs:

```bash
npm run docker:logs
```

Stop the stack (the database volume is kept):

```bash
npm run docker:down
```

### Option B — API on the host, database in Docker

Useful for watch-mode development:

```bash
npm install
npm run db:up
npm run start:dev
```

Do not run Option A and Option B at the same time — both bind port 3000 by default.

### Confirm it is up

```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

You should see `{"status":"ok"}` and `{"status":"ok","checks":{"postgres":"up"}}`.

| Endpoint | Purpose |
| --- | --- |
| `GET /` | Placeholder hello response |
| `GET /health/live` | Process is running |
| `GET /health/ready` | Process can reach Postgres |
| `GET /health` | Same as ready |

## Auth

Email and password for now. Register creates a user and returns a JWT. Login returns the same shape. Send `Authorization: Bearer <accessToken>` on protected routes.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create an account and receive a token |
| `POST` | `/auth/login` | Public | Sign in with email and password |
| `GET` | `/auth/me` | Bearer | Current user |

Example:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ada@example.com\",\"password\":\"at-least-8-chars\",\"firstName\":\"Ada\",\"lastName\":\"Lovelace\",\"role\":\"tenant\"}"

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ada@example.com\",\"password\":\"at-least-8-chars\"}"

curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

Set `JWT_SECRET` (at least 32 characters) and optional `JWT_EXPIRES_IN` (default `8h`) in `.env`.

## Users API

Feature modules live in `src/modules/`. Users are the people on the platform: tenants, landlords, property managers, and agencies. User management routes require a Bearer token. Use `/auth/register` for public sign-up.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/users` | Create a user |
| `GET` | `/users` | List users (`page`, `limit`, optional `role`) |
| `GET` | `/users/:id` | Get one user |
| `PATCH` | `/users/:id` | Update a user |
| `DELETE` | `/users/:id` | Soft-delete a user |

Passwords are hashed before storage and never returned. Emails are unique among active users.

Valid `role` values: `tenant`, `landlord`, `property_manager`, `agency`.

## Daily commands

| Command | What it does |
| --- | --- |
| `npm run docker:up` | Build the API image and start Postgres, migrator, and API |
| `npm run docker:logs` | Follow API container logs |
| `npm run docker:down` | Stop all Compose services (data volume is kept) |
| `npm run db:up` | Start Postgres and apply pending migrations (no API container) |
| `npm run start:dev` | Run the API on the host with reload on file changes |
| `npm run start:debug` | Same as `start:dev`, with the debugger attached |
| `npm run start:prod` | Run the compiled app from `dist/` (`npm run build` first) |
| `npm run db:migrate` | Apply pending migrations (Postgres must already be running) |
| `npm run db:migrate:down` | Roll back the latest migration |
| `npm run db:down` | Stop containers (data volume is kept) |
| `npm run db:reset` | Destroy the volume, recreate Postgres, and re-run migrations |
| `npm run migration:create -- src/database/migrations/AddSomething` | Scaffold a TypeORM migration class |

After you add a migration, register it in `src/database/data-source.ts`, apply it with `npm run db:migrate`, then restart the API container if it is already running (`docker compose restart api`).

## Docker image

The `Dockerfile` is multi-stage:

1. **deps** — `npm ci` with a BuildKit cache mount
2. **build** — compiles TypeScript (`nest build`)
3. **development** — full dependencies and `start:dev` (`docker compose build --target development`)
4. **production** — Debian slim runtime, production `node_modules` only, non-root `node` user, `tini` as PID 1

The Compose `api` service uses the production target. It does not copy `.env` into the image; credentials are injected at runtime. Inside the Compose network the API connects to host `postgres` (not `localhost`). The container filesystem is read-only except for `/tmp`.

## Database

The API uses [TypeORM](https://typeorm.io/) with `synchronize: false`. Schema changes are TypeORM migrations in `src/database/migrations/`. The Compose **migrate** service runs those migrations with the `tenora_migrate` role before the API starts.

Compose services:

- **postgres** — PostgreSQL 17, published on `127.0.0.1:5432`
- **migrate** — same production image as the API; runs `dist/database/run-migrations.js` and exits
- **api** — NestJS production image; starts only after migrate exits successfully
- **migrate-down** — CLI helper (Compose profile `cli`) to revert the last migration

Roles created on first boot (`db/init/`):

| Role | Use |
| --- | --- |
| `postgres` | Container superuser (init and admin only) |
| `tenora_migrate` | Owns schema objects; used by the migrator |
| `tenora_app` | DML only; used by the NestJS process |

Init scripts run **once**, when the data volume is empty. After you change `db/init/`, run `npm run db:reset` (this deletes local database data).

### Adding a migration

```bash
npm run migration:create -- src/database/migrations/AddProperties
```

That scaffolds a TypeORM migration class. Implement `up` / `down`, then add the class to the `migrations` array in `src/database/data-source.ts`. Apply with:

```bash
npm run db:migrate
```

Do not enable `synchronize`. TypeORM migrations are the source of truth for schema.

## Configuration

`ConfigModule` reads process environment (and `.env` when the API runs on the host) and fails fast if required variables are missing. The API connects with the **application** role.

| Variable | Meaning |
| --- | --- |
| `DATABASE_HOST` | `localhost` when the API runs on the host; Compose sets `postgres` for the API container |
| `DATABASE_PORT` | `5432` on the host mapping and inside the Compose network |
| `DATABASE_NAME` | Database name (`tenora`) |
| `DATABASE_USER` | `tenora_app` |
| `DATABASE_PASSWORD` | Must match `APP_DB_PASSWORD` |
| `DATABASE_SSL` | `false` for local Docker |
| `DATABASE_POOL_MAX` | Pool size (default `10`) |
| `PORT` | HTTP port inside the process (default `3000`) |
| `JWT_SECRET` | Signing key for access tokens (min 32 characters) |
| `JWT_EXPIRES_IN` | Access token lifetime (default `8h`) |

Compose interpolates `POSTGRES_*`, `MIGRATE_DB_*`, and `APP_DB_*` from the same `.env` file.

## Other scripts

```bash
npm run build      # compile to dist/
npm run lint       # oxlint on src/ and test/
npm run test       # unit tests
npm run test:e2e   # end-to-end tests
npm run test:cov   # unit tests with coverage
```

## Troubleshooting

**`npm run db:up` or `docker:up` fails** — Docker must be running. On Windows, start Docker Desktop and wait until it is ready.

**Port 3000 already in use** — Stop the other API (`npm run start:dev` or another container), or set `API_PORT` in `.env` for the Compose service.

**API exits on startup** — Postgres is not reachable, or `.env` does not match Compose (host, port, user, password). For host-run API, run `npm run db:up`, then `GET /health/ready`.

**Port 5432 already in use** — Stop the other Postgres, or set `POSTGRES_PORT` and `DATABASE_PORT` in `.env` to a free port.

**Init role or extension changes have no effect** — Those scripts only run on an empty volume. Use `npm run db:reset` (destroys local data).

**Migration passwords with `@`, `:`, or `/`** — The migrator connection string is a URL. Keep local passwords alphanumeric, or URL-encode special characters.
