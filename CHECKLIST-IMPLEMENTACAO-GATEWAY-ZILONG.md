# Checklist de Implementação: Projeto Lovable Remixável + Gator

Marque `[x]` somente com evidência: commit, comando, migration, resposta HTTP, teste ou log seguro. Nunca marque porque o arquivo foi criado.

## A. Decisões e segurança do desenho

- [x] Decisão atualizada: pai central e Gator na VPS; filhos/remixes continuam no Lovable.
- [x] Confirmar que o Gator será executado localmente e depois poderá ir para VPS/Docker.
- [x] Confirmar que Lovable é o único upstream.
- [x] Confirmar que cada remix publicado envia a própria key pelo servidor.
- [x] Confirmar que o browser nunca recebe a key.
- [x] Confirmar que o Supabase central não entrega key ao remix.
- [x] Confirmar se o Supabase será local no PC ou hospedado acessível pelo Gator.
- [ ] Registrar domínio/URL do Gator.
- [ ] Registrar política de workspaces e créditos.
- [ ] Registrar que workspaces diferentes podem ter cotas separadas.
- [ ] Registrar que remixes no mesmo workspace podem compartilhar créditos.
- [ ] Confirmar conformidade com os termos do provedor antes de uso comercial.

## B. Baseline do projeto Lovable

- [x] Checkout em `C:\Users\e_dio\Desktop\Gateway` confirmado.
- [x] Remote do GitHub confirmado.
- [x] Node/npm fixados.
- [x] `.env.example` criado sem valores reais.
- [x] `.env` ignorado pelo Git.
- [x] Scripts do root definidos.
- [ ] CRLF/Prettier normalizados.
- [x] `npm install` executado.
- [ ] `npm run lint` aprovado.
- [x] `npm run build` aprovado.
- [ ] `npm test` aprovado ou pendências documentadas.
- [ ] `src/routeTree.gen.ts` regenerado.
- [x] Todas as rotas fonte aparecem no route tree.
- [x] Home local responde.
- [x] Health local responde.

## C. Estrutura do Gator

- [x] Pasta `gator/` criada.
- [x] `gator/package.json` criado.
- [x] `gator/.env.example` criado.
- [x] `gator/src/server.ts` criado (implementado em `gator/src/server.mjs`).
- [x] `gator/src/config.ts` criado (implementado em `gator/src/config.mjs`).
- [ ] `gator/src/engine/` criado.
- [ ] `gator/src/auth/` criado.
- [ ] `gator/src/workers/` criado.
- [ ] `gator/src/usage/` criado.
- [ ] `gator/src/media/` criado.
- [ ] `gator/src/token-saver/` criado.
- [ ] `gator/src/db/` criado.
- [x] `gator/tests/` criado e executado: 19 testes de registro/HTTP aprovados.
- [x] Health do Gator responde sem banco.
- [x] Gator inicia sem keys e informa configuração ausente.
- [x] App Lovable e Gator têm comandos/documentação separados.

## D. Supabase central do Gator

- [x] Supabase central hospedado definido e conexão REST validada.
- [x] `GATOR_SUPABASE_URL` configurado no ambiente local do Gator.
- [ ] `GATOR_SUPABASE_ANON_KEY` protegido conforme o uso.
- [ ] `GATOR_SUPABASE_SERVICE_ROLE_KEY` somente no servidor.
- [x] Vault configurado; acesso do servidor aprovado e acesso anônimo recusado.
- [ ] Migration `gateway_clients` aplicada.
- [ ] Migration `gateway_client_keys` aplicada.
- [ ] Migration `gateway_key_pool` aplicada.
- [ ] Migration `gateway_request_logs` aplicada.
- [ ] Migration `gateway_usage_daily` aplicada.
- [ ] Migration `gateway_jobs` aplicada.
- [ ] Migration `gateway_workers` aplicada.
- [ ] Migration `gateway_audit_logs` aplicada.
- [ ] Migration `gateway_settings` aplicada.
- [ ] RLS ativo.
- [x] RPC `register_worker_key` testada com fixture desabilitada e limpeza: hash, cifra armazenada e upsert idempotente.
- [ ] RPC `get_next_api_key` testada.
- [ ] RPC `mark_key_status` testada.
- [ ] RPC `consume_client_quota` testada.
- [ ] RPC `log_request_and_increment_usage` testada.
- [ ] Backup criado.
- [ ] Restauração testada.
- [ ] Nenhuma key aberta em tabela, resposta ou log.

## E. Registro automático de qualquer projeto Lovable

Decisão atual: auto sem segredo compartilhado; HMAC/nonce são alternativa signed. Evidência local e pendências reais em CHECKLIST-EXECUCAO-GATEWAY-ZILONG.md.

