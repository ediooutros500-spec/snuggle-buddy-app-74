# Checklist de Implementação: Gateway Zilong Body F74

Marque uma caixa somente depois de executar e verificar a evidência indicada. A checklist acompanha o plano em `PLANO-IMPLEMENTACAO-GATEWAY-ZILONG.md`.

## 0. Governança e baseline

- [ ] Confirmar que este é o repositório original correto.
- [ ] Confirmar `origin` do GitHub.
- [ ] Definir branch de produção.
- [ ] Definir Node/npm suportados.
- [ ] Definir que o único upstream é Lovable AI Gateway.
- [ ] Registrar modelos/capacidades que serão suportados.
- [ ] Registrar funcionalidades deliberadamente fora do escopo.
- [ ] Criar `.env.example` sem valores reais.
- [ ] Garantir `.env` fora do Git.
- [ ] Criar scripts `dev`, `build`, `start`, `lint`, `format`, `check` e `test`.
- [ ] Normalizar finais de linha e configuração Prettier.
- [ ] `npm install` concluído sem vulnerabilidades críticas.
- [ ] `npm run lint` passa.
- [ ] `npm run build` passa.
- [ ] `npm test` passa ou os testes pendentes estão documentados.
- [ ] `src/routeTree.gen.ts` regenerado.
- [ ] Cada rota fonte aparece no route tree.
- [ ] Home local responde.
- [ ] Health check local responde.

## 1. Contrato público da API

- [ ] Definir formato de autenticação.
- [ ] Definir envelope de erro.
- [ ] Definir headers CORS por tipo de rota.
- [ ] Definir `X-Request-ID`.
- [ ] Definir headers de rate limit.
- [ ] Definir tamanho máximo de body.
- [ ] Definir timeout padrão.
- [ ] Definir política de retry.
- [ ] Definir política de streaming.
- [ ] Documentar `/chat/completions`.
- [ ] Documentar `/messages`.
- [ ] Documentar `/responses`.
- [ ] Documentar `/models`.
- [ ] Documentar imagens.
- [ ] Documentar embeddings.
- [ ] Documentar vídeos/jobs.
- [ ] Documentar áudio, se suportado pelo Lovable.
- [ ] Criar exemplos curl.
- [ ] Criar exemplos JavaScript.
- [ ] Criar exemplos Python.
- [ ] Testar autenticação válida.
- [ ] Testar autenticação inválida.
- [ ] Testar body inválido.
- [ ] Testar modelo inválido.
- [ ] Testar payload grande.

## 2. Motor unificado

- [ ] Criar `gateway-engine.server.ts`.
- [ ] Centralizar extração de token.
- [ ] Centralizar autenticação do cliente.
- [ ] Centralizar status do cliente.
- [ ] Centralizar allowlist de modelos.
- [ ] Centralizar allowlist de endpoints.
- [ ] Centralizar quota.
- [ ] Centralizar rate limit.
- [ ] Centralizar geração de request ID.
- [ ] Centralizar resolução do destino Lovable.
- [ ] Centralizar seleção da key.
- [ ] Centralizar timeout.
- [ ] Centralizar retry/backoff.
- [ ] Centralizar failover.
- [ ] Centralizar telemetria.
- [ ] Centralizar normalização de erro.
- [ ] Adaptar Messages API.
- [ ] Adaptar Chat Completions.
- [ ] Adaptar Responses API.
- [ ] Adaptar mídia.
- [ ] Remover lógica duplicada das rotas.
- [ ] Testar que todas as rotas usam o motor.

## 3. Catálogo de modelos

- [ ] Criar fonte única de catálogo no backend.
- [ ] Adicionar modelos atuais válidos.
- [ ] Adicionar aliases.
- [ ] Classificar texto/código.
- [ ] Classificar visão.
- [ ] Classificar áudio.
- [ ] Classificar imagem.
- [ ] Classificar vídeo.
- [ ] Classificar embedding.
- [ ] Definir endpoint upstream de cada modelo.
- [ ] Definir streaming de cada modelo.
- [ ] Definir tools de cada modelo.
- [ ] Definir contexto de cada modelo.
- [ ] Definir suporte a jobs.
- [ ] Criar probe com timeout.
- [ ] Cachear disponibilidade.
- [ ] Não listar modelo não validado como ativo.
- [ ] Incluir modelos de mídia no `/models`.
- [ ] Permitir filtro por cliente.
- [ ] Testar cada modelo configurado.

