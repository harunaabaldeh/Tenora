# Tenora API

NestJS backend for Tenora. PostgreSQL and schema migrations run in Docker. You can run the API in Docker as well, or on the host against that database.

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
| `npm run migration:create -- add_users` | Scaffold a new `up`/`down` SQL pair in `db/migrations/` |

After you add a migration, apply it with `npm run db:migrate`, then restart the API container if it is already running (`docker compose restart api`).

## Docker image

The `Dockerfile` is multi-stage:

1. **deps** — `npm ci` with a BuildKit cache mount
2. **build** — compiles TypeScript (`nest build`)
3. **development** — full dependencies and `start:dev` (`docker compose build --target development`)
4. **production** — Debian slim runtime, production `node_modules` only, non-root `node` user, `tini` as PID 1

The Compose `api` service uses the production target. It does not copy `.env` into the image; credentials are injected at runtime. Inside the Compose network the API connects to host `postgres` (not `localhost`). The container filesystem is read-only except for `/tmp`.

## Database

Compose services:

- **postgres** — PostgreSQL 17, published on `127.0.0.1:5432`
- **migrate** — [golang-migrate](https://github.com/golang-migrate/migrate) one-shot job that applies `db/migrations/`
- **api** — NestJS production image; starts only after migrate exits successfully
- **migrate-down** / **migrate-create** — CLI helpers (Compose profile `cli`)

Roles created on first boot (`db/init/`):

| Role | Use |
| --- | --- |
| `postgres` | Container superuser (init and admin only) |
| `tenora_migrate` | Owns schema objects; used by the migrator |
| `tenora_app` | DML only; used by the NestJS process |

Init scripts run **once**, when the data volume is empty. After you change `db/init/`, run `npm run db:reset` (this deletes local database data).

### Adding a migration

```bash
npm run migration:create -- add_users
```

That creates files such as:

```
db/migrations/000002_add_users.up.sql
db/migrations/000002_add_users.down.sql
```

Edit both, then apply:

```bash
npm run db:migrate
```

Do not auto-sync schema from the application. SQL in `db/migrations/` is the source of truth.

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
| `API_PORT` | Host port published for the API container (default `3000`) |

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