- [ ] `GATOR_PUBLIC_URL` definido no pai/remix.
- [x] Modo auto padrão sem segredo por remix; modo signed opcional implementado.
- [x] Emissor em `src/lib/child-handshake.server.ts` implementado e testado.
- [x] Configuração server-side em `src/lib/child-config.server.ts` implementada e testada.
- [ ] `POST /api/public/v1/workers/announce` local criado.
- [ ] Gatilho SSR em `src/server.ts` criado.
- [ ] Gatilho client-side chama somente endpoint local.
- [x] Payload automático contém chave e origem; assinatura/nonce apenas no modo signed.
- [ ] Assinatura HMAC implementada.
- [ ] Replay bloqueado.
- [x] Modo auto permite registro sem secret; chave inválida ou upstream indisponível não é salvo.
- [ ] Filho envia HTTPS ao Gator.
- [x] Modo signed valida assinatura; modo auto valida chave no upstream.
- [ ] Gator valida origem.
- [ ] Gator limita tentativas por origem.
- [ ] Gator testa a key no Lovable upstream.
- [ ] Gator grava por RPC.
- [ ] Resposta não contém a key.
- [ ] Repetição do handshake é idempotente.
- [ ] Remix publicado aparece no Gator.
- [ ] `key_hint` aparece no painel.
- [ ] Browser não consegue ver a key.

## F. Motor unificado do Gator

- [ ] `gateway-engine.ts` criado.
- [ ] Auth de cliente centralizada.
- [ ] Quota centralizada.
- [ ] Rate limit centralizado.
- [ ] Request ID centralizado.
- [ ] Catálogo centralizado.
- [ ] Seleção de key centralizada.
- [ ] Retry/failover centralizados.
- [ ] Telemetria centralizada.
- [ ] Erros centralizados.
- [ ] Chat Completions usa o motor.
- [ ] Messages usa o motor.
- [ ] Responses usa o motor.
- [ ] Imagens usa o motor.
- [ ] Embeddings usa o motor.
- [ ] Vídeos/jobs usam o motor.
- [ ] Áudio usa o motor se validado.
- [ ] Nenhuma rota mantém auth/quota/log duplicado.

## G. Catálogo e modelos Lovable

- [ ] Fonte única de modelos criada.
- [ ] Aliases definidos.
- [ ] Endpoint upstream por modelo definido.
- [ ] Capacidades por modelo definidas.
- [ ] Streaming testado.
- [ ] Tools testadas.
- [ ] Visão testada.
- [ ] Imagem testada.
- [ ] Vídeo testado.
- [ ] Embedding testado.
- [ ] Áudio testado se disponível.
- [ ] Probe com timeout criado.
- [ ] Cache de disponibilidade criado.
- [ ] `/v1/models` usa fonte única.
- [ ] Painel usa fonte única.
- [ ] Modelo não validado não aparece como ativo.

## H. Clientes, proxy e quotas

- [ ] Login do painel implementado.
- [ ] RBAC implementado.
- [ ] Cliente criado por API/painel.
- [ ] API key mostrada uma vez.
- [ ] Hash armazenado.
- [ ] Rotação implementada.
- [ ] Revogação implementada.
- [ ] Quota RPM aplicada antes do upstream.
- [ ] Quota diária aplicada.
- [ ] Quota mensal aplicada.
- [ ] Quota de tokens aplicada.
- [ ] Allowlist de modelos aplicada.
- [ ] Allowlist de endpoints aplicada.
- [ ] Rate limit distribuído aplicado.
- [ ] `X-Request-ID` retornado.
- [ ] Headers de rate limit retornados.
- [ ] Proxy localhost testado.
- [ ] Proxy na LAN testado.
- [ ] API key obrigatória fora do localhost.
- [ ] CORS restrito.
- [ ] Configuração Cursor documentada.
- [ ] Configuração Claude Code documentada.
- [ ] Configuração Cline/Continue documentada.

## I. Pool e failover

- [ ] Key selecionada com `SKIP LOCKED`.
- [ ] Quota do worker respeitada.
- [ ] Cooldown respeitado.
- [ ] Contador atômico atualizado.
- [ ] 401/403 desabilita.
- [ ] 402/429 entra em cooldown.
- [ ] 5xx/timeout têm retry controlado.
- [ ] Backoff/jitter aplicado.
- [ ] Circuit breaker testado.
- [ ] Tentativas registradas.
- [ ] Stream não é duplicado depois de iniciado.
- [ ] Pool vazio retorna erro claro.
- [ ] Fallback do pai é explícito.
- [ ] Failover entre duas keys testado.

## J. Painel comercial do Gator

