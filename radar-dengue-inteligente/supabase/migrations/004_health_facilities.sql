-- Diretório institucional; não armazena prontuários ou dados de pacientes.
create table public.dengue_health_facilities (
 id uuid primary key default gen_random_uuid(),catalog_key text unique,
 replaces_id uuid references public.dengue_health_facilities(id) on delete set null,
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 name text not null check(char_length(btrim(name)) between 3 and 160),
 facility_type text not null check(facility_type in ('Centro de endemias','Vigilância sanitária','Vigilância epidemiológica','Unidade básica de saúde','Centro de saúde','UPA / pronto atendimento','Hospital','Ponto de vacinação','Outro')),
 address text not null check(char_length(btrim(address)) between 8 and 300),
 district text not null check(char_length(btrim(district)) between 2 and 100),
 description text not null check(char_length(btrim(description)) between 10 and 1000),
 phone text not null default '' check(char_length(phone)<=30 and phone ~ '^[0-9[:space:]()+-]*$'),
 cnes_code text not null default '' check(cnes_code='' or cnes_code ~ '^[0-9]{7}$'),
 opening_hours text not null default '' check(char_length(opening_hours)<=300),
 vaccination_status text not null default 'unknown' check(vaccination_status in ('unknown','reported','not_reported')),
 medical_care_status text not null default 'unknown' check(medical_care_status in ('unknown','reported','not_reported')),
 service_notes text not null default '' check(char_length(service_notes)<=700),
 source_url text not null default '' check(char_length(source_url)<=500 and (source_url='' or (source_url ~ '^https://[a-zA-Z0-9]' and split_part(split_part(source_url,'://',2),'/',1) not like '%@%'))),
 source_kind text not null default 'community' check(source_kind in ('community','official_partial')),
 source_notes text not null default '',sources_checked_on date,
 latitude numeric check(latitude between -90 and 90),longitude numeric check(longitude between -180 and 180),
 location_precision text not null default 'pending' check(location_precision in ('pending','approximate','confirmed')),
 location_notes text not null default '',location_source_url text not null default '',
 publication_status text not null default 'pending' check(publication_status in ('pending','published','archived')),
 information_reviewed boolean not null check(information_reviewed),
 check((latitude is null)=(longitude is null)),
 check((location_precision='pending' and latitude is null) or (location_precision in ('approximate','confirmed') and latitude is not null)),
 check(replaces_id is null or replaces_id<>id),check(replaces_id is null or publication_status<>'published'),
 check(publication_status<>'published' or sources_checked_on is not null),
 check((vaccination_status<>'reported' and medical_care_status<>'reported') or source_url<>'')
);
create index dengue_health_facilities_author_idx on public.dengue_health_facilities(created_by);
create index dengue_health_facilities_replaces_idx on public.dengue_health_facilities(replaces_id) where replaces_id is not null;
create index dengue_health_facilities_catalog_idx on public.dengue_health_facilities(publication_status,name,id);
create unique index dengue_health_facilities_cnes_published_idx on public.dengue_health_facilities(cnes_code) where publication_status='published' and cnes_code<>'';
alter table public.dengue_health_facilities enable row level security;
revoke all on public.dengue_health_facilities from public,anon,authenticated;
grant select(id,replaces_id,catalog_key,name,facility_type,address,district,description,phone,opening_hours,cnes_code,vaccination_status,medical_care_status,service_notes,source_url,source_kind,source_notes,sources_checked_on,latitude,longitude,location_precision,location_notes,location_source_url,publication_status,created_at,information_reviewed)
 on public.dengue_health_facilities to anon,authenticated;
grant insert(id,replaces_id,name,facility_type,address,district,description,phone,opening_hours,cnes_code,vaccination_status,medical_care_status,service_notes,source_url,latitude,longitude,location_precision,information_reviewed)
 on public.dengue_health_facilities to authenticated;
create policy health_facilities_read on public.dengue_health_facilities for select to anon,authenticated
 using(publication_status='published' or (publication_status='pending' and created_by=(select auth.uid())));
create policy health_facilities_suggest on public.dengue_health_facilities for insert to authenticated
 with check(created_by=(select auth.uid()) and publication_status='pending' and source_kind='community' and catalog_key is null and sources_checked_on is null and location_precision in ('pending','approximate'));
comment on table public.dengue_health_facilities is 'Diretório público institucional de Itumbiara, com sugestões pendentes e publicação pelo responsável no Supabase. Não confirma agenda ou estoque de vacinas.';
