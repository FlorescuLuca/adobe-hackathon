# VERITY backend

FastAPI MVP for company/product management, private PDF storage, claims, assessment persistence, and public product pages.

## Local setup (PowerShell, from `backend/`)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`. The frontend should send the Supabase Auth access token as `Authorization: Bearer <token>`.

## Supabase setup

1. Run `database/schema.sql` in the Supabase SQL Editor.
2. Create a **private** Storage bucket named `verity-documents`.
3. Put the project URL, anon key, and service-role key in `backend/.env`. The service-role key is backend-only and must never be sent to the frontend.
4. Add the frontend origin to `CORS_ORIGINS`.

## API overview

- `POST /api/v1/companies`, `GET /api/v1/companies/me`
- Product CRUD under `/api/v1/products`
- `POST /api/v1/products/{id}/documents` (PDF, maximum 10 MB by default)
- Claims under `/api/v1/products/{id}/claims`
- `POST /api/v1/products/{id}/assessments` with `document_ids` and `claim_ids`
- `GET /api/v1/public/products/{slug}` for published pages

The assessment adapter sends private documents to `AI_ENGINE_URL/assess` using short-lived signed URLs. The engine receives `documents: [{id, filename, download_url}]` and `claims: [{id, text}]`; it must echo the request-local claim IDs and return the JSON shape in `data-dictionary.md`. This HTTP boundary is a proposed integration contract for Person 3 to review.

Public output is explicitly labeled as an AI assessment of company-provided documents. It does not claim independent verification or certification.
