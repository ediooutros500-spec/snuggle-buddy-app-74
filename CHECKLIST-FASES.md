# CHECKLIST v2: Gateway Pai/Filhos

## PROJETO PRIMEIRO
- [x] Pool v2 e regras pai/filhos commitados
- [x] Registro seguro, validação upstream e rate limit
- [x] Painel administrativo autenticado
- [x] Painel comercial com Overview, Endpoints, Models, Workers, Clients e Usage
- [x] Health check público em `/api/public/health`
- [x] Disparo manual do pai para sincronizar remixes publicados
- [x] Endpoint `/api/public/v1/images/generations`
- [x] Endpoint `/api/public/v1/embeddings`
- [x] Endpoint `/api/public/v1/videos/generations`
- [ ] Build e lint verdes no Lovable
- [ ] Modelos Claude Code extras e Anthropic pass-through revisados
- [ ] Smoke test dos endpoints com gateway configurado

## SUPABASE E SECRETS, POR ÚLTIMO
- [ ] Criar segredo Vault `pool_keys_key` no 2o Supabase
- [ ] Executar `pool-setup.sql`
- [ ] Confirmar `pool_enc_key() is not null` e `get_next_api_key()` sem erro
- [ ] Confirmar RLS e nenhuma chave em texto puro
- [ ] `POOL_SUPABASE_SERVICE_ROLE_KEY`
- [ ] `POOL_SUPABASE_URL`, se necessário
- [ ] `CLAUDE_CODE_GATEWAY_TOKEN` forte
- [ ] `REMIX_SYNC_SECRET` forte, sem fallback
- [ ] Redeploy após salvar secrets

## FILHOS E TESTE FINAL
- [ ] Remix criado e publicado
- [ ] Secret configurado no remix
- [ ] URL visitada e filho aparece no painel
- [ ] Keep-alive configurado
- [ ] Workspaces/contas diferentes confirmados
- [ ] Registro, quotas, failover, Claude Code e smoke tests verdes
