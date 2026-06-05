# Change Summary

This document summarizes all uncommitted changes in the `warp_license_server` repository (relative to the initial commit `995c3fa`). The work spans a **major architecture upgrade**: SQLite → Neon PostgreSQL, backend reorganization into `backend/`, and the admin dashboard switching from FastAPI proxying to direct database access via Drizzle ORM.

---

## Executive Summary

| Area | Before | After |
|------|--------|-------|
| **Database** | Local SQLite (`licenses.db`, `DB_PATH`) | Neon PostgreSQL (`DATABASE_URL`) |
| **Backend location** | Repo root (`app/`, `Dockerfile`, etc.) | `backend/` subdirectory |
| **Backend data layer** | Raw `sqlite3` + manual SQL | SQLAlchemy 2.x ORM + `psycopg` v3 |
| **Admin dashboard data** | HTTP proxy to FastAPI (`lib/api.ts`) | Direct Neon access via Drizzle (`src/db/`) |
| **API port (Docker)** | `8000` | `5150` |
| **Frontend version** | `0.1.0` | `1.6.0` |
| **Backend API version** | `1.0.0` | `1.8.0` |
| **Deployment** | Render + SQLite disk volume | Neon + optional PM2 for Next.js |

---

## 1. Project Structure Reorganization

### Removed from repository root

| Path | Description |
|------|-------------|
| `app/` | Entire FastAPI application (moved under `backend/`) |
| `app/database.py` | SQLite connection + `init_db()` |
| `app/datetime_utils.py` | SQLite timestamp normalization helpers |
| `app/main.py` | FastAPI entry point |
| `app/models/schemas.py` | Pydantic request/response models |
| `app/routers/licenses.py` | License API routes (raw SQL) |
| `app/security.py` | API key / admin key validation |
| `Dockerfile` | Backend container image |
| `docker-compose.yml` | Local Docker stack with SQLite volume |
| `requirements.txt` | Python dependencies (no ORM/Postgres) |
| `.env.example` | Env template with `DB_PATH` |
| `.gitignore` | Root ignore rules |

### Added: `backend/` directory

The Python API is now self-contained under `backend/`:

```
backend/
├── app/
│   ├── main.py
│   ├── database.py          # SQLAlchemy → Neon
│   ├── security.py
│   ├── models/
│   │   ├── license.py       # NEW — SQLAlchemy ORM model
│   │   └── schemas.py
│   └── routers/
│       └── licenses.py      # Rewritten for SQLAlchemy
├── scripts/
│   └── migrate_sqlite_to_neon.py   # NEW — one-time SQLite → Neon migration
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

> **Note:** Root `README.md` was updated for Neon/Drizzle but its project-structure diagram still lists `app/` and `scripts/` at the repo root. The actual layout uses `backend/app/` and `backend/scripts/`. Update paths in docs/commands accordingly (`cd backend` before `uvicorn`, `pip install`, Docker, etc.).

---

## 2. Backend — Database Layer (SQLite → Neon PostgreSQL)

### `backend/app/database.py` (rewritten)

**Before (root `app/database.py`):**
- Used `sqlite3` with `DB_PATH` env var (default `licenses.db`)
- `get_connection()` returned a SQLite connection with `Row` factory
- `init_db()` created the `licenses` table on startup via raw DDL

**After (`backend/app/database.py`):**
- Requires `DATABASE_URL` (Neon PostgreSQL connection string)
- `normalize_database_url()` rewrites `postgresql://` / `postgres://` to `postgresql+psycopg://` for SQLAlchemy + psycopg v3
- SQLAlchemy `create_engine()` with `pool_pre_ping=True`
- `get_db()` dependency yields ORM `Session` objects
- `check_db_connection()` runs `SELECT 1` on startup (replaces `init_db()`)

### `backend/app/models/license.py` (new)

New SQLAlchemy 2.x declarative model mapping to the shared `licenses` table:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `Integer` PK | Auto-increment |
| `license_key` | `String` | Unique, not null |
| `product` | `String` | Default `"default"` |
| `status` | `String` | Default `"inactive"` |
| `machine_id` | `String` | Nullable |
| `activated_at` | `DateTime(timezone=True)` | Nullable |
| `created_at` | `DateTime(timezone=True)` | Server default `now()` |
| `notes` | `Text` | Nullable |

