"""VERITY AI engine - serviciu HTTP apelat de backend (POST /assess).

Contract: backend/data-dictionary.md (v1.1) din repo-ul adobe-hackathon.
Pornire:  uvicorn engine:app --port 8001
Env:      OPENAI_API_KEY (obligatoriu), AI_ENGINE_TOKEN (optional, acelasi ca in backend/.env),
          OPENAI_MODEL (implicit gpt-4o-mini)
"""
import json, os, re
import httpx
import pymupdf
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

load_dotenv()

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
TOKEN = os.environ.get("AI_ENGINE_TOKEN", "")
CHUNK_PAGES = 10
CLAIM_TYPES = {"generic", "quantitative", "certification", "offset_based", "future_target"}
STATUSES = {"supported", "partially_supported", "unsubstantiated", "contradicted", "needs_review"}
SCOPES = {"company", "product", "site"}
VAGUE = re.compile(r"eco[- ]?friendly|green|sustainab|planet|natural|verde|ecologic|sustenabil|prietenos cu mediul", re.I)

app = FastAPI(title="VERITY AI engine")


# ---------- LLM ----------
def llm_json(system: str, user: str):
    """Returneaza (dict, tokens). Inlocuibil in teste."""
    from openai import OpenAI
    r = OpenAI().chat.completions.create(
        model=MODEL, temperature=0, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}])
    return json.loads(r.choices[0].message.content), (r.usage.total_tokens if r.usage else 0)


# ---------- modele request ----------
class EngineDoc(BaseModel):
    id: str
    filename: str
    download_url: str

class EngineClaim(BaseModel):
    id: str
    text: str

class AssessBody(BaseModel):
    documents: list[EngineDoc]
    claims: list[EngineClaim]


# ---------- utilitare ----------
def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip().lower()

def read_pdf(data: bytes) -> list[str]:
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        return [p.get_text("text") for p in doc]

def chunks(pages: list[str]):
    for start in range(0, len(pages), CHUNK_PAGES):
        part = pages[start:start + CHUNK_PAGES]
        yield "\n\n".join(f"[PAGE {start + i + 1}]\n{t}" for i, t in enumerate(part))

FACT_SYSTEM = (
    "Extract sustainability FACTS from the report text (pages marked [PAGE n]). Use only what is explicitly written; "
    "if something is not stated, use null. Write texts in the document's language. Return JSON: "
    '{"facts":[{"text":str,"value":number|null,"unit":str|null,"scope":"company"|"product"|"site"|null,'
    '"period":str|null,"page":int,"quote":str}]}. "quote" MUST be copied EXACTLY, character for character, '
    "from that page. Include scope limits (e.g. a single facility -> scope \"site\")."
)

CLAIM_SYSTEM = (
    "You are a greenwashing auditor. For EACH claim, judge it ONLY against the provided facts. Never invent evidence. "
    "Statuses: supported (backed, same scope and period), partially_supported (different scope/period/figure or "
    "ignored qualifier), unsubstantiated (not enough evidence - this does NOT mean false), contradicted (facts directly "
    "contradict it; requires evidence), needs_review (ambiguous or incomplete). Claim types: generic, quantitative, "
    "certification, offset_based, future_target. Return JSON: "
    '{"claims":[{"id":str,"type":str,"status":str,"confidence":number 0-1,"fact_ids":[str],"explanation":str '
    '(1-2 sentences, cite page like "p. 3"),"evidence_limits":str|null,"suggested_rewrite":str|null}]}. '
    "Use the SAME claim ids you were given. suggested_rewrite must use only supported facts, else null. "
    "Write in the language of the claim."
)


def extract_facts(doc_id: str, pages: list[str], ask):
    facts, tokens = [], 0
    for chunk in chunks(pages):
        out, t = ask(FACT_SYSTEM, chunk)
        tokens += t
        for f in out.get("facts", []):
            page, quote = f.get("page"), f.get("quote") or ""
            if not isinstance(page, int) or not 1 <= page <= len(pages) or not f.get("text"):
                continue
            if norm(quote) not in norm(pages[page - 1]) or not quote.strip():
                continue  # regula 7: citatul trebuie sa existe pe pagina
            value = f.get("value")
            facts.append({
                "document_id": doc_id, "text": f["text"],
                "value": float(value) if isinstance(value, (int, float)) else None,
                "unit": f.get("unit"), "scope": f.get("scope") if f.get("scope") in SCOPES else None,
                "period": f.get("period"), "page": page, "quote": quote.strip()})
    return facts, tokens


def assess_claims(claims: list[EngineClaim], facts: list[dict], ask):
    payload = {"claims": [c.model_dump() for c in claims],
               "facts": [{"id": f["id"], "text": f["text"], "value": f["value"], "unit": f["unit"],
                          "scope": f["scope"], "period": f["period"], "page": f["page"]} for f in facts]}
    out, tokens = ask(CLAIM_SYSTEM, json.dumps(payload, ensure_ascii=False))
    by_model = {c.get("id"): c for c in out.get("claims", [])}
    fact_by_id = {f["id"]: f for f in facts}
    results = []
    for c in claims:
        m = by_model.get(c.id, {})
        status = m.get("status") if m.get("status") in STATUSES else "needs_review"
        evidence = [{"fact_id": fid, "page": fact_by_id[fid]["page"], "quote": fact_by_id[fid]["quote"]}
                    for fid in dict.fromkeys(m.get("fact_ids") or []) if fid in fact_by_id]
        if status in {"supported", "partially_supported", "contradicted"} and not evidence:
            status = "needs_review"  # regulile 2 si 3
        ctype = m.get("type") if m.get("type") in CLAIM_TYPES else "generic"
        if VAGUE.search(c.text) and not re.search(r"\d", c.text):
            ctype = "generic"  # regula 6: generic marcat determinist
        try:
            conf = min(1.0, max(0.0, float(m.get("confidence", 0.3))))
        except (TypeError, ValueError):
            conf = 0.3
        results.append({
            "id": c.id, "text": c.text, "type": ctype, "status": status, "confidence": conf,
            "evidence": evidence,
            "explanation": m.get("explanation") or "The engine could not produce an explanation; human review needed.",
            "evidence_limits": m.get("evidence_limits"), "suggested_rewrite": m.get("suggested_rewrite")})
    return results, tokens


def run_assessment(docs_pages: dict[str, list[str]], claims: list[EngineClaim], ask=llm_json) -> dict:
    facts, tokens = [], 0
    for doc_id, pages in docs_pages.items():
        f, t = extract_facts(doc_id, pages, ask)
        facts += f; tokens += t
    for i, f in enumerate(facts, 1):
        f["id"] = f"f{i}"
    results, t = assess_claims(claims, facts, ask)
    total_pages = sum(len(pages) for pages in docs_pages.values())
    return {"facts": facts, "claims": results,
            "meta": {"model": MODEL, "tokens": tokens + t, "pages": total_pages}}


# ---------- HTTP ----------
def check_auth(authorization: str | None = Header(default=None)):
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/assess", dependencies=[Depends(check_auth)])
async def assess(body: AssessBody):
    docs_pages = {}
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as http:
        for d in body.documents:
            try:
                r = await http.get(d.download_url); r.raise_for_status()
                docs_pages[d.id] = read_pdf(r.content)
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"Cannot read document {d.filename}") from exc
    return run_assessment(docs_pages, body.claims)
