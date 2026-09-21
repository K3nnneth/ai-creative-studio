create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_url text not null,
  canonical_domain text not null,
  name text,
  logo_source_url text,
  colors jsonb not null default '[]'::jsonb,
  voice text,
  audience text,
  value_proposition text,
  evidence jsonb not null default '{}'::jsonb,
  research_status text not null default 'draft'
    check (research_status in ('draft', 'researching', 'ready', 'failed')),
  last_researched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, canonical_domain)
);

create table public.research_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  provider text not null default 'firecrawl',
  requested_url text not null,
  progress jsonb not null default '[]'::jsonb,
  raw_result jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  platform text not null default 'shopify',
  external_id text,
  handle text,
  source_url text not null,
  title text not null,
  description text,
  vendor text,
  product_type text,
  price_amount numeric(12, 2),
  compare_at_price_amount numeric(12, 2),
  currency text not null default 'USD' check (char_length(currency) = 3),
  status text not null default 'discovered'
    check (status in ('discovered', 'ready', 'needs_review', 'hidden')),
  readiness_issues text[] not null default '{}',
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (brand_id, external_id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  kind text not null
    check (kind in ('brand_logo', 'product_source', 'generated_background', 'generated_ad')),
  source_url text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  status text not null default 'remote'
    check (status in ('remote', 'copying', 'stored', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_url is not null or storage_path is not null)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  name text not null,
  audience text,
  angle text,
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'review', 'approved', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  parent_creative_id uuid references public.creatives(id) on delete set null,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'review', 'approved', 'failed')),
  headline text not null,
  cta text not null,
  body_copy text,
  generation_prompt text,
  feedback_summary text,
  source_asset_id uuid references public.assets(id) on delete set null,
  background_asset_id uuid references public.assets(id) on delete set null,
  output_asset_id uuid references public.assets(id) on delete set null,
  generation_metadata jsonb not null default '{}'::jsonb,
  error_message text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, parent_creative_id, version)
);

create table public.creative_feedback (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references public.creatives(id) on delete cascade,
  resulting_creative_id uuid references public.creatives(id) on delete set null,
  feedback text not null check (char_length(trim(feedback)) > 0),
  created_at timestamptz not null default now()
);

create index brands_workspace_id_idx on public.brands(workspace_id);
create index research_runs_brand_created_idx on public.research_runs(brand_id, created_at desc);
create index products_brand_position_idx on public.products(brand_id, position, created_at);
create index products_brand_status_idx on public.products(brand_id, status);
create index assets_product_kind_idx on public.assets(product_id, kind);
create index assets_brand_kind_idx on public.assets(brand_id, kind);
create index campaigns_workspace_updated_idx on public.campaigns(workspace_id, updated_at desc);
create index campaigns_product_idx on public.campaigns(product_id);
create index creatives_campaign_created_idx on public.creatives(campaign_id, created_at);
create index creatives_parent_idx on public.creatives(parent_creative_id);
create index creative_feedback_creative_idx on public.creative_feedback(creative_id, created_at);

create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();
create trigger brands_set_updated_at before update on public.brands
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger assets_set_updated_at before update on public.assets
for each row execute function public.set_updated_at();
create trigger campaigns_set_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();
create trigger creatives_set_updated_at before update on public.creatives
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.brands enable row level security;
alter table public.research_runs enable row level security;
alter table public.products enable row level security;
alter table public.assets enable row level security;
alter table public.campaigns enable row level security;
alter table public.creatives enable row level security;
alter table public.creative_feedback enable row level security;

insert into public.workspaces (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Demo workspace')
on conflict (id) do nothing;

comment on table public.products is 'Reusable product catalog discovered from store research.';
comment on column public.brands.evidence is 'Per-field source and inference evidence shown during human review.';
comment on column public.products.readiness_issues is 'Reasons this catalog item needs correction before generation.';
comment on column public.creatives.parent_creative_id is 'Links a regenerated variant to the creative it came from.';
