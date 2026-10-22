-- ============================================================================
-- POOL DE CHAVES v2 - SEGURO (cifra em repouso + quotas por filho)
-- Requisitos: Supabase com pgcrypto e Vault.
-- PASSO 0 (OBRIGATORIO, rode antes, trocando pelo seu segredo de 32+ chars):
-- select vault.create_secret('TROQUE-POR-UM-SEGREDO-FORTE-32+', 'pool_keys_key');
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.gateway_key_pool (
  id uuid primary key default gen_random_uuid(),
  api_key_hash text not null unique,
  api_key_enc bytea not null,
  key_hint text,
  project_origin text,
  status text not null default 'active' check (status in ('active','exhausted','disabled')),
  total_requests bigint not null default 0,
  daily_request_limit integer default 500,
  requests_today integer not null default 0,
  usage_date date not null default current_date,
  last_used_at timestamptz,
  last_error text,
  exhausted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_key_pool_rr on public.gateway_key_pool (status, last_used_at asc nulls first);

-- Se a v1 ja foi aplicada, migre os dados com seguranca antes de remover api_key.
do $mig$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_key_pool' and column_name = 'api_key') then
    raise notice 'Coluna api_key encontrada: migre manualmente e depois remova-a.';
  end if;
end $mig$;

create or replace function public.pool_enc_key()
returns text language sql security definer stable set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pool_keys_key' limit 1;
$$;
revoke all on function public.pool_enc_key() from public, anon, authenticated;

create or replace function public.register_worker_key(p_api_key text, p_origin text default 'unknown', p_status text default 'active', p_error text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_key text := trim(p_api_key); v_hash text; v_hint text; v_id uuid;
begin
  if v_key is null or length(v_key) < 8 then raise exception 'invalid api_key'; end if;
  if p_status not in ('active','exhausted','disabled') then raise exception 'invalid status'; end if;
  v_hash := encode(digest(v_key, 'sha256'), 'hex');
  v_hint := left(v_key, 4) || '...' || right(v_key, 4);
  insert into public.gateway_key_pool (api_key_hash, api_key_enc, key_hint, project_origin, status, last_error, exhausted_at)
  values (v_hash, pgp_sym_encrypt(v_key, public.pool_enc_key()), v_hint, nullif(trim(p_origin), ''), p_status, p_error, case when p_status = 'exhausted' then now() end)
  on conflict (api_key_hash) do update set project_origin = excluded.project_origin, status = excluded.status, last_error = excluded.last_error, exhausted_at = excluded.exhausted_at
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.register_worker_key(text, text, text, text) from public, anon, authenticated;

create or replace function public.get_next_api_key()
returns text language plpgsql security definer set search_path = public as $$
declare picked record;
begin
  update public.gateway_key_pool set status = 'active', exhausted_at = null, last_error = null where status = 'exhausted' and exhausted_at < now() - interval '15 minutes';
  update public.gateway_key_pool set requests_today = 0, usage_date = current_date where usage_date < current_date;
  select id, api_key_enc into picked from public.gateway_key_pool where status = 'active' and (daily_request_limit is null or requests_today < daily_request_limit) order by last_used_at asc nulls first for update skip locked limit 1;
  if picked.id is null then return null; end if;
  update public.gateway_key_pool set last_used_at = now(), total_requests = total_requests + 1, requests_today = requests_today + 1 where id = picked.id;
  return pgp_sym_decrypt(picked.api_key_enc, public.pool_enc_key());
end $$;
revoke all on function public.get_next_api_key() from public, anon, authenticated;

create or replace function public.mark_key_status(p_api_key text, p_status text, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('active','exhausted','disabled') then raise exception 'invalid status'; end if;
  update public.gateway_key_pool set status = p_status, exhausted_at = case when p_status = 'exhausted' then now() else null end, last_error = left(p_error, 500) where api_key_hash = encode(digest(trim(p_api_key), 'sha256'), 'hex');
end $$;
revoke all on function public.mark_key_status(text, text, text) from public, anon, authenticated;

create table if not exists public.gateway_clients (id uuid primary key default gen_random_uuid(), name text not null, client_key text not null unique, status text not null default 'active' check (status in ('active','suspended')), allowed_models text[], rate_limit_rpm integer not null default 60, quota_limit_requests bigint, total_requests bigint not null default 0, total_input_tokens bigint not null default 0, total_output_tokens bigint not null default 0, last_used_at timestamptz, notes text, created_at timestamptz not null default now());
create table if not exists public.gateway_settings (id integer primary key, default_model text default 'google/gemini-3.6-flash', disabled_models text[] not null default '{}', global_rate_limit_rpm integer not null default 120, cooldown_minutes integer not null default 15, updated_at timestamptz not null default now());
insert into public.gateway_settings (id) values (1) on conflict (id) do nothing;
create table if not exists public.gateway_request_logs (id uuid primary key default gen_random_uuid(), client_id uuid references public.gateway_clients (id) on delete set null, client_name text, endpoint text not null, requested_model text, resolved_model text, status_code integer, latency_ms integer, input_tokens integer, output_tokens integer, error_message text, created_at timestamptz not null default now());
create index if not exists idx_request_logs_created on public.gateway_request_logs (created_at desc);

alter table public.gateway_key_pool enable row level security;
alter table public.gateway_clients enable row level security;
alter table public.gateway_settings enable row level security;
alter table public.gateway_request_logs enable row level security;

-- Verificacao manual:
-- select public.pool_enc_key() is not null;
-- select public.get_next_api_key();
