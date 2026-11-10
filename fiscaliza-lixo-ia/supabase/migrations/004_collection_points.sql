-- Catálogo público separado dos registros de descarte irregular.
-- Clientes podem propor locais/correções; somente o responsável pelo banco publica.
create table public.fiscaliza_collection_points (
  id uuid primary key default gen_random_uuid(),
  catalog_key text unique,
  replaces_id uuid references public.fiscaliza_collection_points(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 3 and 160),
  site_type text not null check (site_type in ('Ecoponto','Coleta seletiva','Cooperativa de reciclagem','Aterro sanitário','Estação de transbordo','Outro')),
  address text not null check (char_length(btrim(address)) between 8 and 300),
  district text not null check (char_length(btrim(district)) between 2 and 100),
  description text not null check (char_length(btrim(description)) between 10 and 1000),
  accepted_materials text[] not null check (
    cardinality(accepted_materials) between 1 and 11 and array_position(accepted_materials,null) is null and
    accepted_materials <@ array['Entulho','Poda e galhadas','Papel e papelão','Plástico','Metal','Vidro','Pneus','Eletrônicos','Óleo de cozinha','Volumosos','Rejeitos']::text[]),
  rejected_materials text not null default '' check (char_length(rejected_materials)<=500),
  opening_hours text not null default '' check (char_length(opening_hours)<=500),
  access_conditions text not null default 'Confirmar antes da entrega' check (access_conditions in ('Confirmar antes da entrega','Entrega voluntária','Acesso restrito / agendamento')),
  source_url text not null default '' check (char_length(source_url)<=500 and (source_url='' or (source_url ~ '^https://[a-zA-Z0-9]' and split_part(split_part(source_url,'://',2),'/',1) not like '%@%'))),
  source_kind text not null default 'community' check (source_kind in ('community','municipal_partial')),
  source_notes text not null default '',
  latitude numeric check (latitude between -90 and 90),
  longitude numeric check (longitude between -180 and 180),
  location_precision text not null default 'pending' check (location_precision in ('pending','approximate','confirmed')),
  location_notes text not null default '',
  location_source_url text not null default '',
  publication_status text not null default 'pending' check (publication_status in ('pending','published','archived')),
  information_reviewed boolean not null check (information_reviewed),
  check ((latitude is null) = (longitude is null)),
  check ((location_precision='pending' and latitude is null) or (location_precision in ('approximate','confirmed') and latitude is not null)),
  check (site_type<>'Ecoponto' or not ('Rejeitos'=any(accepted_materials))),
  check (replaces_id is null or replaces_id<>id),
  check (replaces_id is null or publication_status<>'published')
);
create index fiscaliza_collection_points_author_idx on public.fiscaliza_collection_points(created_by);
create index fiscaliza_collection_points_replaces_idx on public.fiscaliza_collection_points(replaces_id) where replaces_id is not null;
create index fiscaliza_collection_points_catalog_idx on public.fiscaliza_collection_points(publication_status,name,id);
alter table public.fiscaliza_collection_points enable row level security;
revoke all on public.fiscaliza_collection_points from public, anon, authenticated;
grant select (id,replaces_id,catalog_key,name,site_type,address,district,description,accepted_materials,rejected_materials,opening_hours,access_conditions,source_url,source_kind,source_notes,latitude,longitude,location_precision,location_notes,location_source_url,publication_status,created_at,information_reviewed)
  on public.fiscaliza_collection_points to anon,authenticated;
grant insert (id,replaces_id,name,site_type,address,district,description,accepted_materials,rejected_materials,opening_hours,access_conditions,source_url,latitude,longitude,location_precision,information_reviewed)
  on public.fiscaliza_collection_points to authenticated;
create policy collection_points_read on public.fiscaliza_collection_points for select to anon,authenticated
using (publication_status='published' or (publication_status='pending' and created_by=(select auth.uid())));
create policy collection_points_suggest on public.fiscaliza_collection_points for insert to authenticated
with check (created_by=(select auth.uid()) and publication_status='pending' and source_kind='community' and catalog_key is null and location_precision in ('pending','approximate'));
comment on table public.fiscaliza_collection_points is 'Locais de coleta de Itumbiara. A publicação e a correção de dados oficiais exigem revisão do responsável no Supabase; não há administrador no cliente.';
