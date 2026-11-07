# VERITY frontend

Vite/React consumer site and company dashboard. The app signs users in through Supabase Auth, sends the user access token to FastAPI for company operations, and loads public transparency pages by product slug.

## Configure

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key. `VITE_BACKEND_URL` defaults to `http://127.0.0.1:8000/api/v1`. Never put the Supabase secret/service-role key or OpenAI key in frontend variables.

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
npm install
npm run dev
```

The Vite development server uses `http://localhost:3000`, which is included in the backend's default CORS origins. The backend and AI engine should be running separately.

## Connected flows

- Company login uses an existing Supabase Auth email/password account.
- Company dashboard accepts company-wide sustainability reports, product-specific documents, and product claims; portfolio assessment evaluates each product separately using shared and product-specific evidence.
- Publishing a product exposes `/p/{slug}`; its page displays the latest stored assessment and evidence references.
- Homepage cards and search load published products from the backend.
