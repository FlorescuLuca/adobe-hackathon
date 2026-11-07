-- Run once in the Supabase SQL Editor for databases created before
-- company-level evidence was introduced. Null product_id means that a document
-- is shared evidence available to assessments across the company's portfolio.
alter table public.documents alter column product_id drop not null;
create index if not exists documents_company_id_idx on public.documents(company_id);
