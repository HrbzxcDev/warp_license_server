# warp_license_server

Licensing server for WarpVisions application license keys. A lightweight FastAPI backend with SQLite storage and a Next.js admin dashboard.

---

## Project structure

```
warp_license_server/
├── app/                    # FastAPI backend
│   ├── main.py
│   ├── database.py         # SQLite (licenses.db)
│   ├── security.py
│   ├── models/schemas.py
│   └── routers/licenses.py
├── frontend/               # Next.js admin dashboard
├── licenses.db             # SQLite database (local dev)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Local development (backend)

```bash
# 1. Create a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and edit the environment file
copy .env.example .env      # Windows
# cp .env.example .env      # Mac/Linux
# Set API_KEY, ADMIN_KEY, and DB_PATH=licenses.db for local SQLite

# 4. Run the server
uvicorn app.main:app --reload
```

API base URL: http://localhost:8000

---

## Frontend (admin dashboard)

The admin UI lives in [`frontend/`](frontend/). The browser calls Next.js route handlers (`/api/admin/*`), which proxy to the FastAPI admin API (`/api/v1/admin/*`) using `ADMIN_KEY` from server environment variables only. The dashboard does not open `licenses.db` directly.

### Setup

```bash
cd frontend
npm install
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # Mac/Linux
```

Edit `frontend/.env.local`:

- `API_BASE_URL=http://localhost:8000` — FastAPI origin (server-side)
- `ADMIN_KEY` — same value as in the repo-root `.env`
- `SESSION_SECRET` — random string, at least 32 characters (signs login cookies)

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the same value as `ADMIN_KEY`.

### Two-terminal workflow

1. **Terminal 1 — API:** from repo root, `uvicorn app.main:app --reload`
2. **Terminal 2 — UI:** `cd frontend && npm run dev`

### Production

Deploy the Next.js app to any Node host (e.g. Vercel, Render Web Service). Set server environment variables:

- `API_BASE_URL` — deployed FastAPI URL
- `ADMIN_KEY` — same as the API service (never expose in client bundles)
- `SESSION_SECRET` — long random string (32+ characters)

```bash
cd frontend
npm run build
npm start
```

`ADMIN_KEY` is only used in Next.js server code; users authenticate via a signed session cookie after login.

---

## Local development (with Docker)

```bash
copy .env.example .env
docker-compose up --build
docker-compose down   # stop
```

---

## API endpoints

### Client endpoints (installer app)

Send `X-API-Key: <API_KEY>` on every request.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/verify-key` | Check if a key exists and is unused |
| POST | `/api/v1/activate-key` | Activate a key and bind it to a machine |

### Admin endpoints (dashboard / key generator)

Send `X-Admin-Key: <ADMIN_KEY>` on every request.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/create-key` | Add a new license key |
| GET | `/api/v1/admin/list-keys` | List all keys |
| DELETE | `/api/v1/admin/revoke-key/{key}` | Reset a key to inactive |

---

## Deployment to Render.com (free tier)

1. Push this repo to GitHub (keep `.env` out of git).
2. Create a **Web Service** on Render, connect the repo, runtime **Docker**.
3. Environment variables: `API_KEY`, `ADMIN_KEY`, `DB_PATH=/data/licenses.db`.
4. Add a **Disk** mounted at `/data` for persistent SQLite.
5. Deploy the API, then deploy `frontend/` as a separate Node service with `API_BASE_URL` pointing at the API URL.

---

## Security checklist before going live

- [ ] Set `API_KEY` and `ADMIN_KEY` to long random strings
- [ ] Never commit `.env`
- [ ] Keep Swagger disabled in production (`docs_url=None` in `main.py`)
- [ ] Use HTTPS only
- [ ] Set `ADMIN_KEY` and `SESSION_SECRET` only as server env vars on the Next.js host (not `NEXT_PUBLIC_*`)
