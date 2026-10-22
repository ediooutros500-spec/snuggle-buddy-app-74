# CHECKLIST v2: Gateway Pai/Filhos

## FASE 1: Banco seguro
- [x] `pool-setup.sql` v2 commitado no pai
- [ ] Criar o segredo do Vault `pool_keys_key` no 2o Supabase
- [ ] Executar `pool-setup.sql` no SQL Editor
- [ ] Confirmar `pool_enc_key() is not null` e `get_next_api_key()` sem erro
- [ ] Confirmar RLS ativo e nenhuma chave em texto puro

## FASE 2: Secrets no pai
- [ ] `POOL_SUPABASE_SERVICE_ROLE_KEY`
- [ ] `POOL_SUPABASE_URL`, se necessário
- [ ] `CLAUDE_CODE_GATEWAY_TOKEN` forte
- [ ] `REMIX_SYNC_SECRET` forte, sem fallback no código
- [ ] Redeploy após salvar secrets

## FASE 3: Blindagem do registro
- [ ] Registro via RPC segura, sem query de chave em texto puro
- [ ] Validação upstream antes de salvar
- [ ] Rate limit de 10 registros/min por IP
- [ ] Decidir opção A ou B para autenticação dos remixes

## FASE 4: Autenticação do painel
- [ ] GET de workers exige token admin
- [ ] Resposta usa apenas `key_hint`, nunca chave ou hash
- [ ] Painel envia Bearer token
- [ ] `.env` revisado e sem valores sensíveis

## FASE 5: Quotas por filho
- [ ] `daily_request_limit` e `requests_today` visíveis
- [ ] Limite editável apenas por admin
- [ ] Fallback do pai registrado explicitamente

## FASE 6: Filhos/remixes
- [ ] Remix criado e publicado
- [ ] Secret configurado no remix
- [ ] URL visitada e filho aparece no painel
- [ ] Keep-alive configurado
- [ ] Workspaces/contas diferentes confirmados para multiplicar créditos

## FASE 7: Modelos e mídia
- [ ] Modelos extras
- [ ] Anthropic pass-through
- [ ] Imagens, embeddings e vídeos

## FASE 8: Teste E2E
- [ ] Registro, quotas, failover, Claude Code e smoke tests
