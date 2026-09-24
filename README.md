# ABC Paints Orders and Dispatch Dashboard

Shared company dashboard for importing MARG Excel reports, managing orders, classifying areas, planning dispatches, tracking stock, and producing daily reports.

## Clean project layout

```text
frontend/       React user interface and browser-side Excel parsing
backend/        Express API, validation and PostgreSQL access
docs/           Architecture, data flow and deployment documentation
samples/        Example input reports
legacy/         Retained files that are not used by the current application
dist/           Generated production frontend used by Streamlit
streamlit_app.py
```

The frontend never connects directly to PostgreSQL. It sends JSON requests to the Render API. The backend validates and persists data using `DATABASE_URL`.

## Local development

1. Install Node.js and Python.
2. Run `npm install --legacy-peer-deps`.
3. Copy `.env.example` to `.env` and add `DATABASE_URL`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## Verification and production build

```powershell
npm run check
```

The generated frontend is written to `dist/`. Streamlit embeds that build:

```powershell
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Deployment

- GitHub stores the complete monorepo and version history.
- Streamlit Cloud runs `streamlit_app.py` and serves the committed `dist/` build.
- Render runs `npm run dev`, exposes the API, and connects to PostgreSQL.
- `VITE_API_BASE_URL` may override the Render API URL during frontend builds.
- `DATABASE_URL` belongs only in deployment secrets or a local ignored `.env` file.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full process.