## 4. Autenticação do painel e RBAC

- [ ] Criar login Supabase.
- [ ] Criar sessão segura.
- [ ] Criar logout.
- [ ] Criar recuperação de senha.
- [ ] Proteger `/dashboard/*`.
- [ ] Criar workspace/organização.
- [ ] Criar papel proprietário.
- [ ] Criar papel administrador.
- [ ] Criar papel operador.
- [ ] Criar papel leitura.
- [ ] Aplicar autorização por ação.
- [ ] Registrar alterações administrativas.
- [ ] Remover dependência do token público digitado na home.
- [ ] Testar sessão expirada.
- [ ] Testar usuário sem permissão.

## 5. Clientes e API keys

- [ ] Criar cliente.
- [ ] Gerar key aleatória.
- [ ] Mostrar key completa somente uma vez.
- [ ] Armazenar somente hash.
- [ ] Criar hint mascarado.
- [ ] Suspender cliente.
- [ ] Reativar cliente.
- [ ] Revogar key.
- [ ] Rotacionar key.
- [ ] Expirar key.
- [ ] Limitar modelos por cliente.
- [ ] Limitar endpoints por cliente.
- [ ] Definir RPM.
- [ ] Definir quota diária.
- [ ] Definir quota mensal.
- [ ] Definir limite de tokens.
- [ ] Mostrar último uso.
- [ ] Mostrar status.
- [ ] Criar auditoria de mudanças.
- [ ] Nunca retornar key completa em listagem.

## 6. Rate limit, quotas e uso

- [ ] Criar contador por cliente.
- [ ] Criar contador por endpoint.
- [ ] Criar contador por filho.
- [ ] Criar contador diário.
- [ ] Criar contador mensal.
- [ ] Criar contador de tokens.
- [ ] Aplicar bloqueio antes do upstream.
- [ ] Implementar reset diário.
- [ ] Implementar reset mensal.
- [ ] Implementar rate limit distribuído.
- [ ] Padronizar headers de limite.
- [ ] Limitar registro de remix.
- [ ] Limitar tamanho do payload.
- [ ] Limitar duração da requisição.
- [ ] Criar RPC atômica de uso.
- [ ] Testar concorrência.
- [ ] Testar quota excedida.
- [ ] Testar reset.
- [ ] Testar múltiplas instâncias.

## 7. Supabase independente e migrations

- [ ] Criar projeto Supabase central.
- [ ] Guardar URL no ambiente.
- [ ] Guardar anon key no ambiente apropriado.
- [ ] Guardar service role somente no servidor.
- [ ] Criar pasta de migrations.
- [ ] Criar tabela `gateway_clients`.
- [ ] Criar tabela `gateway_key_pool`.
- [ ] Criar tabela `gateway_request_logs`.
- [ ] Criar tabela `gateway_usage_daily`.
- [ ] Criar tabela `gateway_jobs`.
- [ ] Criar tabela `gateway_audit_logs`.
- [ ] Criar tabela `gateway_settings`.
- [ ] Habilitar pgcrypto.
- [ ] Criar secret Vault.
- [ ] Criar RPC de registro.
- [ ] Criar RPC de seleção.
- [ ] Criar RPC de status.
- [ ] Criar RPC de uso.
- [ ] Criar índices.
- [ ] Habilitar RLS.
- [ ] Confirmar ausência de key em texto puro.
- [ ] Atualizar tipos Supabase.
- [ ] Testar migration em banco vazio.
- [ ] Testar migration em banco existente.
- [ ] Testar backup/restauração.

## 8. Pool, failover e retry

