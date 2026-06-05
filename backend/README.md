# warp_license_server

Licensing server for WarpVisions application license keys. FastAPI (installer API) + Next.js admin dashboard, both using **Neon PostgreSQL**.

---

## Project structure

```
warp_license_server/
├── app/                    # FastAPI backend (SQLAlchemy → Neon)
│   ├── main.py
│   ├── database.py
│   ├── models/
│   │   ├── license.py
│   │   └── schemas.py
│   └── routers/licenses.py
├── frontend/               # Next.js admin (Drizzle ORM → Neon)
│   ├── src/db/             # Drizzle schema + queries
│   └── drizzle/            # SQL migrations
├── scripts/
│   └── migrate_sqlite_to_neon.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Database (Neon)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (`?sslmode=require`).
3. Set `DATABASE_URL` in repo-root `.env` and `frontend/.env.local`.
4. Apply schema from `frontend/`:

```bash
cd frontend
npm install
npm run db:migrate
```

Schema is defined in [`frontend/src/db/schema.ts`](frontend/src/db/schema.ts). FastAPI uses the same `licenses` table via SQLAlchemy.

### Migrate existing SQLite data (optional)

```bash
pip install -r requirements.txt
python scripts/migrate_sqlite_to_neon.py --sqlite-path licenses.db
```

---

## Local development (backend)

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
copy .env.example .env
# Set API_KEY, ADMIN_KEY, DATABASE_URL

uvicorn app.main:app --reload
```

API base URL: http://localhost:5150

---

## Frontend (admin dashboard)

The admin UI uses **Drizzle** to read/write Neon directly via `/api/admin/*`. It does not proxy to FastAPI for license CRUD.

### Setup

```bash
cd frontend
npm install
copy .env.example .env.local
npm run db:migrate
```

Edit `frontend/.env.local`:

- `API_BASE_URL` — url for the backend API
- `DATABASE_URL` — same Neon URL as the backend
- `ADMIN_KEY` — same as repo-root `.env`
- `SESSION_SECRET` — random string, 32+ characters
- `NODE_ENV` — production or development


```bash
npm run dev
```

Open http://localhost:3000 and sign in with `ADMIN_KEY`.

### Two-terminal workflow

1. **Terminal 1 — API (installer):** `uvicorn app.main:app --reload`
2. **Terminal 2 — UI:** `cd frontend && npm run dev`

### Production

Set `DATABASE_URL`, `ADMIN_KEY`, and `SESSION_SECRET` on the Node host.

```bash
cd frontend
npm run build
npm start
```

### Production with PM2

```bash
cd frontend
npm run pm2:deploy
npm run pm2:logs
```

Ensure `DATABASE_URL` is in `frontend/.env.local` or PM2 env. See [`frontend/ecosystem.config.cjs`](frontend/ecosystem.config.cjs).

---

## Local development (with Docker)

```bash
copy .env.example .env
# Set DATABASE_URL, API_KEY, ADMIN_KEY
docker-compose up --build
```

---

## API endpoints

### Client endpoints (installer app)

Send `X-API-Key: <API_KEY>` on every request.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/verify-key` | Check if a key exists and is unused |
| POST | `/api/v1/activate-key` | Activate a key and bind it to a machine |

### Admin endpoints (FastAPI — optional external tools)

Send `X-Admin-Key: <ADMIN_KEY>`. The Next.js dashboard uses its own `/api/admin/*` routes with Drizzle instead.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/create-key` | Add a new license key |
| GET | `/api/v1/admin/list-keys` | List all keys |
| DELETE | `/api/v1/admin/revoke-key/{key}` | Reset a key to inactive |

---

## Deployment

1. **Neon** — production database; run `npm run db:migrate` from `frontend/` against prod `DATABASE_URL`.
2. **FastAPI** — Docker or any host; env: `DATABASE_URL`, `API_KEY`, `ADMIN_KEY`.
3. **Next.js** — Vercel/Render/PM2; env: `DATABASE_URL`, `ADMIN_KEY`, `SESSION_SECRET`.

---

## Security checklist before going live

- [ ] Set `API_KEY` and `ADMIN_KEY` to long random strings
- [ ] Never commit `.env` or `.env.local`
- [ ] Use Neon pooled URL with `sslmode=require`
- [ ] Keep Swagger disabled in production (`docs_url=None` in `main.py`)
- [ ] Use HTTPS only
- [ ] Set `ADMIN_KEY` and `SESSION_SECRET` only as server env vars on Next.js (not `NEXT_PUBLIC_*`)