### `backend/app/datetime_utils.py` (removed)

Previously provided `utc_now_iso()` and `normalize_db_timestamp()` for SQLite text timestamps. No longer needed — Postgres stores proper `timestamptz` values and Python `datetime` objects are used in the router.

### `backend/requirements.txt`

**Added:**
- `sqlalchemy>=2.0.0`
- `psycopg[binary]>=3.1.0`

**Unchanged:** `fastapi`, `uvicorn`, `pydantic`, `slowapi`, `python-dotenv`

---

## 3. Backend — API Layer

### `backend/app/main.py`

| Change | Detail |
|--------|--------|
| Version | `1.0.0` → `1.8.0` |
| Startup | `init_db()` → `check_db_connection()` |
| Comments | Removed outdated Swagger development notes |

### `backend/app/routers/licenses.py` (rewritten)

**Before:** Raw `sqlite3` queries via `get_connection()`, manual `conn.execute()` / `conn.commit()` / `conn.close()`.

**After:** SQLAlchemy ORM via `Session = Depends(get_db)` and `select(License)`.

**Endpoint behavior preserved:**
- `POST /api/v1/verify-key` — rate limit 10/min
- `POST /api/v1/activate-key` — rate limit 5/min; same-machine re-activation allowed
- `POST /api/v1/admin/create-key`
- `GET /api/v1/admin/list-keys`
- `DELETE /api/v1/admin/revoke-key/{license_key}`

**Improvements:**
- `_to_response()` helper converts ORM rows to `LicenseResponse` with ISO-formatted datetimes
- `_utc_now()` uses timezone-aware `datetime.now(timezone.utc)` for activations
- Admin endpoints remain available for external tools; the Next.js dashboard no longer calls them

### `backend/app/models/schemas.py`

No functional changes — same Pydantic models (`VerifyRequest`, `ActivateRequest`, `CreateLicenseRequest`, `LicenseResponse`, `MessageResponse`).

### `backend/app/security.py`

Moved unchanged to `backend/app/security.py` (API key / admin key header validation).

---

## 4. Backend — Docker & Environment

### `backend/Dockerfile`

| Before | After |
|--------|-------|
| Port `8000` | Port `5150` |
| `RUN mkdir -p /data` for SQLite | Removed (no local DB file) |
| `CMD ... --port 8000` | `CMD ... --port 5150` |

### `backend/docker-compose.yml`

| Before | After |
|--------|-------|
| Service `licensing-server` | Service `warp-license-server` |
| Port `8000:8000` | Port `5150:5150` |
| `DB_PATH=/data/licenses.db` + volume `./data:/data` | `DATABASE_URL=${DATABASE_URL}` (no volume) |
| Hardcoded placeholder API keys in compose | Keys loaded from `.env` file |

### `backend/.env.example`

| Before (`DB_PATH`) | After (`DATABASE_URL`) |
|--------------------|------------------------|
| `DB_PATH=/data/licenses.db` | `DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require` |

---

## 5. Backend — Migration Script (new)

### `backend/scripts/migrate_sqlite_to_neon.py`

One-time utility to copy existing SQLite `licenses` rows into Neon Postgres.

**Features:**
- Reads from `--sqlite-path` (default `licenses.db`)
- Loads `DATABASE_URL` from `backend/.env`
- `parse_timestamp()` handles legacy SQLite naive UTC strings and ISO formats
- Skips duplicate `license_key` values
- Creates tables via `Base.metadata.create_all()` if needed

**Usage:**
```bash
cd backend
pip install -r requirements.txt
python scripts/migrate_sqlite_to_neon.py --sqlite-path licenses.db
```

---

## 6. Frontend — Architecture Change (FastAPI Proxy → Drizzle ORM)

The admin dashboard previously called FastAPI admin endpoints through `frontend/src/lib/api.ts` using `API_BASE_URL` and `X-Admin-Key`. It now reads and writes the **same Neon database directly** via Drizzle.

### Removed

| File | Purpose |
|------|---------|
| `frontend/src/lib/api.ts` | HTTP client for `listLicenses`, `createLicense`, `revokeLicense` against FastAPI |

### Added — Database layer

