# VERITY backend and AI engine

This directory contains two FastAPI services:

- Backend API: `http://127.0.0.1:8000` (`app.main:app`)
- AI engine: `http://127.0.0.1:8001` (`engine:app`)

The backend owns Supabase access and calls the AI engine at `POST /assess`. The engine downloads temporary signed document URLs, extracts page text with PyMuPDF, calls OpenAI, and returns the contract in `data-dictionary.md`.

## Install (PowerShell)

Run from this directory. Activation is optional:

```powershell
if (-not (Test-Path venv)) { python -m venv venv }
.\venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Set the Supabase URL, publishable/anon key, server-only secret/service-role key, and OpenAI API key in `.env`. Keep the secret and OpenAI keys out of frontend code and source control. Set `AI_ENGINE_TOKEN` to a shared random value; the backend and engine read the same value from `.env`.

Supabase setup:

1. Run `database/schema.sql` in the Supabase SQL Editor.
2. Create a private Storage bucket named `verity-documents`.
3. Add the frontend origin to `CORS_ORIGINS` if it differs from `http://localhost:3000`.

If the database was created before company-wide reports were added, also run
`database/company_level_documents.sql` in the SQL Editor. This allows a document
to belong to the company portfolio without being attached to one product.

## Run both services

Start the backend in one PowerShell window:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Start the AI engine in a second PowerShell window, also from `backend/`:

```powershell
.\venv\Scripts\python.exe -m uvicorn engine:app --reload --port 8001
```

Backend Swagger docs: `http://127.0.0.1:8000/docs`
AI engine health check: `http://127.0.0.1:8001/health`

## End-to-end flow runner

The helper creates/reuses the signed-in user's company, creates a product, uploads one or more PDFs, adds claims from a text file (one claim per line), then runs and saves an assessment.

```powershell
$env:VERITY_TOKEN = "<Supabase user access token>"
.\venv\Scripts\python.exe run_flow.py --product "Demo product 2" --pdf ".\report.pdf" --claims ".\claims.txt"
```

Use a new product name for each run unless passing `--product-id` for an existing product. The AI engine must be running, and `OPENAI_API_KEY` must be set in `.env`.

The public product response labels assessments as AI evaluations of company-provided documents. It does not claim independent verification or certification.
