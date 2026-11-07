-- Run in the Supabase SQL Editor. All application access goes through FastAPI's
-- server-only service role; end-user requests must pass the ownership checks.
create table if not exists public.companies (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null unique references auth.users(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 160),
    created_at timestamptz not null default now()
);

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 200),
    description text,
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    is_published boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    -- A null product_id marks company-wide evidence shared across the portfolio.
    product_id uuid references public.products(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    filename text not null,
    storage_path text not null unique,
    content_type text not null default 'application/pdf' check (content_type = 'application/pdf'),
    file_size bigint not null check (file_size > 0),
    processing_status text not null default 'pending' check (processing_status in ('pending','processed','failed')),
    created_at timestamptz not null default now()
);

create table if not exists public.claims (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    text text not null check (char_length(text) between 1 and 2000),
    created_at timestamptz not null default now(),
    unique (product_id, text)
);

create table if not exists public.assessment_runs (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    document_ids uuid[] not null,
    model text not null,
    tokens integer not null check (tokens >= 0),
    pages integer not null check (pages >= 0),
    result_json jsonb not null,
    created_at timestamptz not null default now()
);

create table if not exists public.facts (
    id uuid primary key default gen_random_uuid(),
    run_id uuid not null references public.assessment_runs(id) on delete cascade,
    document_id uuid not null references public.documents(id) on delete cascade,
    response_fact_id text not null,
    text text not null,
    value numeric,
    unit text,
    scope text,
    period text,
    page integer not null check (page >= 1),
    quote text not null,
    unique (run_id, response_fact_id)
);

create table if not exists public.claim_assessments (
    id uuid primary key default gen_random_uuid(),
    run_id uuid not null references public.assessment_runs(id) on delete cascade,
    claim_id uuid not null references public.claims(id) on delete cascade,
    response_claim_id text not null,
    claim_text_snapshot text not null,
    status text not null check (status in ('supported','partially_supported','unsubstantiated','contradicted','needs_review')),
    confidence numeric not null check (confidence between 0 and 1),
    explanation text not null,
    evidence_limits text,
    suggested_rewrite text,
    unique (run_id, claim_id),
    unique (run_id, response_claim_id)
);

create table if not exists public.claim_evidence (
    id uuid primary key default gen_random_uuid(),
    claim_assessment_id uuid not null references public.claim_assessments(id) on delete cascade,
    fact_id uuid not null references public.facts(id) on delete cascade,
    page integer not null check (page >= 1),
    quote text not null
);

create index if not exists products_company_id_idx on public.products(company_id);
create index if not exists documents_product_id_idx on public.documents(product_id);
create index if not exists documents_company_id_idx on public.documents(company_id);
create index if not exists claims_product_id_idx on public.claims(product_id);
create index if not exists assessment_runs_product_created_idx on public.assessment_runs(product_id, created_at desc);
create index if not exists facts_run_id_idx on public.facts(run_id);
create index if not exists claim_assessments_run_id_idx on public.claim_assessments(run_id);

alter table public.companies enable row level security;
alter table public.products enable row level security;
alter table public.documents enable row level security;
alter table public.claims enable row level security;
alter table public.assessment_runs enable row level security;
alter table public.facts enable row level security;
alter table public.claim_assessments enable row level security;
alter table public.claim_evidence enable row level security;

-- Create a private Storage bucket named `verity-documents` in the Supabase dashboard.
