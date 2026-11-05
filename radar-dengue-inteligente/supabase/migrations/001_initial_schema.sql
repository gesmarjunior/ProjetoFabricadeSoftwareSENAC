-- Execute uma vez no SQL Editor de um projeto Supabase novo.
-- Prefixos permitem instalar os dois aplicativos no mesmo projeto.
begin;

create table public.dengue_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  image_path text,
  description text not null check (char_length(trim(description)) between 10 and 1000),
  latitude numeric(6,3) not null check (latitude between -90 and 90),
  longitude numeric(7,3) not null check (longitude between -180 and 180),
  district text not null check (char_length(trim(district)) between 2 and 80),
  status text not null default 'Recebido'
    check (status in ('Recebido', 'Em análise', 'Orientação enviada', 'Resolvido', 'Descartado')),
  risk_score smallint not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('Baixo', 'Médio', 'Alto', 'Crítico')),
  guidance text not null,
  classification text not null,
  classification_reviewed boolean not null check (classification_reviewed),
  container_type text not null check (container_type in (
    'Pneu', 'Balde/Vaso/Recipiente', 'Caixa d’água/Reservatório', 'Lixo/Garrafa/Lata', 'Calha/Laje', 'Outro'
  )),
  standing_water boolean not null default false,
  outdoor_area boolean not null default false,
  recurrent boolean not null default false,
  status_history jsonb not null default '[]'::jsonb
    check (jsonb_typeof(status_history) = 'array'),
  is_demo boolean not null default false,
  constraint dengue_owner_or_demo check (
    (is_demo and user_id is null and image_path is null)
    or (not is_demo and user_id is not null and image_path is not null
      and split_part(image_path, '/', 1) = user_id::text)
  ),
  constraint dengue_classification_matches check (classification = container_type)
);

create index dengue_owner_created_idx on public.dengue_occurrences (user_id, created_at desc);
create index dengue_created_idx on public.dengue_occurrences (created_at desc);
create index dengue_status_risk_idx on public.dengue_occurrences (status, risk_score desc);
create index dengue_district_idx on public.dengue_occurrences (district);

-- Nunca confie no risco ou histórico recebidos pelo navegador.
create function public.dengue_validate_occurrence()
returns trigger language plpgsql set search_path = '' as $$
declare
  allowed_next text[];
begin
  if tg_op = 'INSERT' then
    if not new.is_demo and new.status <> 'Recebido' then
      raise exception 'Um registro novo deve começar como Recebido.';
    end if;
    if not new.is_demo then new.created_at := now(); end if;
    new.status_history := jsonb_build_array(jsonb_build_object(
      'status', new.status, 'created_at', new.created_at));
  else
    if new.id is distinct from old.id or new.user_id is distinct from old.user_id
      or new.created_at is distinct from old.created_at or new.is_demo is distinct from old.is_demo then
      raise exception 'Identidade, autoria e origem do registro não podem ser alteradas.';
    end if;
    allowed_next := case old.status
      when 'Recebido' then array['Em análise', 'Descartado']
      when 'Em análise' then array['Orientação enviada', 'Resolvido', 'Descartado']
      when 'Orientação enviada' then array['Em análise', 'Resolvido', 'Descartado']
      when 'Resolvido' then array['Em análise']
      else array[]::text[] end;
    if not (new.status = any(allowed_next)) then
      raise exception 'Transição de status não permitida: % para %.', old.status, new.status;
    end if;
    new.status_history := old.status_history || jsonb_build_array(jsonb_build_object(
      'status', new.status, 'created_at', now()));
  end if;
  new.updated_at := now();
  new.latitude := round(new.latitude, 3);
  new.longitude := round(new.longitude, 3);
  new.classification := new.container_type;
  new.risk_score := case new.container_type
    when 'Pneu' then 25 when 'Balde/Vaso/Recipiente' then 20
    when 'Caixa d’água/Reservatório' then 25 when 'Lixo/Garrafa/Lata' then 15
    when 'Calha/Laje' then 20 else 10 end
    + case when new.standing_water then 35 else 0 end
    + case when new.outdoor_area then 15 else 0 end
    + case when new.recurrent then 25 else 0 end;
  new.risk_level := case when new.risk_score <= 30 then 'Baixo'
    when new.risk_score <= 60 then 'Médio' when new.risk_score <= 80 then 'Alto' else 'Crítico' end;
  new.guidance := 'Se for seguro, elimine a água parada, lave as bordas dos recipientes e mantenha reservatórios cobertos. Para locais de difícil acesso, procure o setor municipal responsável. A ferramenta não substitui equipes de saúde ou vigilância.';
  return new;
end;
$$;

revoke all on function public.dengue_validate_occurrence() from public, anon, authenticated;
create trigger dengue_validate_before_write before insert or update
  on public.dengue_occurrences for each row execute function public.dengue_validate_occurrence();

alter table public.dengue_occurrences enable row level security;
revoke all on public.dengue_occurrences from anon, authenticated;
grant select on public.dengue_occurrences to authenticated;
grant insert (
  user_id, image_path, description, latitude, longitude, district, status,
  risk_score, risk_level, guidance, classification, classification_reviewed,
  container_type, standing_water, outdoor_area, recurrent
) on public.dengue_occurrences to authenticated;
grant update (status) on public.dengue_occurrences to authenticated;

create policy dengue_read_own on public.dengue_occurrences
  for select to authenticated using ((select auth.uid()) = user_id and not is_demo);
create policy dengue_insert_own on public.dengue_occurrences
  for insert to authenticated with check ((select auth.uid()) = user_id and not is_demo);
create policy dengue_update_own on public.dengue_occurrences
  for update to authenticated using ((select auth.uid()) = user_id and not is_demo)
  with check ((select auth.uid()) = user_id and not is_demo);

-- Apenas uma projeção explicitamente segura pode ser lida pela comunidade.
-- SECURITY DEFINER é necessário para ler outras linhas, sem expor a tabela.
create function public.get_dengue_community_occurrences()
returns table (
  id uuid, created_at timestamptz, updated_at timestamptz,
  latitude numeric, longitude numeric, district text, status text,
  risk_score smallint, risk_level text, classification text,
  classification_reviewed boolean, guidance text, container_type text, standing_water boolean,
  outdoor_area boolean, recurrent boolean, is_demo boolean
)
language sql stable security definer set search_path = '' as $$
  select o.id, o.created_at, o.updated_at, o.latitude, o.longitude, o.district,
    o.status, o.risk_score, o.risk_level, o.classification,
    o.classification_reviewed, o.guidance, o.container_type, o.standing_water,
    o.outdoor_area, o.recurrent, o.is_demo
  from public.dengue_occurrences o
  where (select auth.uid()) is not null
  order by o.created_at desc;
$$;
revoke all on function public.get_dengue_community_occurrences() from public, anon;
grant execute on function public.get_dengue_community_occurrences() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dengue-photos', 'dengue-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy dengue_photo_upload_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'dengue-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy dengue_photo_read_own on storage.objects
  for select to authenticated using (
    bucket_id = 'dengue-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- Remover somente o próprio upload permite compensar uma falha ao salvar a linha.
create policy dengue_photo_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'dengue-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
