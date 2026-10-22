# CHECKLIST v2: Gateway Pai/Filhos

## PROJETO PRIMEIRO
- [x] Pool v2 e regras pai/filhos commitados
- [x] Registro seguro, validação upstream e rate limit
- [x] Painel administrativo autenticado
- [x] Quotas e fallback auditado
- [x] Health check público em `/api/public/health`
- [ ] Build e lint verdes
- [ ] Modelos extras e compatibilidade Claude Code revisados
- [ ] Endpoints de imagem, embedding e vídeo

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
