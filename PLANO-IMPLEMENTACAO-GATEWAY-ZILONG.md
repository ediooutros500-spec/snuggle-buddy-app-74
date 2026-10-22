# Plano Mestre: Pai e Gator na VPS + Filhos Lovable

## Decisão atualizada em 22/10/2026

O pai também sai da hospedagem Lovable, conforme decisão do usuário. A arquitetura de destino é:

1. **Pai central na VPS**: painel, administração e rotas de compatibilidade do app, executados como servidor Node.js. O pai usa `GATEWAY_ROLE=central` e nunca se anuncia como filho.
2. **Gator na mesma VPS**: recebe handshakes e evolui para o motor unificado de proxy, pool, quotas e telemetria.
3. **Filhos no Lovable**: os remixes leem a própria `LOVABLE_API_KEY` no servidor e enviam HMAC ao Gator. Não recebem credenciais administrativas do Supabase central.
4. **Dois subdomínios futuros**: painel/pai e API. Os nomes definitivos ainda não foram definidos. O IP da VPS serve para instalação e health checks; o envio de credenciais e o uso autenticado público exigem HTTPS.

O código/template dos filhos pode continuar sendo importado/remixado no Lovable; isso não exige manter o pai central hospedado lá. A separação final do template e a retirada do deploy antigo devem ser comprovadas depois que o pai na VPS passar pelos testes.

Esta decisão substitui as referências anteriores deste plano a “pai hospedado no Lovable”. Durante a transição, as rotas existentes do pai são uma ponte de compatibilidade; o motor central ainda deve ser concluído no Gator.

O upstream continua sendo **um único provedor: Lovable AI Gateway**. As várias chaves pertencem a remixes/workspaces Lovable diferentes. Isso não transforma o sistema em multi-provedor; é um pool de credenciais do mesmo provedor.

## 0. Regras de arquitetura

### Manter no template dos filhos Lovable

- Interface/template do filho que pode ser remixado; o painel administrativo central fica na VPS.
- Endpoint local de anúncio do filho.
- Leitura de `LOVABLE_API_KEY` somente no servidor.
- Registro no Gator por HTTPS.
- Nenhuma chave enviada pelo navegador.
- Nenhum service role do Supabase dentro do remix.
- Configuração do endereço do Gator por variável/secret e fallback somente para desenvolvimento.

### Manter no Gator

- API pública compatível com OpenAI e Anthropic.
- Pool de chaves Lovable.
- Seleção round-robin.
- Cooldown e failover.
- Clientes, API keys, quotas e logs.
- Painel administrativo.
- Proxy para a rede local e VPS.
- Supabase central.
- Jobs de mídia e telemetria.

### Não fazer

- Não colocar `LOVABLE_API_KEY` no bundle React.
- Não deixar service role no projeto remixável.
- Não aceitar registro sem assinatura em produção.
- Não confiar apenas em header fixo como segredo.
- Não permitir que o Gator faça fetch para qualquer URL informada pelo usuário.
- Não chamar o sistema de multi-provedor.
- Não marcar funcionalidade apenas porque o arquivo existe.

## 1. Estrutura final de arquivos

O root contém o pai central com build Node para a VPS e compatibilidade com o template dos filhos. O Gator permanece separado em `gator/`. Os papéis de execução são distintos; apenas filhos se registram automaticamente.

