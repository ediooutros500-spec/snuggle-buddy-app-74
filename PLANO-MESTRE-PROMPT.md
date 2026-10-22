# PLANO MESTRE v2: Gateway Pai/Filhos

A ordem segura é: banco e secrets, blindagem do registro, autenticação do painel, quotas por filho, remixes e só depois mídia/modelos extras.

## Regra de créditos
Cada `LOVABLE_API_KEY` consome créditos do workspace que a possui. Remixes no mesmo workspace não multiplicam créditos; para multiplicar de verdade, cada filho precisa estar em conta/workspace Lovable diferente.

## Fase 1
1. Crie no Vault do 2o Supabase um segredo forte com nome `pool_keys_key`.
2. Execute `pool-setup.sql`.
3. Confirme `pool_enc_key() is not null` e `get_next_api_key()` sem erro.

## Fase 2
Configure no pai: `POOL_SUPABASE_SERVICE_ROLE_KEY`, `POOL_SUPABASE_URL` quando necessário, `CLAUDE_CODE_GATEWAY_TOKEN` e `REMIX_SYNC_SECRET` forte. Faça redeploy.

## Fases 3 a 5
Implementar no código, nesta ordem: RPC segura e validação de registro, GET administrativo autenticado sem segredos, quotas por filho e fallback auditado.

## Fases 6 a 8
Publicar remixes em workspaces separados, configurar o secret do filho e keep-alive, depois testar failover, quotas, Claude Code e endpoints de mídia.