#### `frontend/src/db/index.ts`
- `@neondatabase/serverless` HTTP driver
- `drizzle-orm/neon-http` client
- `getDb()` reads `DATABASE_URL` from environment

#### `frontend/src/db/schema.ts`
- Drizzle `pgTable` definition for `licenses` (matches SQLAlchemy model and migration SQL)
- Exports `LicenseRow` type

#### `frontend/src/db/licenses.ts`
- `listLicenses()` — `SELECT` ordered by `created_at DESC`
- `createLicense()` — duplicate check + `INSERT`
- `revokeLicense()` — reset status, `machine_id`, `activated_at`
- `toLicense()` maps Drizzle camelCase columns → API snake_case `License` type

### Added — Drizzle tooling

#### `frontend/drizzle.config.ts`
- Loads `.env.local` / `.env`
- PostgreSQL dialect, schema at `./src/db/schema.ts`, migrations in `./drizzle`

#### `frontend/drizzle/0000_init_licenses.sql`
Initial migration creating the `licenses` table with unique constraint on `license_key`.

#### `frontend/drizzle/meta/`
- `0000_snapshot.json` — schema snapshot
- `_journal.json` — migration journal

---

## 7. Frontend — Updated Files

### `frontend/package.json`

| Change | Detail |
|--------|--------|
| Version | `0.1.0` → `1.6.0` |
| **New dependencies** | `@neondatabase/serverless`, `drizzle-orm` |
| **New devDependencies** | `drizzle-kit`, `dotenv` |
| **New scripts** | `db:generate`, `db:migrate`, `db:push`, `db:studio` |
| **New scripts** | `pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:reload`, `pm2:logs`, `pm2:delete`, `pm2:deploy` |

### `frontend/ecosystem.config.cjs` (new)

PM2 configuration for production Next.js deployment:
- App name: `warp-license-admin`
- Port: `5155`
- `npm run pm2:deploy` = build + start with `--update-env`

### `frontend/src/app/api/admin/licenses/route.ts`
- Import: `@/lib/api` → `@/db/licenses`
- Error HTTP status: `502` → `500` (no upstream proxy; errors are local DB errors)

### `frontend/src/app/api/admin/licenses/[key]/route.ts`
- Same import and status code changes as above

### `frontend/src/app/dashboard/page.tsx`
- Import: `@/lib/api` → `@/db/licenses`
- Error UI: "Could not reach the license API" → "Could not connect to the database"
- Help text: FastAPI URL → `DATABASE_URL` + `npm run db:migrate` instructions

### `frontend/src/lib/format-date.ts`
- Removed `parseStoredUtc()` (SQLite legacy timestamp handling)
- `formatDate()` now uses `new Date(value)` directly (Postgres returns ISO strings with timezone)

### `frontend/src/components/license-table.tsx`
- Removed unused `Ban` icon import from `lucide-react`
- Status filter `<select>`: added `p-2`, changed `text-sm` → `text-xs`

---

## 8. Documentation — `README.md` (root)

Major rewrite covering:

1. **Neon PostgreSQL setup** — pooled connection string, `DATABASE_URL` in backend and frontend env files
2. **Schema management** — Drizzle migrations from `frontend/` (`npm run db:migrate`)
3. **SQLite migration** — optional `migrate_sqlite_to_neon.py` script
4. **Frontend architecture** — Drizzle direct DB access instead of FastAPI proxy for admin CRUD
5. **Environment variables** — `DATABASE_URL`, `ADMIN_KEY`, `SESSION_SECRET`, `API_BASE_URL`
6. **API port** — documented as `5150` (was `8000`)
7. **PM2 production deployment** — new section with `npm run pm2:deploy`
8. **Deployment** — replaced Render.com SQLite disk instructions with Neon + separate FastAPI/Next.js services
9. **Security checklist** — added Neon SSL and `.env.local` warnings

---

## 9. File Change Inventory

### Deleted (tracked, staged for removal)

```
.env.example
.gitignore
Dockerfile
docker-compose.yml
requirements.txt
app/database.py
app/datetime_utils.py
app/main.py
app/models/schemas.py
app/routers/licenses.py
app/security.py
frontend/src/lib/api.ts
```

### Modified

