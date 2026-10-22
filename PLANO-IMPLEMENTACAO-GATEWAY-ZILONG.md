# Plano de Implementação: Gateway Zilong Body F74

Este documento transforma a visão do NineRouter em um plano executável para um gateway de **um único provedor**, o Lovable AI Gateway. O objetivo não é copiar funcionalidades que dependem de múltiplos provedores, e sim adaptar o que faz sentido: proxy, clientes, API keys, modelos, fallback entre modelos e chaves Lovable, quotas, uso, segurança, token saver, remixes pai/filhos e operação local.

## 1. Escopo e decisões

### 1.1 O que será mantido

- Lovable AI Gateway como único upstream.
- Compatibilidade OpenAI Chat Completions.
- Compatibilidade Anthropic Messages para Claude Code.
- Compatibilidade OpenAI Responses quando o upstream suportar.
- Modelos Lovable de texto, visão, imagem, vídeo, áudio e embeddings, somente após validação real.
- Pool de `LOVABLE_API_KEY` dos remixes filhos.
- Round-robin, cooldown, quotas e failover entre chaves do mesmo provedor.
- Painel comercial em português do Brasil.
- Proxy para computadores da rede local.
- Supabase independente como banco central de produção.

### 1.2 O que não será feito

- Integração direta com OpenAI, Anthropic, Google, Groq ou outros provedores.
- OAuth de contas externas.
- Combos entre provedores.
- Billing real ou cobrança de cartão.
- Promessas de que modelos existem sem teste no Lovable.

### 1.3 Equivalência com o NineRouter

| NineRouter | Gateway Zilong Body F74 |
|---|---|
| Muitos provedores | Um provedor: Lovable |
| Contas por provedor | Keys de remixes/workspaces Lovable |
| Fallback entre provedores | Fallback entre modelos e keys Lovable |
| API proxy | `/api/public/v1/*` |
| Combos | Sequências de modelos Lovable |
| Quota por provedor | Quota por cliente, filho e key |
| Usage/cost | Tokens, requests e estimativa |
| Cloud sync | Pai/filhos e Supabase central |
| Token saver | Compressão segura antes do Lovable |

## 2. Fase 0: baseline e ambiente local

### Objetivo
Garantir que o repositório original compila, pode ser executado no Windows e tem uma linha de base confiável.

### Trabalho

1. Confirmar o checkout em `C:\Users\e_dio\Desktop\Gateway`.
2. Confirmar `origin` apontando para `ediooutros500-spec/snuggle-buddy-app-74`.
3. Fixar versões de Node, npm e package manager.
4. Criar `.env.example` sem secrets.
5. Criar scripts `dev`, `build`, `start`, `lint`, `format`, `check` e `test`.
6. Corrigir CRLF/Prettier sem mudar a lógica.
7. Regenerar `src/routeTree.gen.ts`.
8. Rodar lint, build e testes mínimos.
9. Registrar warnings de bundle e runtime sem tratar warning como sucesso funcional.

### Critério de aceite

- `npm run check` passa.
- O servidor local inicia.
- A home e o health check respondem.
- Todas as rotas implementadas aparecem no route tree.

## 3. Fase 1: contrato público da API

### Objetivo
Definir uma API estável antes de continuar o painel.

### Endpoints

- `POST /api/public/v1/chat/completions`
- `POST /api/public/v1/messages`
- `POST /api/public/v1/responses`
- `GET /api/public/v1/models`
- `POST /api/public/v1/images/generations`
- `POST /api/public/v1/embeddings`
- `POST /api/public/v1/videos/generations`
- `GET /api/public/v1/jobs/:id`
- `POST /api/public/v1/audio/transcriptions`
- `POST /api/public/v1/audio/speech`
- `GET /api/public/health`
- Rotas administrativas autenticadas.
- Rotas de workers pai/filhos autenticadas.

### Regras

