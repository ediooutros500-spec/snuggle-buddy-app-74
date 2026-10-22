# CHECKLIST v2: Gateway Pai/Filhos

## PROJETO PRIMEIRO
- [x] Pool v2 e regras pai/filhos commitados
- [x] Registro seguro, validação upstream e rate limit
- [x] Painel administrativo autenticado
- [x] Painel comercial com menus funcionais em PT-BR
- [x] Auto-disparo do remix ao abrir a aplicação
- [x] Disparo manual do pai para sincronizar remixes publicados
- [x] Health check público em `/api/public/health`
- [x] Endpoints de imagem, embeddings e vídeo
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
- [ ] `REMIX_SYNC_SECRET` forte no pai e em cada filho
- [ ] Redeploy após salvar secrets

## FILHOS E TESTE FINAL
- [ ] Remix criado e publicado
- [ ] Chave do filho validada e registrada
- [ ] Filho aparece no painel com origem e key_hint
- [ ] Keep-alive configurado
- [ ] Workspaces/contas diferentes confirmados
- [ ] Registro, quotas, failover, Claude Code e smoke tests verdes
