# VERITY AI engine (Person 3)

HTTP service called by the backend at `POST {AI_ENGINE_URL}/assess`.
Contract: `backend/data-dictionary.md`.

It downloads the PDFs from the signed URLs, extracts facts with PyMuPDF + OpenAI
(each `quote` is verified against the page text), assesses each claim against the facts,
and returns `facts` / `claims` / `meta` in the contract format.

## Run (PowerShell, from `ai_engine/`)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:OPENAI_API_KEY = "sk-..."
$env:AI_ENGINE_TOKEN = "same-value-as-backend/.env"
python -m uvicorn engine:app --port 8001
```

Health check: `http://127.0.0.1:8001/health`.

In `backend/.env` set `AI_ENGINE_URL=http://127.0.0.1:8001` and the same `AI_ENGINE_TOKEN`.
The OpenAI key stays only in the engine; the backend never needs it.