```text
/
├─ src/                              # Projeto Lovable pai/remixável
│  ├─ routes/
│  │  └─ api/public/v1/workers/
│  │     ├─ announce.ts              # Endpoint local chamado pelo frontend do filho
│  │     └─ register.ts              # Compatibilidade quando o pai também recebe registro
│  ├─ lib/
│  │  ├─ child-handshake.server.ts   # Assinatura e envio para o Gator
│  │  ├─ child-config.server.ts      # Origem do Gator e configuração do remix
│  │  └─ lovable-error-reporting.ts
│  ├─ server.ts                      # Disparo SSR sem bloquear a resposta
│  └─ routes/__root.tsx              # Disparo client-side leve
├─ gator/                            # Gateway central local/VPS
│  ├─ src/
│  │  ├─ server.ts                   # Inicialização HTTP
│  │  ├─ config.ts                   # Variáveis e validação de ambiente
│  │  ├─ engine/
│  │  │  ├─ gateway-engine.ts        # Pipeline único de requisições
│  │  │  ├─ upstream-lovable.ts      # Adaptador único do Lovable
│  │  │  ├─ model-catalog.ts         # Catálogo único
│  │  │  ├─ key-selector.ts          # Seleção de key do pool
│  │  │  ├─ retry-policy.ts          # Retry/backoff/circuit breaker
│  │  │  └─ request-context.ts       # Request ID e contexto
│  │  ├─ auth/
│  │  │  ├─ client-auth.ts           # API keys dos clientes
│  │  │  ├─ admin-auth.ts             # Sessão/RBAC do painel
│  │  │  └─ handshake-auth.ts         # HMAC, nonce e replay
│  │  ├─ workers/
│  │  │  ├─ register-worker.ts       # Recepção e validação de filho
│  │  │  ├─ dispatch-worker.ts        # Ping manual do Gator ao filho
│  │  │  └─ worker-policy.ts          # Allowlist, quotas e estado
│  │  ├─ usage/
│  │  │  ├─ quota-service.ts
│  │  │  ├─ telemetry-service.ts
│  │  │  └─ cost-estimator.ts
│  │  ├─ media/
│  │  │  ├─ job-service.ts
│  │  │  └─ job-cleaner.ts
│  │  ├─ token-saver/
│  │  │  ├─ detect.ts
│  │  │  └─ compress.ts
│  │  └─ db/
│  │     ├─ supabase-admin.ts
│  │     └─ repositories/
│  ├─ migrations/                    # Schema do Supabase central
│  ├─ tests/
│  ├─ Dockerfile
│  ├─ docker-compose.yml
│  ├─ package.json
│  └─ .env.example
├─ dashboard/                        # UI do Gator, se separada do app Lovable
├─ docs/
│  ├─ REMIX-SETUP.md
│  ├─ GATOR-LOCAL.md
│  ├─ GATOR-VPS.md
│  ├─ API.md
│  └─ SECURITY.md
└─ CHECKLIST-IMPLEMENTACAO-GATEWAY-ZILONG.md
```

A divisão pode começar incrementalmente. Não mover o root do Lovable para monorepo antes de existir build verde; primeiro criar `gator/` isolado.

## 2. Fase 0: baseline do repositório e Gator local

### Objetivo

Ter uma cópia confiável do projeto e uma área reservada para o gateway central.

### Implementação

1. Confirmar o checkout em `C:\Users\e_dio\Desktop\Gateway`.
2. Confirmar remote do repositório original.
3. Corrigir CRLF/Prettier sem alterar lógica.
4. Regenerar `src/routeTree.gen.ts`.
5. Garantir `npm run build` do Lovable.
6. Criar `gator/package.json` independente.
7. Criar `gator/.env.example` sem segredos.
8. Criar comandos de desenvolvimento local.
9. Criar health check separado do Gator.
10. Documentar Node, npm, Docker e portas.

### Aceite

- App Lovable compila.
- Gator inicia mesmo sem keys, mostrando configuração incompleta.
- Nenhum segredo está versionado.

## 3. Fase 1: Supabase central do Gator

### Objetivo

O Supabase central será o banco do Gator. O projeto remixável nunca recebe service role.

### Ambiente

Definir no Gator:

```text
GATOR_SUPABASE_URL
GATOR_SUPABASE_ANON_KEY       # somente quando necessário no painel
GATOR_SUPABASE_SERVICE_ROLE_KEY
GATOR_ENCRYPTION_KEY ou Vault
GATOR_PUBLIC_URL
GATOR_ADMIN_URL
```

Se o Supabase for executado no próprio PC, usar Docker/Supabase CLI e persistência em volume. Se for Supabase hospedado, o Gator local/VPS acessa pela URL HTTPS. O plano suporta as duas formas, mas a escolha deve ser registrada antes da migration.

### Tabelas