- [ ] Selecionar key com `SKIP LOCKED`.
- [ ] Aplicar quota do filho na seleção.
- [ ] Aplicar cooldown na seleção.
- [ ] Incrementar contador atomicamente.
- [ ] Marcar 401/403 como disabled.
- [ ] Marcar 402/429 como exhausted.
- [ ] Reativar após cooldown.
- [ ] Tratar 5xx com retry limitado.
- [ ] Tratar timeout com retry limitado.
- [ ] Adicionar backoff.
- [ ] Adicionar jitter.
- [ ] Adicionar circuit breaker.
- [ ] Registrar cada tentativa.
- [ ] Evitar retry inseguro em stream iniciado.
- [ ] Implementar idempotência quando necessário.
- [ ] Testar pool vazio.
- [ ] Testar uma key.
- [ ] Testar várias keys.
- [ ] Testar todas esgotadas.
- [ ] Testar fallback do pai.

## 9. Handshake pai/filhos

- [ ] Definir origem configurável do pai.
- [ ] Remover fallback inseguro de secret.
- [ ] Criar timestamp.
- [ ] Criar nonce.
- [ ] Criar assinatura HMAC.
- [ ] Validar assinatura.
- [ ] Bloquear replay.
- [ ] Validar origem.
- [ ] Validar key no Lovable.
- [ ] Registrar por RPC.
- [ ] Responder sem ecoar key.
- [ ] Corrigir contrato announce/dispatch.
- [ ] Criar allowlist de domínios.
- [ ] Bloquear localhost e IPs privados.
- [ ] Bloquear redirect perigoso.
- [ ] Adicionar timeout.
- [ ] Adicionar rate limit.
- [ ] Registrar sucesso.
- [ ] Registrar falha.
- [ ] Exibir filho no painel.
- [ ] Testar primeiro request SSR.
- [ ] Testar abertura da interface.
- [ ] Testar disparo manual.
- [ ] Testar key inválida.
- [ ] Testar key esgotada.

## 10. Jobs e mídia

- [ ] Definir quais modelos de imagem existem.
- [ ] Definir quais modelos de vídeo existem.
- [ ] Definir quais modelos de áudio existem.
- [ ] Validar formato de cada upstream.
- [ ] Criar job de mídia.
- [ ] Criar `job_id`.
- [ ] Criar consulta de status.
- [ ] Criar expiração.
- [ ] Criar timeout.
- [ ] Registrar uso do job.
- [ ] Tratar falha do job.
- [ ] Limpar jobs antigos.
- [ ] Testar imagem.
- [ ] Testar vídeo.
- [ ] Testar embedding.
- [ ] Testar áudio quando disponível.

## 11. Painel comercial PT-BR

- [ ] Criar layout protegido.
- [ ] Criar URLs próprias por tela.
- [ ] Criar loading state.
- [ ] Criar empty state.
- [ ] Criar error state.
- [ ] Criar success feedback.
- [ ] Criar Visão geral.
- [ ] Criar Endpoints.
- [ ] Criar Modelos.
- [ ] Criar Rotas e fallback.
- [ ] Criar Clientes.
- [ ] Criar API keys.
- [ ] Criar Limites e quotas.
- [ ] Criar Workers.
- [ ] Criar Sincronização.
- [ ] Criar Uso.
- [ ] Criar Custos estimados.
- [ ] Criar Logs.
- [ ] Criar Token Saver.
- [ ] Criar Preferências.
- [ ] Criar Segurança.
- [ ] Adicionar busca.
- [ ] Adicionar filtros.
- [ ] Adicionar paginação.
- [ ] Adicionar atualização automática.
- [ ] Remover dados hard-coded.
- [ ] Testar desktop.
- [ ] Testar mobile.
- [ ] Revisar textos PT-BR.

## 12. Token Saver

