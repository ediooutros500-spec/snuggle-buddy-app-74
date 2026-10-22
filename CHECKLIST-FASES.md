# CHECKLIST v2: Gateway Pai/Filhos

## FASE 1: Banco seguro
- [x] `pool-setup.sql` v2 commitado no pai
- [ ] Criar segredo Vault `pool_keys_key` no 2o Supabase
- [ ] Executar SQL no Supabase
- [ ] Confirmar `pool_enc_key() is not null` e `get_next_api_key()` sem erro
- [ ] Confirmar RLS e nenhuma chave em texto puro

## FASE 2: Secrets no pai
- [ ] `POOL_SUPABASE_SERVICE_ROLE_KEY`
- [ ] `POOL_SUPABASE_URL`, se necessário
- [ ] `CLAUDE_CODE_GATEWAY_TOKEN` forte
- [ ] `REMIX_SYNC_SECRET` forte, sem fallback
- [ ] Redeploy após salvar secrets

## FASE 3: Blindagem do registro
- [x] Registro usa RPC cifrada, sem query de chave em texto puro
- [x] Validação upstream antes de salvar
- [x] Rate limit de 10 registros/min por IP
- [x] Opção A: `REMIX_SYNC_SECRET` obrigatório para filhos

## FASE 4: Autenticação do painel
- [x] GET de workers exige token admin
- [x] Resposta usa apenas `key_hint`, nunca chave ou hash
- [x] Quota editável por PATCH autenticado
- [ ] Revisar `.env` publicado e remover valores sensíveis

## FASE 5: Quotas por filho
- [x] `daily_request_limit` e `requests_today` visíveis
- [x] Limite editável apenas por admin
- [x] Fallback do pai registrado explicitamente

## FASE 6: Filhos/remixes
- [ ] Remix criado e publicado
- [ ] Secret configurado no remix
- [ ] URL visitada e filho aparece no painel
- [ ] Keep-alive configurado
- [ ] Workspaces/contas diferentes confirmados

## FASE 7: Modelos e mídia
- [ ] Modelos extras
- [ ] Anthropic pass-through
- [ ] Imagens, embeddings e vídeos

## FASE 8: Teste E2E
- [ ] Registro, quotas, failover, Claude Code e smoke tests