- `gateway_clients`: clientes, status, quotas e permissões.
- `gateway_client_keys`: hash, hint, status, expiração e último uso.
- `gateway_key_pool`: hash da key Lovable, cifra, hint, origem, workspace informado, status e contadores.
- `gateway_request_logs`: request ID, cliente, modelo, tentativa, status, latência e tokens.
- `gateway_usage_daily`: agregados por cliente, worker, modelo e data.
- `gateway_jobs`: vídeo/áudio/imagem assíncronos.
- `gateway_workers`: origem, nonce, último handshake, status e política.
- `gateway_audit_logs`: ações administrativas.
- `gateway_settings`: configurações do Gator.

### RPCs

- `register_worker_key`: hash, cifra e upsert atômico.
- `get_next_api_key`: round-robin com `FOR UPDATE SKIP LOCKED`, quota e cooldown.
- `mark_key_status`: exhausted/disabled/active.
- `log_request_and_increment_usage`: log e contador na mesma operação.
- `consume_client_quota`: reserva de uso antes do upstream.
- `release_failed_quota`: libera ou ajusta reserva quando a chamada não consumiu créditos.

### Aceite

- Migration aplicada em banco vazio.
- RLS ativo.
- Service role usada somente pelo Gator.
- Nenhuma key aberta em tabela, API administrativa ou log.
- Backup e restauração testados.

## 4. Fase 2: contrato de handshake remixável

### Fluxo correto

1. O usuário faz Remix do projeto Lovable Pai.
2. O filho é publicado no workspace desejado.
3. O servidor do filho atende a primeira requisição.
4. O filho lê `process.env.LOVABLE_API_KEY` no servidor.
5. O filho cria `timestamp`, `nonce`, `project_origin` e `workspace_hint` opcional.
6. O filho assina tudo com o segredo de handshake configurado no filho.
7. O filho envia HTTPS para o Gator.
8. O Gator valida assinatura, timestamp, nonce e origem.
9. O Gator testa a key no Lovable upstream.
10. O Gator cifra e salva no Supabase.
11. O Gator devolve somente `registered`, `worker_id` e status.

A chave nunca deve passar pelo browser, aparecer no JSON de resposta ou ser gravada em log.

### Gatilhos no filho

- SSR em `src/server.ts`, em background.
- `useEffect` em `src/routes/__root.tsx`, chamando apenas endpoint local.
- `POST /api/public/v1/workers/announce` no filho.

O frontend não chama o Gator diretamente. Ele chama o endpoint local; o servidor do filho faz o envio.

### Segurança

- HMAC-SHA256.
- Timestamp com janela curta.
- Nonce de uso único.
- Rate limit por origem.
- Allowlist de domínios.
- Rejeição sem secret configurado.
- Validação upstream da key antes de salvar.
- Resposta sem ecoar a key.

### Aceite

- Criar um remix e publicar.
- Abrir a URL uma vez.
- Ver o worker aparecer no Gator.
- Confirmar hint e origem.
- Confirmar que a key não aparece no browser, logs ou resposta.
- Repetir o handshake e comprovar idempotência.

## 5. Fase 3: motor do Gator

O `gateway-engine` executará toda requisição:

1. validar API key do cliente;
2. identificar cliente e worker policy;
3. reservar quota;
4. validar endpoint/modelo;
5. gerar `X-Request-ID`;
6. selecionar key Lovable;
7. traduzir o formato para o endpoint Lovable;
8. aplicar timeout;
9. chamar o upstream;
10. marcar status da key;
11. fazer failover quando seguro;
12. registrar tentativa e consumo;
13. devolver resposta normalizada.

Todas as rotas de texto e mídia devem passar por esse motor. A rota não pode implementar sua própria autenticação, quota e logging.

## 6. Fase 4: catálogo e capacidades

Criar uma fonte única no Gator para modelos Lovable. Cada entrada informa:

- ID canônico;
- aliases;
- endpoint upstream;
- texto/visão/áudio/imagem/vídeo/embedding;
- streaming;
- tools;
- contexto;
- job assíncrono;
- último teste;
- status real;
- custo estimado, se conhecido.

O painel e `/v1/models` leem essa mesma fonte. Modelo só fica ativo depois de smoke test com timeout.

## 7. Fase 5: API, proxy e clientes

### API

Implementar e documentar:

- `/v1/chat/completions`;
- `/v1/messages`;
- `/v1/responses`;
- `/v1/models`;
- `/v1/images/generations`;
- `/v1/embeddings`;
- `/v1/videos/generations`;
- `/v1/jobs/:id`;
- áudio quando validado.

