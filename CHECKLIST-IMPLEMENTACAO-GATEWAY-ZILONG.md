# Checklist de Implementação: Projeto Lovable Remixável + Gator

Marque `[x]` somente com evidência: commit, comando, migration, resposta HTTP, teste ou log seguro. Nunca marque porque o arquivo foi criado.

## A. Decisões e segurança do desenho

- [x] Confirmar que o root é o projeto Lovable Pai Remixável.
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
- [ ] `gator/tests/` criado.
- [x] Health do Gator responde sem banco.
- [x] Gator inicia sem keys e informa configuração ausente.
- [x] App Lovable e Gator têm comandos/documentação separados.

## D. Supabase central do Gator

- [ ] Projeto Supabase central criado ou Supabase local definido.
- [ ] `GATOR_SUPABASE_URL` configurado no Gator.
- [ ] `GATOR_SUPABASE_ANON_KEY` protegido conforme o uso.
- [ ] `GATOR_SUPABASE_SERVICE_ROLE_KEY` somente no servidor.
- [ ] Vault/segredo de cifra definido.
- [ ] Migration `gateway_clients` aplicada.
- [ ] Migration `gateway_client_keys` aplicada.
- [ ] Migration `gateway_key_pol` aplicada.
- [ ] Migration `gateway_request_logs` aplicada.
- [ ] Migration `gateway_usage_daily` aplicada.
- [ ] Migration `gateway_jobs` aplicada.
- [ ] Migration `gateway_workers` aplicada.
- [ ] Migration `gateway_audit_logs` aplicada.