- [ ] Definir filtros seguros.
- [ ] Detectar git diff.
- [ ] Detectar grep.
- [ ] Detectar find.
- [ ] Detectar ls/tree.
- [ ] Detectar logs repetidos.
- [ ] Preservar código.
- [ ] Preservar JSON válido.
- [ ] Preservar tool calls.
- [ ] Ignorar binários.
- [ ] Ignorar sensíveis.
- [ ] Ativar globalmente.
- [ ] Ativar por cliente.
- [ ] Ativar por endpoint.
- [ ] Permitir bypass por header.
- [ ] Medir antes/depois.
- [ ] Mostrar economia estimada.
- [ ] Testar não aumento do payload.

## 13. Proxy local e vários computadores

- [ ] Configurar host.
- [ ] Configurar porta.
- [ ] Escutar na rede local.
- [ ] Exigir API key fora do localhost.
- [ ] Restringir CORS.
- [ ] Criar instrução Cursor.
- [ ] Criar instrução Claude Code.
- [ ] Criar instrução Cline.
- [ ] Criar instrução Continue.
- [ ] Criar instrução Codex.
- [ ] Testar no PC principal.
- [ ] Testar em outro PC.
- [ ] Testar firewall.
- [ ] Criar túnel somente após segurança.
- [ ] Testar revogação de máquina.

## 14. Segurança

- [ ] Remover secrets do Git.
- [ ] Ignorar `.env`.
- [ ] Proteger CORS admin.
- [ ] Proteger health detalhado.
- [ ] Proteger diagnostics.
- [ ] Validar SSRF.
- [ ] Validar replay.
- [ ] Validar brute force.
- [ ] Validar payload.
- [ ] Não logar keys.
- [ ] Mascarar client keys.
- [ ] Criar rotação de secrets.
- [ ] Criar auditoria.
- [ ] Criar retenção de logs.
- [ ] Criar backup.
- [ ] Testar restauração.
- [ ] Fazer revisão de dependências.

## 15. Testes e CI

- [ ] Teste unitário de auth.
- [ ] Teste de API keys.
- [ ] Teste de quota.
- [ ] Teste de rate limit.
- [ ] Teste de seleção de key.
- [ ] Teste de cooldown.
- [ ] Teste de failover.
- [ ] Teste de HMAC.
- [ ] Teste de SSRF.
- [ ] Teste de catálogo.
- [ ] Teste de streaming.
- [ ] Teste de tool use.
- [ ] Teste de jobs.
- [ ] Teste de workers.
- [ ] Teste de painel.
- [ ] Teste E2E local.
- [ ] Pipeline CI para lint.
- [ ] Pipeline CI para build.
- [ ] Pipeline CI para testes.
- [ ] Bloquear merge com falha.

## 16. Operação e release

- [ ] Criar `.env.example` final.
- [ ] Documentar instalação.
- [ ] Documentar start.
- [ ] Documentar stop.
- [ ] Documentar update.
- [ ] Criar script Windows.
- [ ] Criar logs locais.
- [ ] Criar rotação de logs.
- [ ] Criar health real.
- [ ] Criar diagnóstico autenticado.
- [ ] Criar monitoramento.
- [ ] Criar backup automático.
- [ ] Testar deploy.
- [ ] Publicar versão.
- [ ] Fazer teste com remix real.
- [ ] Fazer teste em outro computador.
- [ ] Fazer teste de quota.
- [ ] Fazer teste de failover.
- [ ] Fazer smoke test de cada capacidade.
- [ ] Atualizar este checklist com evidências.

## Critério final de conclusão

- [ ] Build aprovado.
- [ ] Lint aprovado.
- [ ] Testes aprovados.
- [ ] Painel autenticado e navegável.
- [ ] API keys seguras.
- [ ] Quotas aplicadas de verdade.
- [ ] Telemetria completa.
- [ ] Pool cifrado.
- [ ] Failover comprovado.
- [ ] Handshake pai/filho comprovado.
- [ ] Proxy local comprovado.
- [ ] Modelos realmente testados.
- [ ] Backup e restauração comprovados.
- [ ] Documentação atualizada.

Uma caixa só deve virar `[x]` com evidência: commit, comando executado, teste, resposta HTTP, migration aplicada ou captura/registro equivalente.