### Clientes

- Login no painel do Gator.
- RBAC.
- Criação e rotação de API keys.
- Hash e exibição única.
- Modelos/endpoints permitidos.
- RPM, quota diária, mensal e tokens.
- Auditoria.

### Proxy

- `GATOR_HOST=0.0.0.0` configurável.
- Porta documentada.
- API key obrigatória fora do localhost.
- CORS restrito.
- Firewall.
- Exemplos de configuração para Cursor, Claude Code, Cline, Continue e Codex.

## 8. Fase 6: pool, quotas e failover

- Selecionar key com `SKIP LOCKED`.
- Ignorar key disabled, cooldown e quota excedida.
- Contar por worker e workspace informado.
- `401/403`: disabled.
- `402/429`: cooldown.
- `5xx/timeout`: retry limitado com backoff/jitter.
- Não trocar key depois que stream começou.
- Registrar todas as tentativas.
- Usar key própria do Gator somente como fallback explícito, se habilitado.

O sistema deve mostrar claramente que remixes no mesmo workspace podem compartilhar créditos; workspaces diferentes são necessários para separar cotas.

## 9. Fase 7: painel comercial do Gator

Criar rotas reais, não apenas estado local:

- `/dashboard`;
- `/dashboard/endpoints`;
- `/dashboard/models`;
- `/dashboard/routes`;
- `/dashboard/clients`;
- `/dashboard/workers`;
- `/dashboard/usage`;
- `/dashboard/logs`;
- `/dashboard/token-saver`;
- `/dashboard/settings`;
- `/dashboard/security`.

Cada tela precisa ter loading, erro, vazio, sucesso, busca, filtros, paginação e ações reais. O painel deve exibir uso por worker, key hint, quota, cooldown, erro, modelo e cliente.

## 10. Fase 8: Token Saver e jobs

Token Saver:

- detectar `git diff`, `grep`, `find`, `ls`, `tree` e logs repetidos;
- preservar código, JSON e tool calls;
- ignorar binários e conteúdo sensível;
- ativar por Gator, cliente ou endpoint;
- permitir bypass por header;
- medir antes/depois.

Jobs:

- criar job;
- devolver `job_id`;
- consultar status;
- expirar;
- limpar;
- registrar uso e custo estimado.

## 11. Fase 9: operação local, VPS e Docker

### Local

- `C:\Users\e_dio\Desktop\Gateway` como workspace.
- `gator/` como serviço central.
- Supabase local por Docker ou Supabase hospedado acessado pelo PC.
- Scripts PowerShell para instalar, iniciar, parar, atualizar e testar.

### VPS

- Docker Compose.
- Gator.
- Reverse proxy HTTPS.
- Redis opcional para rate limit/cache.
- Supabase hospedado ou PostgreSQL gerenciado.
- Backup, logs e monitoramento.

### Segurança

- Não expor Supabase service role.
- Não deixar proxy sem API key.
- TLS obrigatório fora da rede local.
- Health público mínimo; diagnóstico protegido.
- Limitar origem do handshake.

## 12. Fase 10: testes e release

Unitários: auth, HMAC, nonce, SSRF, keys, quota, seleção, cooldown, retry, catálogo e token saver.

Integração: registro do remix, idempotência, `/v1/models`, chat, messages, mídia, jobs, quotas e logs.

E2E: publicar remix, abrir filho, confirmar registro no Supabase, fazer chamada pelo Gator, forçar 429/402 simulado, confirmar failover e testar outro computador.

## Ordem de implementação

1. Baseline e build do projeto Lovable.
2. Estrutura `gator/` e health local.
3. Supabase central e migrations.
4. Handshake seguro do remix.
5. Motor unificado do Gator.
6. Pool, quota e failover.
7. API e proxy.
8. Painel comercial.
9. Token Saver e jobs.
10. Docker/VPS.
11. Testes E2E e release.

## Critério de pronto

Só considerar pronto quando um remix publicado enviar a key ao Gator sem intervenção manual, a key aparecer cifrada no Supabase, o Gator atender uma chamada real usando a key do worker, o painel mostrar o uso, o failover funcionar e outro computador conseguir usar o proxy com API key.
