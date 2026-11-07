import re
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client

from app.config import Settings, get_settings
from app.dependencies import company_for_user, get_supabase, get_user_id, owned_product
from app.schemas import (
    AssessmentRequest, AssessmentResult, ClaimCreate, ClaimUpdate,
    CompanyCreate, CompanyProfileUpdate, ProductCreate, ProductUpdate,
)

app = FastAPI(title="VERITY API", version="0.1.0")
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["Authorization", "Content-Type"],
)
api = "/api/v1"


def db_failure(exc: Exception):
    raise HTTPException(status_code=502, detail="The database operation failed.") from exc


def make_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or f"product-{uuid.uuid4().hex[:8]}"


def clear_product_assessments(client: Client, product_id: str):
    client.table("assessment_runs").delete().eq("product_id", product_id).execute()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post(api + "/companies", status_code=201)
def create_company(payload: CompanyCreate, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    existing = client.table("companies").select("id,name").eq("owner_user_id", user_id).limit(1).execute().data
    if existing:
        raise HTTPException(status_code=409, detail="This user already has a company.")
    try:
        return client.table("companies").insert({"name": payload.name, "owner_user_id": user_id}).execute().data[0]
    except Exception as exc:
        db_failure(exc)


@app.get(api + "/companies/me")
def get_my_company(user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    company = company_for_user(client, user_id)
    return {field: company.get(field) for field in (
        "id", "name", "created_at", "brand_category", "brand_tagline", "brand_published",
    )}


@app.patch(api + "/companies/me")
def update_my_company(payload: CompanyProfileUpdate, user_id: str = Depends(get_user_id),
                      client: Client = Depends(get_supabase)):
    company = company_for_user(client, user_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one field is required.")
    category = changes.get("brand_category", company.get("brand_category"))
    tagline = changes.get("brand_tagline", company.get("brand_tagline"))
    published = changes.get("brand_published", company.get("brand_published", False))
    if published and (not category or not tagline):
        raise HTTPException(status_code=422, detail="Add a brand category and tagline before publishing your brand profile.")
    try:
        updated = client.table("companies").update(changes).eq("id", company["id"]).execute().data[0]
        return {field: updated.get(field) for field in (
            "id", "name", "created_at", "brand_category", "brand_tagline", "brand_published",
        )}
    except Exception as exc:
        db_failure(exc)


@app.get(api + "/companies/me/documents")
def list_company_documents(user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    company = company_for_user(client, user_id)
    return (client.table("documents").select("id,product_id,filename,content_type,file_size,processing_status,created_at")
            .eq("company_id", company["id"]).is_("product_id", "null")
            .order("created_at", desc=True).execute().data)


@app.delete(api + "/companies/me/documents/{document_id}", status_code=204)
def delete_company_document(document_id: uuid.UUID, user_id: str = Depends(get_user_id),
                            client: Client = Depends(get_supabase), config: Settings = Depends(get_settings)):
    company = company_for_user(client, user_id)
    try:
        rows = (client.table("documents").select("id,storage_path").eq("id", str(document_id))
                .eq("company_id", company["id"]).is_("product_id", "null").limit(1).execute().data)
        if not rows:
            raise HTTPException(status_code=404, detail="Company report not found.")
        client.storage.from_(config.supabase_storage_bucket).remove([rows[0]["storage_path"]])
        product_rows = client.table("products").select("id").eq("company_id", company["id"]).execute().data
        for product in product_rows:
            clear_product_assessments(client, product["id"])
        client.table("documents").delete().eq("id", str(document_id)).eq("company_id", company["id"]).execute()
    except HTTPException:
        raise
    except Exception as exc:
        db_failure(exc)


@app.post(api + "/products", status_code=201)
def create_product(payload: ProductCreate, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    company = company_for_user(client, user_id)
    row = {"company_id": company["id"], "name": payload.name, "description": payload.description,
           "slug": payload.slug or make_slug(payload.name)}
    try:
        return client.table("products").insert(row).execute().data[0]
    except Exception as exc:
        db_failure(exc)


@app.get(api + "/products")
def list_products(user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    company = company_for_user(client, user_id)
    return client.table("products").select("*").eq("company_id", company["id"]).order("created_at", desc=True).execute().data


@app.get(api + "/products/{product_id}")
def get_product(product_id: uuid.UUID, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    return owned_product(client, user_id, str(product_id))[1]


@app.patch(api + "/products/{product_id}")
def update_product(product_id: uuid.UUID, payload: ProductUpdate, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    company, _ = owned_product(client, user_id, str(product_id))
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one field is required.")
    changes["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        rows = client.table("products").update(changes).eq("id", str(product_id)).eq("company_id", company["id"]).execute().data
        return rows[0]
    except Exception as exc:
        db_failure(exc)


@app.delete(api + "/products/{product_id}", status_code=204)
def delete_product(product_id: uuid.UUID, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase),
                   config: Settings = Depends(get_settings)):
    company, _ = owned_product(client, user_id, str(product_id))
    try:
        docs = (client.table("documents").select("storage_path").eq("company_id", company["id"])
                .eq("product_id", str(product_id)).execute().data)
        paths = [doc["storage_path"] for doc in docs]
        if paths:
            client.storage.from_(config.supabase_storage_bucket).remove(paths)
        client.table("products").delete().eq("id", str(product_id)).eq("company_id", company["id"]).execute()
    except Exception as exc:
        db_failure(exc)


@app.post(api + "/products/{product_id}/claims", status_code=201)
def create_claim(product_id: uuid.UUID, payload: ClaimCreate, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    owned_product(client, user_id, str(product_id))
    try:
        return client.table("claims").insert({"product_id": str(product_id), "text": payload.text}).execute().data[0]
    except Exception as exc:
        db_failure(exc)


@app.get(api + "/products/{product_id}/claims")
def list_claims(product_id: uuid.UUID, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    owned_product(client, user_id, str(product_id))
    return client.table("claims").select("*").eq("product_id", str(product_id)).order("created_at").execute().data


@app.delete(api + "/products/{product_id}/claims/{claim_id}", status_code=204)
def delete_claim(product_id: uuid.UUID, claim_id: uuid.UUID, user_id: str = Depends(get_user_id),
                 client: Client = Depends(get_supabase)):
    owned_product(client, user_id, str(product_id))
    try:
        rows = (client.table("claims").delete().eq("id", str(claim_id))
                .eq("product_id", str(product_id)).execute().data)
        if not rows:
            raise HTTPException(status_code=404, detail="Claim not found.")
        clear_product_assessments(client, str(product_id))
    except HTTPException:
        raise
    except Exception as exc:
        db_failure(exc)


@app.get(api + "/products/{product_id}/documents")
def list_documents(product_id: uuid.UUID, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    owned_product(client, user_id, str(product_id))
    return (client.table("documents").select("id,product_id,filename,content_type,file_size,processing_status,created_at")
            .eq("product_id", str(product_id)).order("created_at", desc=True).execute().data)


@app.delete(api + "/products/{product_id}/documents/{document_id}", status_code=204)
def delete_product_document(product_id: uuid.UUID, document_id: uuid.UUID, user_id: str = Depends(get_user_id),
                            client: Client = Depends(get_supabase), config: Settings = Depends(get_settings)):
    company, _ = owned_product(client, user_id, str(product_id))
    try:
        rows = (client.table("documents").select("id,storage_path").eq("id", str(document_id))
                .eq("company_id", company["id"]).eq("product_id", str(product_id)).limit(1).execute().data)
        if not rows:
            raise HTTPException(status_code=404, detail="Product document not found.")
        client.storage.from_(config.supabase_storage_bucket).remove([rows[0]["storage_path"]])
        clear_product_assessments(client, str(product_id))
        client.table("documents").delete().eq("id", str(document_id)).eq("company_id", company["id"]).execute()
    except HTTPException:
        raise
    except Exception as exc:
        db_failure(exc)


@app.patch(api + "/claims/{claim_id}")
def update_claim(claim_id: uuid.UUID, payload: ClaimUpdate, user_id: str = Depends(get_user_id), client: Client = Depends(get_supabase)):
    company = company_for_user(client, user_id)
    try:
        product_ids = [row["id"] for row in client.table("products").select("id").eq("company_id", company["id"]).execute().data]
        rows = (client.table("claims").update({"text": payload.text}).eq("id", str(claim_id))
                .in_("product_id", product_ids).execute().data)
        if not rows:
            raise HTTPException(status_code=404, detail="Claim not found.")
        return rows[0]
    except HTTPException:
        raise
    except Exception as exc:
        db_failure(exc)


@app.post(api + "/products/{product_id}/documents", status_code=201)
async def upload_document(product_id: uuid.UUID, file: UploadFile = File(...), user_id: str = Depends(get_user_id),
                          client: Client = Depends(get_supabase), config: Settings = Depends(get_settings)):
    company, _ = owned_product(client, user_id, str(product_id))
    if file.content_type != "application/pdf" or not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Upload a PDF file.")
    content = await file.read(config.max_upload_mb * 1024 * 1024 + 1)
    if len(content) > config.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"PDF exceeds {config.max_upload_mb} MB.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF.")
    document_id = str(uuid.uuid4())
    path = f"{company['id']}/{product_id}/{document_id}.pdf"
    try:
        client.storage.from_(config.supabase_storage_bucket).upload(
            path, content, file_options={"content-type": "application/pdf", "upsert": "false"}
        )
        row = {"id": document_id, "product_id": str(product_id), "company_id": company["id"],
               "filename": file.filename, "storage_path": path, "content_type": "application/pdf",
               "file_size": len(content), "processing_status": "pending"}
        return client.table("documents").insert(row).execute().data[0]
    except Exception as exc:
        try:
            client.storage.from_(config.supabase_storage_bucket).remove([path])
        except Exception:
            pass
        db_failure(exc)


@app.post(api + "/companies/me/documents", status_code=201)
async def upload_company_document(file: UploadFile = File(...), user_id: str = Depends(get_user_id),
                                  client: Client = Depends(get_supabase), config: Settings = Depends(get_settings)):
    company = company_for_user(client, user_id)
    if file.content_type != "application/pdf" or not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Upload a PDF file.")
    content = await file.read(config.max_upload_mb * 1024 * 1024 + 1)
    if len(content) > config.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"PDF exceeds {config.max_upload_mb} MB.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF.")
    document_id = str(uuid.uuid4())
    path = f"{company['id']}/company/{document_id}.pdf"
    try:
        client.storage.from_(config.supabase_storage_bucket).upload(
            path, content, file_options={"content-type": "application/pdf", "upsert": "false"}
        )
        row = {"id": document_id, "product_id": None, "company_id": company["id"],
               "filename": file.filename, "storage_path": path, "content_type": "application/pdf",
               "file_size": len(content), "processing_status": "pending"}
        return client.table("documents").insert(row).execute().data[0]
    except Exception as exc:
        try:
            client.storage.from_(config.supabase_storage_bucket).remove([path])
        except Exception:
            pass
        db_failure(exc)


@app.post(api + "/products/{product_id}/assessments", status_code=201)
async def create_assessment(product_id: uuid.UUID, payload: AssessmentRequest, user_id: str = Depends(get_user_id),
                            client: Client = Depends(get_supabase), config: Settings = Depends(get_settings)):
    company, _ = owned_product(client, user_id, str(product_id))
    if not config.ai_engine_url:
        raise HTTPException(status_code=503, detail="The AI assessment service is not configured yet.")
    requested_doc_ids = {str(value) for value in payload.document_ids}
    company_docs = (client.table("documents").select("*").eq("company_id", company["id"])
                    .is_("product_id", "null").execute().data)
    product_docs = (client.table("documents").select("*").eq("company_id", company["id"])
                    .eq("product_id", str(product_id)).execute().data)
    docs = [row for row in [*company_docs, *product_docs] if str(row["id"]) in requested_doc_ids]
    claims = client.table("claims").select("*").eq("product_id", str(product_id)).in_("id", [str(x) for x in payload.claim_ids]).execute().data
    if len(docs) != len(requested_doc_ids) or len(claims) != len(set(payload.claim_ids)):
        raise HTTPException(status_code=404, detail="A selected document or claim was not found.")
    local_claim_ids = {str(row["id"]): f"c{i + 1}" for i, row in enumerate(claims)}
    engine_docs = []
    for row in docs:
        signed = client.storage.from_(config.supabase_storage_bucket).create_signed_url(row["storage_path"], 1800)
        url = signed.get("signedURL") or signed.get("signedUrl")
        if not url:
            raise HTTPException(status_code=502, detail="Could not create a temporary document link.")
        engine_docs.append({"id": row["id"], "filename": row["filename"], "download_url": url})
    body = {"documents": engine_docs, "claims": [{"id": local_claim_ids[str(row["id"])], "text": row["text"]} for row in claims]}
    headers = {"Authorization": f"Bearer {config.ai_engine_token}"} if config.ai_engine_token else {}
    try:
        async with httpx.AsyncClient(timeout=180) as http:
            response = await http.post(config.ai_engine_url.rstrip("/") + "/assess", json=body, headers=headers)
            response.raise_for_status()
        result = AssessmentResult.model_validate(response.json())
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="The AI assessment service could not complete the request.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The AI assessment response did not match the contract.") from exc
    if any(str(f.document_id) not in requested_doc_ids for f in result.facts):
        raise HTTPException(status_code=502, detail="The AI response referenced an unrequested document.")
    returned_claims = {claim.id for claim in result.claims}
    if returned_claims != set(local_claim_ids.values()):
        raise HTTPException(status_code=502, detail="The AI response claim IDs did not match the request.")
    run_row = {"product_id": str(product_id), "document_ids": list(requested_doc_ids),
               "model": result.meta.model, "tokens": result.meta.tokens, "pages": result.meta.pages,
               "result_json": result.model_dump(mode="json")}
    try:
        run = client.table("assessment_runs").insert(run_row).execute().data[0]
        fact_ids = {}
        for fact in result.facts:
            saved = client.table("facts").insert({"run_id": run["id"], "document_id": str(fact.document_id),
                "response_fact_id": fact.id, "text": fact.text, "value": fact.value, "unit": fact.unit,
                "scope": fact.scope, "period": fact.period, "page": fact.page, "quote": fact.quote}).execute().data[0]
            fact_ids[fact.id] = saved["id"]
        for claim in result.claims:
            claim_uuid = next(key for key, local_id in local_claim_ids.items() if local_id == claim.id)
            saved = client.table("claim_assessments").insert({"run_id": run["id"], "claim_id": claim_uuid,
                "response_claim_id": claim.id, "claim_text_snapshot": claim.text, "status": claim.status.value,
                "confidence": claim.confidence, "explanation": claim.explanation, "evidence_limits": claim.evidence_limits,
                "suggested_rewrite": claim.suggested_rewrite}).execute().data[0]
            for evidence in claim.evidence:
                client.table("claim_evidence").insert({"claim_assessment_id": saved["id"], "fact_id": fact_ids[evidence.fact_id],
                    "page": evidence.page, "quote": evidence.quote}).execute()
    except Exception as exc:
        db_failure(exc)
    return {"id": run["id"], "created_at": run["created_at"], "result": result.model_dump(mode="json")}


@app.get(api + "/public/products")
def list_public_products(client: Client = Depends(get_supabase)):
    return (client.table("products").select("id,name,description,slug")
            .eq("is_published", True).order("created_at", desc=True).limit(100).execute().data)


@app.get(api + "/public/brands")
def list_public_brands(client: Client = Depends(get_supabase)):
    rows = (client.table("companies").select("id,name,brand_category,brand_tagline")
            .eq("brand_published", True).order("created_at", desc=True).limit(100).execute().data)
    return [{**row, "short": "BR", "tone": "mint", "plain": True,
             "claim": row["brand_tagline"], "pending": True,
             "valid": "Company profile · Assessment pending",
             "status": "Pending", "scoreCopy": "No assessment yet",
             "summary": f"{row['name']} describes its brand as: {row['brand_tagline']}. Company-wide sustainability evidence and product claims can be reviewed in the VERITY dashboard.",
             "evidence": []} for row in rows]


@app.get(api + "/public/products/{slug}")
def public_product(slug: str, client: Client = Depends(get_supabase)):
    rows = client.table("products").select("id,name,description,slug").eq("slug", slug).eq("is_published", True).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Published product not found.")
    product = rows[0]
    runs = client.table("assessment_runs").select("id,created_at,result_json").eq("product_id", product["id"]).order("created_at", desc=True).limit(1).execute().data
    return {"product": product, "assessment": runs[0] if runs else None,
            "assessment_notice": "AI assessment based on company-provided documents; not an independent certification."}