- Padronizar autenticação por `Authorization: Bearer` e `x-api-key`.
- Devolver `X-Request-ID` em todas as respostas.
- Padronizar erros, status e headers de rate limit.
- Validar tamanho, roles, modelo, endpoint e formato.
- Não devolver secrets ou keys completas.
- Documentar exemplos curl, JavaScript e Python.

## 4. Fase 2: motor unificado

### Objetivo
Eliminar a lógica duplicada entre adaptadores.

Criar `src/lib/gateway-engine.server.ts` para centralizar:

1. Extração e autenticação do cliente.
2. Verificação de status, modelos e endpoints permitidos.
3. Quotas e rate limit.
4. Geração de request ID.
5. Resolução do modelo e destino Lovable.
6. Seleção de key do pool.
7. Timeout, retry, backoff e jitter.
8. Failover por key.
9. Registro de tentativas e telemetria.
10. Normalização de erros.
11. Tratamento correto de streaming.

`claude-compat`, `openai-compat`, `media-gateway` e `key-pool` ficam como adaptadores pequenos do motor, não como motores concorrentes.

## 5. Fase 3: catálogo e capacidades Lovable

### Objetivo
Expor apenas modelos e capacidades que realmente funcionam.

Para cada modelo:

1. Registrar nome canônico e aliases.
2. Classificar como texto, visão, áudio, imagem, vídeo ou embedding.
3. Definir endpoint upstream.
4. Definir streaming, tools, contexto e async job.
5. Executar smoke test controlado.
6. Cachear disponibilidade por período curto.
7. Exibir no painel somente o status real.

O catálogo não deve ficar duplicado em frontend, rotas e compatibilidade. Deve existir uma fonte única no backend.

## 6. Fase 4: autenticação e clientes

### Painel

- Login Supabase.
- Sessão segura.
- Logout e recuperação de senha.
- Proteção de todas as rotas admin.
- Organizações/workspaces.
- Papéis: proprietário, administrador, operador e leitura.

### Clientes

- Criar, editar, suspender, reativar e revogar.
- API key exibida uma única vez.
- Hash SHA-256 da key.
- Rotação e expiração opcional.
- Modelos e endpoints permitidos.
- RPM, quota diária, quota mensal e limite de tokens.
- Último uso e auditoria.

## 7. Fase 5: quotas, rate limit e telemetria

### Quotas

Aplicar antes do upstream:

- requests/minuto;
- requests/dia;
- requests/mês;
- tokens de entrada;
- tokens de saída;
- limite por modelo;
- limite por endpoint;
- limite por filho.

### Rate limit

- Identidade por cliente, não apenas IP.
- Buckets distribuídos para múltiplas instâncias.
- Headers `x-ratelimit-*` consistentes.
- Limite separado para registro de remixes.
- Limite de payload e timeout.

### Telemetria

Registrar request ID, cliente, endpoint, modelo, origem, key mascarada, tentativas, status, latência, tokens, erro, fallback e timestamps. Criar RPC atômica para log e incremento de uso.

## 8. Fase 6: pool de keys e Supabase independente

### Banco

Criar migrations versionadas para:

- `gateway_clients`;
- `gateway_key_pool`;
- `gateway_request_logs`;
- `gateway_usage_daily`;
- `gateway_jobs`;
- `gateway_audit_logs`;
- `gateway_settings`.

### Segurança

- `api_key_hash` para deduplicação.
- `api_key_enc` cifrada em repouso.
- Vault para a chave mestra.
- RLS ativado.
- Service role somente no backend.
- Nenhuma key em texto puro no painel ou no GET.

### RPCs

- `register_worker_key`;
- `get_next_api_key`;
- `mark_key_status`;
- `log_request_and_increment_usage`;
- `increment_client_stats` ou substituta equivalente;
- reset diário de quotas.

### Seleção

Usar `FOR UPDATE SKIP LOCKED`, ignorar key suspensa, cooldown e quota estourada, atualizar contadores atomicamente e usar a key do pai apenas como fallback explícito.

## 9. Fase 7: pai e filhos

### Registro automático