- [ ] `/dashboard` funcional.
- [ ] `/dashboard/endpoints` funcional.
- [ ] `/dashboard/models` funcional.
- [ ] `/dashboard/routes` funcional.
- [ ] `/dashboard/clients` funcional.
- [ ] `/dashboard/workers` funcional.
- [ ] `/dashboard/usage` funcional.
- [ ] `/dashboard/logs` funcional.
- [ ] `/dashboard/token-saver` funcional.
- [ ] `/dashboard/settings` funcional.
- [ ] `/dashboard/security` funcional.
- [ ] Loading/empty/error/success em todas as telas.
- [ ] Dados vêm da API, não hard-coded.
- [ ] Busca/filtros/paginação funcionam.
- [ ] Uso por worker aparece.
- [ ] Uso por cliente aparece.
- [ ] Cooldown aparece.
- [ ] Custos são marcados como estimativa.
- [ ] Textos revisados em PT-BR.
- [ ] Desktop testado.
- [ ] Mobile testado.

## K. Token Saver e jobs

- [ ] Detecção de `git diff` implementada.
- [ ] Detecção de `grep/find/ls/tree` implementada.
- [ ] Logs repetidos detectados.
- [ ] Código preservado.
- [ ] JSON preservado.
- [ ] Tool calls preservados.
- [ ] Binários ignorados.
- [ ] Sensíveis ignorados.
- [ ] Ativação por Gator implementada.
- [ ] Ativação por cliente implementada.
- [ ] Bypass por header implementado.
- [ ] Economia antes/depois medida.
- [ ] Jobs de vídeo/áudio/imagem implementados quando suportados.
- [ ] `job_id` devolvido.
- [ ] Polling/status implementado.
- [ ] Expiração/limpeza implementada.

## L. Operação local e VPS

- [ ] Scripts PowerShell de instalação criados.
- [ ] Script de início criado.
- [ ] Script de parada criado.
- [ ] Script de atualização criado.
- [ ] Supabase local por Docker documentado, se escolhido.
- [ ] Supabase hospedado documentado, se escolhido.
- [ ] Dockerfile do Gator criado.
- [ ] Docker Compose criado.
- [ ] Reverse proxy HTTPS documentado.
- [ ] Backup automático documentado.
- [ ] Logs com retenção.
- [ ] Monitoramento configurado.
- [ ] Health público mínimo.
- [ ] Diagnóstico protegido.
- [ ] Firewall configurado.
- [ ] Teste em VPS realizado.
- [ ] Teste em segundo computador realizado.

## M. Segurança e conformidade

- [x] `.env` retirado do versionamento; arquivos reais de ambiente ignorados.
- [ ] Service role não aparece no Lovable.
- [ ] Key do filho nunca aparece no browser.
- [ ] Key não aparece em logs.
- [ ] Key não aparece em GET administrativo.
- [ ] CORS administrativo protegido.
- [ ] HMAC/nonce/replay testados.
- [ ] SSRF testado.
- [ ] Redirect externo testado.
- [ ] Brute force testado.
- [ ] Rate limit de registro testado.
- [ ] Rotação de secrets testada.
- [ ] Auditoria administrativa criada.
- [ ] Retenção de logs definida.
- [ ] Termos do provedor revisados antes de uso comercial.

## N. Testes e release

- [ ] Testes unitários de auth.
- [ ] Testes unitários de HMAC.
- [ ] Testes de keys.
- [ ] Testes de quotas.
- [ ] Testes de rate limit.
- [ ] Testes de seleção concorrente.
- [ ] Testes de cooldown.
- [ ] Testes de failover.
- [ ] Testes de catálogo.
- [ ] Testes de streaming.
- [ ] Testes de tool use.
- [ ] Testes de jobs.
- [ ] Testes de workers.
- [ ] Testes do painel.
- [ ] Teste E2E: remix publicado envia key.
- [ ] Teste E2E: key aparece cifrada no Supabase.
- [ ] Teste E2E: Gator usa key do worker.
- [ ] Teste E2E: 429/402 troca key.
- [ ] Teste E2E: outro PC usa proxy.
- [ ] CI roda lint, build e testes.
- [ ] Release documentado.
- [ ] Checklist atualizada com evidências.

## Critério final de pronto

- [ ] App Lovable continua remixável.
- [ ] Remix publicado registra automaticamente no Gator.
- [ ] Supabase central armazena somente cifra/hash/hint.
- [ ] Gator atende API autenticada.
- [ ] Pool round-robin funciona.
- [ ] Quotas funcionam de verdade.
- [ ] Failover foi comprovado.
- [ ] Painel comercial funciona.
- [ ] Proxy local/VPS funciona.
- [ ] Backup e restauração foram comprovados.
- [ ] Documentação está atualizada.

Uma caixa só vira `[x]` depois de evidência verificável.

## Leitura do estado atual

O registro de execução distingue testes simulados, testes no Supabase real e implantação. As caixas de VPS, HTTPS, RLS, proxy completo e E2E continuam abertas até haver evidência. O pai central na VPS substitui a premissa antiga de hospedagem do pai no Lovable.