```
README.md
frontend/package.json
frontend/package-lock.json
frontend/src/app/api/admin/licenses/route.ts
frontend/src/app/api/admin/licenses/[key]/route.ts
frontend/src/app/dashboard/page.tsx
frontend/src/components/license-table.tsx
frontend/src/lib/format-date.ts
```

### Added (untracked)

```
backend/                          # entire backend subdirectory
frontend/drizzle.config.ts
frontend/drizzle/0000_init_licenses.sql
frontend/drizzle/meta/0000_snapshot.json
frontend/drizzle/meta/_journal.json
frontend/ecosystem.config.cjs
frontend/src/db/index.ts
frontend/src/db/schema.ts
frontend/src/db/licenses.ts
```

---

## 10. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Before | After |
|----------|--------|-------|
| `API_KEY` | ✓ | ✓ |
| `ADMIN_KEY` | ✓ | ✓ |
| `DB_PATH` | ✓ (SQLite path) | ✗ removed |
| `DATABASE_URL` | ✗ | ✓ (Neon PostgreSQL) |

### Frontend (`frontend/.env.local`)

| Variable | Before | After |
|----------|--------|-------|
| `API_BASE_URL` | FastAPI origin for admin proxy | Optional / legacy (admin no longer uses it for CRUD) |
| `ADMIN_KEY` | ✓ (login + proxy) | ✓ (login only) |
| `SESSION_SECRET` | ✓ | ✓ |
| `DATABASE_URL` | ✗ | ✓ (required for Drizzle) |
| `NODE_ENV` | — | Documented in README |

---

## 11. Operational Workflow Changes

### Local development (before)

1. Start FastAPI at `http://localhost:8000`
2. Start Next.js at `http://localhost:3000`
3. Dashboard proxied all license CRUD to FastAPI admin API
4. SQLite file created automatically at `licenses.db`

### Local development (after)

1. Create Neon project and set `DATABASE_URL` in both `backend/.env` and `frontend/.env.local`
2. Run `cd frontend && npm run db:migrate` to apply schema
3. Start FastAPI from `backend/` at `http://localhost:5150` (installer API only)
4. Start Next.js at `http://localhost:3000` (admin talks to Neon directly)
5. Optional: migrate old SQLite data with `migrate_sqlite_to_neon.py`

### Production (before)

- Render Web Service with Docker + persistent disk for SQLite
- Separate Next.js deploy with `API_BASE_URL` pointing at API

### Production (after)

- **Neon** — shared production database
- **FastAPI** — installer endpoints only (`DATABASE_URL`, `API_KEY`, `ADMIN_KEY`)
- **Next.js** — admin UI with direct DB access (`DATABASE_URL`, `ADMIN_KEY`, `SESSION_SECRET`)
- **PM2** — optional process manager on port `5155`

---

## 12. Breaking Changes & Migration Checklist

- [ ] Provision Neon PostgreSQL and obtain pooled connection string with `?sslmode=require`
- [ ] Move backend work into `backend/` directory (`cd backend` for all Python/Docker commands)
- [ ] Replace `DB_PATH` with `DATABASE_URL` in environment files
- [ ] Run `npm run db:migrate` from `frontend/` against Neon
- [ ] Add `DATABASE_URL` to `frontend/.env.local`
- [ ] Run `migrate_sqlite_to_neon.py` if migrating existing SQLite data
- [ ] Update installer app API URL if port changed (`8000` → `5150`)
- [ ] Remove Docker SQLite volume mounts from deployment configs
- [ ] Update any external tools that relied on FastAPI admin API (still available, but dashboard no longer uses them)

---

## 13. What Did Not Change

- **Client/installer API contract** — same endpoints, headers (`X-API-Key`), request/response shapes
- **FastAPI admin API** — still exposed for external key-generator tools (`X-Admin-Key`)
- **Frontend auth** — session-based login with `ADMIN_KEY` / `iron-session` unchanged
- **UI components** — dashboard layout, license table, create dialog, login flow (minus data source)
- **Rate limiting** — `slowapi` limits on verify/activate endpoints preserved
- **Security** — Swagger disabled (`docs_url=None`), CORS wide open (same as before)

---

*Generated from working tree diff against commit `995c3fa` (first commit).*
