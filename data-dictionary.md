# VERITY: dicționar de date al răspunsului motorului AI

Document de contract între motorul AI (Person 3) și backend/baza de date (Person 2).
Dacă schimbi un câmp, anunți cealaltă persoană și actualizezi acest fișier în același commit.

**Versiune contract:** 1.0

## Convenții generale

- Numele câmpurilor sunt în engleză, textele pentru utilizator (`text`, `explanation`, `suggested_rewrite`, etc.) sunt în limba documentului analizat.
- `id`-urile sunt șiruri (`"f1"`, `"c1"`), unice **doar în cadrul unui răspuns**. În baza de date ele nu înlocuiesc cheia primară proprie.
- `page` este numerotat de la **1** (prima pagină a PDF-ului = 1).
- Un câmp marcat „nullable” poate fi `null`. Un câmp care lipsește complet dintr-un răspuns este eroare de contract.
- Modelul nu deduce: dacă informația nu apare explicit în document, valoarea este `null`.

## Obiectul de top

| Câmp | Tip | Obligatoriu | Descriere |
|---|---|---|---|
| `facts` | listă de [Fact](#fact) | da | Fapte despre sustenabilitate extrase din PDF. Poate fi listă goală. |
| `claims` | listă de [Claim](#claim) | da | Afirmațiile din textul de marketing, fiecare cu verdict. Poate fi listă goală. |
| `meta` | [Meta](#meta) | da | Informații tehnice despre rulare. |

## Fact

Un fapt extras din documentul încărcat (raport de sustenabilitate etc.).

| Câmp | Tip | Nullable | Descriere | Exemplu |
|---|---|---|---|---|
| `id` | string | nu | Identificator în cadrul răspunsului. | `"f1"` |
| `text` | string | nu | Faptul, formulat pe scurt. | `"Emisii Scope 1+2 reduse cu 18% față de 2020"` |
| `value` | număr | da | Valoarea numerică, dacă există. | `18` |
| `unit` | string | da | Unitatea valorii. | `"%"`, `"tCO2e"` |
| `scope` | string (enum) | da | Cât acoperă faptul. Valori: `company`, `product`, `site`. | `"company"` |
| `period` | string | da | Perioada la care se referă, text liber. | `"2020-2024"`, `"2023"` |
| `page` | întreg ≥ 1 | nu | Pagina din PDF unde apare faptul. | `14` |
| `quote` | string | nu | Citat **exact** din pagină. Verificat în cod că apare în textul paginii. | `"..."` |

## Claim

O afirmație din textul de marketing, împreună cu verdictul.

| Câmp | Tip | Nullable | Descriere | Exemplu |
|---|---|---|---|---|
| `id` | string | nu | Identificator în cadrul răspunsului. | `"c1"` |
| `text` | string | nu | Afirmația, citată din textul de marketing. | `"Ambalaj 100% reciclabil"` |
| `type` | string (enum) | nu | Tipul afirmației (vezi tabelul de mai jos). | `"quantitative"` |
| `status` | string (enum) | nu | Verdictul (vezi tabelul de mai jos). | `"partially_supported"` |
| `confidence` | număr 0.0–1.0 | nu | Încrederea motorului în verdict. | `0.8` |
| `evidence` | listă de [Evidence](#evidence) | nu | Dovezile folosite. Poate fi goală doar la `cannot_verify` și `unsupported`. | |
| `explanation` | string | nu | 1-2 propoziții, cu referință la pagină. | `"Raportul confirmă ... doar pentru sticla de 500 ml (p. 22)."` |
| `evidence_limits` | string | da | Ce nu acoperă dovada (produs, perioadă, domeniu). | `"Acoperă un singur produs, anul 2023."` |
| `suggested_rewrite` | string | da | Variantă de marketing mai exactă, folosind doar fapte susținute. `null` dacă nu se poate propune una. | `"Sticla de 500 ml este 100% reciclabilă."` |

### Valori pentru `claim.type`

| Valoare | Înțeles |
|---|---|
| `generic` | Afirmație vagă, fără detalii ("eco-friendly", "verde", "sustenabil"). |
| `quantitative` | Conține o cifră sau un procent. |
| `certification` | Invocă o certificare sau o etichetă. |
| `offset_based` | "Neutru climatic" bazat pe compensări. |
| `future_target` | Obiectiv viitor ("net-zero 2040"). |

### Valori pentru `claim.status`

| Valoare | Înțeles |
|---|---|
| `supported` | Documentul susține afirmația, în domeniul și perioada afirmate. |
| `partially_supported` | Susținută doar parțial (alt domeniu, altă perioadă, cifră diferită sau calificativ ignorat). |
| `unsupported` | Documentul contrazice afirmația sau este o afirmație generică fără dovadă. |
| `cannot_verify` | Nu s-au găsit dovezi relevante în documentul încărcat. **Nu înseamnă că afirmația este falsă.** |

## Evidence

O dovadă legată de o afirmație.

| Câmp | Tip | Nullable | Descriere | Exemplu |
|---|---|---|---|---|
| `fact_id` | string | nu | `id` al unui fapt din `facts` din același răspuns. | `"f3"` |
| `page` | întreg ≥ 1 | nu | Pagina faptului. | `22` |
| `quote` | string | nu | Citat exact din pagină. | `"..."` |

## Meta

| Câmp | Tip | Nullable | Descriere | Exemplu |
|---|---|---|---|---|
| `model` | string | nu | Modelul folosit. | `"..."` |
| `tokens` | întreg ≥ 0 | nu | Tokeni consumați la analiză (intrare + ieșire). | `0` |
| `pages` | întreg ≥ 0 | nu | Numărul de pagini procesate. | `0` |

## Reguli de validitate (backend-ul poate valida și el)

1. `evidence[].fact_id` trebuie să existe în `facts[].id` din același răspuns.
2. `status` ∈ {`supported`, `partially_supported`} cere cel puțin o intrare în `evidence`.
3. `confidence` este între 0 și 1 inclusiv.
4. `page` este ≥ 1 și ≤ `meta.pages`.
5. Tipul `generic` este marcat de reguli deterministe din cod, nu doar de LLM.
6. Orice `quote` trebuie să apară în textul paginii indicate (verificat de motor înainte să trimită răspunsul).

## Exemplu complet (consistent)

```json
{
  "facts": [
    {"id": "f1", "text": "Emisii Scope 1+2 reduse cu 18% față de 2020",
     "value": 18, "unit": "%", "scope": "company", "period": "2020-2024",
     "page": 14, "quote": "..."},
    {"id": "f3", "text": "Sticla de 500 ml este 100% reciclabilă",
     "value": 100, "unit": "%", "scope": "product", "period": "2023",
     "page": 22, "quote": "..."}
  ],
  "claims": [
    {"id": "c1", "text": "Ambalaj 100% reciclabil",
     "type": "quantitative",
     "status": "partially_supported",
     "confidence": 0.8,
     "evidence": [{"fact_id": "f3", "page": 22, "quote": "..."}],
     "explanation": "Raportul confirmă 100% reciclabil doar pentru sticla de 500 ml (p. 22).",
     "evidence_limits": "Acoperă un singur produs, anul 2023.",
     "suggested_rewrite": "Sticla de 500 ml este 100% reciclabilă."}
  ],
  "meta": {"model": "...", "tokens": 0, "pages": 0}
}
```

## Sugestie de stocare în Supabase (pentru Person 2, de discutat)

- **Varianta simplă (recomandată pentru hackathon):** un rând per analiză, cu coloana `result` de tip `jsonb` care păstrează tot răspunsul, plus coloane separate pentru ce filtrați des (`product_id`, `created_at`, `status` general dacă îl calculați).
- **Varianta normalizată (dacă aveți timp):** tabele `analyses`, `facts`, `claims`, `claim_evidence`, cu `analysis_id` ca legătură. `id`-urile din JSON (`f1`, `c1`) se salvează într-o coloană `local_id`, iar cheia primară rămâne `uuid`.
- Indiferent de variantă, păstrați `meta.tokens` și `meta.model` ca să puteți calcula costul per analiză.
