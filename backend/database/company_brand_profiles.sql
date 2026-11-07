-- Run in the Supabase SQL Editor before using company brand profiles.
alter table public.companies
    add column if not exists brand_category text,
    add column if not exists brand_tagline text,
    add column if not exists brand_published boolean not null default false;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'companies_brand_category_length'
          and conrelid = 'public.companies'::regclass
    ) then
        alter table public.companies add constraint companies_brand_category_length
            check (brand_category is null or char_length(brand_category) between 1 and 120);
    end if;
    if not exists (
        select 1 from pg_constraint
        where conname = 'companies_brand_tagline_length'
          and conrelid = 'public.companies'::regclass
    ) then
        alter table public.companies add constraint companies_brand_tagline_length
            check (brand_tagline is null or char_length(brand_tagline) between 1 and 240);
    end if;
end
$$;

create index if not exists companies_published_brands_idx
    on public.companies (created_at desc)
    where brand_published = true;
