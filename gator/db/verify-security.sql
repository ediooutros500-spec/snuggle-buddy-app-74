-- Read-only verification. Run in this project's SQL editor or authorized SQL connection.
-- This file never returns worker keys, client keys, ciphertext, or Vault secret values.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname like 'gateway_%' and c.relkind = 'r'
order by c.relname;

select p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'pool_enc_key', 'register_worker_key', 'get_next_api_key', 'mark_key_status',
  'consume_client_quota', 'log_request_and_increment_usage'
)
order by p.proname;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename like 'gateway_%'
order by tablename, policyname;
