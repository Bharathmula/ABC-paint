# ABC Paints Architecture and Process

## Responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| Frontend | `frontend/` | Dashboard screens, keyboard interaction, Excel parsing, filters and API calls |
| API/backend | `backend/` | HTTP endpoints, validation, order deduplication and database transactions |
| Database | PostgreSQL | Shared permanent orders, areas, stock and upload history |
| Streamlit host | `streamlit_app.py` + `dist/` | Publishes the built dashboard |

## Request-response lifecycle

```text
User action
   ↓
React frontend
   ↓ HTTPS request with JSON
Render Express API
   ↓ validated SQL transaction
PostgreSQL
   ↓ JSON response
React updates the dashboard
```

1. A user uploads a MARG Excel report.
2. `frontend/src/utils/excelParser.ts` detects sheets, headings, parties, items, OB numbers and SK numbers.
3. The frontend sends normalized orders to `POST /api/orders/import`.
4. The backend generates a stable deduplication key and inserts or updates each order in one transaction.
5. PostgreSQL records the import in `import_history`.
6. Every open dashboard periodically reads the shared API, so users on other computers receive the same data.

The browser never receives `DATABASE_URL` and never runs SQL.

## API endpoints

| Method and path | Purpose |
|---|---|
| `GET /api/health` | API and database health |
| `GET /api/orders` | Read shared orders |
| `POST /api/orders/import` | Merge or replace orders |
| `DELETE /api/orders` | Remove permanent order data |
| `GET /api/area-master` | Read Local/Transport classifications |
| `POST /api/area-master/import` | Persist area changes |
| `GET /api/stock` | Read shared stock |
| `PUT /api/stock` | Replace shared stock |
| `GET /api/import-history` | Read upload history |
| `DELETE /api/import-history` | Delete selected history records |

## PostgreSQL tables

- `orders`: deduplication key, voucher, company, area code, complete order JSON, source file and update time.
- `customer_master`: customer code, party, area and Local/Transport classification.
- `stock_records`: stock ID, complete stock JSON and update time.
- `import_history`: uploaded filename, worksheet, import mode, row counts, entity type and upload time.

## Security boundaries

- Store `DATABASE_URL` only in environment secrets.
- `VITE_` variables are public after compilation. Never place passwords or private tokens in them.
- CORS controls browser origins; it is not user authentication.
- The frontend calls API endpoints and cannot access database tables directly.

## Failure behavior

- If Streamlit is available but Render is unavailable, the interface loads but shared database actions fail visibly.
- If PostgreSQL is unavailable, permanent reads and writes fail.
- Browser storage is a temporary fallback. PostgreSQL is the company source of truth.
- Previously built static files can render while the API is temporarily unavailable.

## Git and deployment process

```text
feature work → npm run check → git commit → git push main
                                      ↓
                         Streamlit and Render redeploy
```

```powershell
npm run check
git add -A
git add -f dist
git commit -m "Describe the completed change"
git push origin main
```

## Deployment checklist

1. `npm run check` passes.
2. The newest `dist/` files are committed.
3. Render has `DATABASE_URL`.
4. The frontend API base points to Render.
5. Streamlit uses `streamlit_app.py`.
6. Secrets and local `.env` files are not committed.

Render should use `npm install --legacy-peer-deps && npm run build` as its build command and `npm start` as its start command. The backend detects Render and serves the compiled `dist/` directory without loading the Vite development server.