O filho, ao iniciar ou abrir a aplicação:

1. identifica a própria origem;
2. lê `LOVABLE_API_KEY` no servidor;
3. cria timestamp e nonce;
4. assina o payload;
5. envia ao pai;
6. o pai valida a assinatura e a origem;
7. valida a key no upstream;
8. cifra e salva;
9. responde sem ecoar a key.

### Dispatch manual

- Corrigir contrato de headers entre pai e filho.
- Permitir disparo pelo painel.
- Permitir retry controlado.
- Registrar operador, origem, resultado e request ID.
- Usar allowlist de domínios.
- Bloquear localhost, loopback, IPs privados, redirects perigosos e DNS rebinding.

### Estado do filho

Mostrar origem, workspace quando disponível, key hint, status, quota, uso, cooldown, último ping, último erro e data de registro.

## 10. Fase 8: fallback e jobs

### Retry

- 401/403: desabilitar key.
- 402/429: cooldown e próxima key.
- 5xx/timeout: retry limitado com backoff.
- Validação: sem retry.
- Stream iniciado: não trocar silenciosamente.
- Idempotência para requests que podem ser repetidos.

### Jobs

Para vídeo, áudio ou mídia assíncrona:

1. criar job;
2. guardar status;
3. devolver `job_id`;
4. fazer polling ou webhook;
5. aplicar timeout e expiração;
6. registrar uso e erro;
7. limpar jobs antigos.

## 11. Fase 9: painel comercial PT-BR

Criar páginas reais, com URLs próprias e estados de loading/erro/vazio/sucesso:

- Visão geral.
- Endpoints.
- Modelos.
- Rotas e fallback.
- Clientes e API keys.
- Limites e quotas.
- Workers.
- Sincronização de remixes.
- Uso e custos estimados.
- Logs.
- Token Saver.
- Preferências.
- Segurança.

Remover listas estáticas do frontend. Todas as telas devem consumir APIs reais, ter filtros, busca, paginação, ações autenticadas e feedback de resultado.

## 12. Fase 10: Token Saver

Implementar compressão segura para resultados grandes de `git diff`, `grep`, `find`, `ls`, `tree` e logs repetidos. Não alterar código, JSON inválido, tool calls, binários ou conteúdo sensível. Permitir ativação global, por cliente e por endpoint, além de header para desativar e métrica antes/depois.

## 13. Fase 11: proxy local e rede

- `HOST=0.0.0.0` configurável.
- Porta configurável, padrão documentado.
- API key obrigatória fora do localhost.
- CORS restrito.
- Firewall e instruções para outro PC.
- Exemplos para Cursor, Claude Code, Cline, Continue e Codex.
- Túnel seguro somente depois do proxy local estável.
- Nunca deixar endpoint público sem autenticação.

## 14. Fase 12: testes e operação

### Testes

Unitários para auth, keys, quotas, rate limit, fallback, HMAC, SSRF, catálogo e token saver. Integração para todos endpoints, streaming, tools, jobs, workers e painel. E2E no PC com servidor local.

### Operação

- backup do banco;
- retenção de logs;
- rotação de secrets;
- health check real;
- diagnóstico autenticado;
- monitoramento;
- scripts Windows;
- documentação de start/stop/update;
- CI para lint, build, tipos e testes.

## 15. Ordem de entrega

1. Baseline local, lint, build e route tree.
2. Contrato API e request ID.
3. Motor unificado.
4. Auth, clientes, quotas e telemetria.
5. Migrations e Supabase independente.
6. Pool e failover.
7. Handshake pai/filhos seguro.
8. Painel comercial real.
9. Token Saver e jobs de mídia.
10. Proxy local e uso em vários PCs.
11. Testes E2E, CI e produção.

## Critério de pronto

O gateway só é considerado pronto quando build, lint, testes, painel, auth, proxy, quotas, logs, failover, registro de filho, criptografia, smoke tests de modelos e backup estiverem comprovados. Um endpoint existir no código não significa que a funcionalidade esteja pronta.