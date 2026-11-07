"""Ruleaza fluxul complet prin backend-ul lui Luca: produs -> PDF -> afirmatii -> analiza -> salvat in DB.

Utilizare (backend si motor pornite):
  $env:VERITY_TOKEN = "<access token Supabase>"
  python run_flow.py --product "Tricou test" --pdf raport.pdf --claims afirmatii.txt

afirmatii.txt: o afirmatie pe linie. Poti da mai multe --pdf.
Daca nu dai --product-id, se creeaza un produs nou (si compania, daca nu exista).
"""
import argparse, json, os, sys
import httpx

p = argparse.ArgumentParser()
p.add_argument("--backend", default="http://127.0.0.1:8000")
p.add_argument("--company", default="Companie test")
p.add_argument("--product", default="Produs test")
p.add_argument("--product-id")
p.add_argument("--pdf", action="append", required=True)
p.add_argument("--claims", required=True)
a = p.parse_args()

token = os.environ.get("VERITY_TOKEN")
if not token:
    sys.exit("Seteaza VERITY_TOKEN (access token Supabase).")
api = a.backend.rstrip("/") + "/api/v1"
http = httpx.Client(headers={"Authorization": f"Bearer {token}"}, timeout=240)


def call(method, path, **kw):
    r = http.request(method, api + path, **kw)
    if r.status_code >= 400:
        sys.exit(f"{method} {path} -> {r.status_code}: {r.text}")
    return r.json() if r.content else None


# 1. companie
r = http.get(api + "/companies/me")
if r.status_code == 404:
    call("POST", "/companies", json={"name": a.company}); print("companie creata")
elif r.status_code >= 400:
    sys.exit(f"companies/me -> {r.status_code}: {r.text}")

# 2. produs
product_id = a.product_id or call("POST", "/products", json={"name": a.product})["id"]
print("produs:", product_id)

# 3. documente
doc_ids = []
for path in a.pdf:
    with open(path, "rb") as f:
        d = call("POST", f"/products/{product_id}/documents", files={"file": (os.path.basename(path), f, "application/pdf")})
    doc_ids.append(d["id"]); print("document:", d["filename"], d["id"])

# 4. afirmatii
claim_ids = []
for line in open(a.claims, encoding="utf-8"):
    if line.strip():
        c = call("POST", f"/products/{product_id}/claims", json={"text": line.strip()})
        claim_ids.append(c["id"])
print(len(claim_ids), "afirmatii adaugate")

# 5. analiza (backend -> motorul AI -> salvare in DB)
print("analizez (poate dura ~1 min)...")
out = call("POST", f"/products/{product_id}/assessments", json={"document_ids": doc_ids, "claim_ids": claim_ids})
for c in out["result"]["claims"]:
    print(f"\n[{c['status']}] {c['text']}\n  {c['explanation']}")
    if c.get("suggested_rewrite"):
        print("  -> alternativa:", c["suggested_rewrite"])
print("\nSalvat in DB. run id:", out["id"])
