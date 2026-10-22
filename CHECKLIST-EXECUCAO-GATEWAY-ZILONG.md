# Registro de Execução: Gateway Zilong Body F74

Este arquivo registra o avanço real da implementação. A checklist detalhada continua em `CHECKLIST-IMPLEMENTACAO-GATEWAY-ZILONG.md`.

## Decisão vigente: registro automático e projetos independentes

Hospedagem escolhida em 22/10/2026: mesma VPS do StarChef, por SSH direto com chave existente no computador. Usuário esclareceu: Hostinger somente para o site, sem dependência do conector para acessar esta VPS. Conexão SSH e inspeção somente de leitura comprovadas; StarChef saudável, portas 4430/4431 livres, 20128 ocupada, cerca de 2 GiB de memória disponível e 15 GiB de disco livre. Perfil independente em `deploy/compose.shared-vps.yml`; plano operacional em `deploy/STARCHEF-VPS.md`. Gateway ainda não instalado; nenhum serviço remoto alterado.

Em 22/10/2026 o usuário definiu que qualquer projeto Lovable seu com gatilho pode fornecer a própria chave, incluindo o projeto original. Não há quantidade fixa de contas/remixes nem dependência de um pai Lovable. Painel e Gator ficam na VPS. O modo padrão passa a ser auto: validação no upstream, sem segredo compartilhado. Referências históricas abaixo a HMAC obrigatório descrevem a implementação anterior, preservada como modo signed opcional. Guia: docs/REMIX-HOOK.md.

- [x] Emissor desacoplado do banco central, com três módulos copiáveis.
- [x] Validação upstream obrigatória antes da persistência no modo auto.
- [x] Limites por origem e por processo/conexão; respostas sem credenciais.
- [x] Endereço público herdável configurável uma vez no template.
- [x] Snapshot isolado desta etapa: 21 testes do app e 25 do Gator aprovados; TypeScript e dois builds aprovados; lint com zero erros e sete avisos existentes.
- [x] Smoke do pai Node: home/health HTTP 200, papel central e administração sem token HTTP 401.
- [ ] Endereço HTTPS real preenchido: ainda não informado.
- [ ] Remix real registrado e chave usada contra o upstream.
- [ ] Motor unificado, quotas concorrentes e implantação real concluídos.

## Fase 0: baseline

- [x] Repositório original confirmado: `ediooutros500-spec/snuggle-buddy-app-74`.
- [x] Checkout local confirmado em `C:\Users\e_dio\Desktop\Gateway`.
- [x] Remote `origin` confirmado apontando para o repositório original.
- [x] Node confirmado no PC: `v22.23.2`.
- [x] npm confirmado no PC: `10.9.8`.
- [x] `npm install` executado: 418 pacotes adicionados, 0 vulnerabilidades reportadas.
- [x] `npm run build` executado com sucesso no PC local.
- [x] Script `start` adicionado ao `package.json`.
- [x] Script `check` adicionado ao `package.json`.
- [x] `.env.example` criado sem valores reais.
- [x] `.gitattributes` criado para normalizar finais de linha.
- [x] `npm run lint` aprovado em 22/10/2026: zero erros, sete avisos (Fast Refresh e dependência de hook).
- [x] `npm test`: 18 testes do handshake e da rota de registro aprovados.
- [x] Route tree regenerado e incluído na etapa de handshake; build verificado em cópia isolada do índice Git.

## Fase 1: estrutura inicial do Gator

- [x] Pasta `gator/` criada separada do projeto Lovable.
- [x] `gator/package.json` criado.
- [x] `gator/.env.example` criado sem secrets.
- [x] `gator/src/config.mjs` criado com configuração segura e flags de ambiente.
- [x] `gator/src/server.mjs` criado com health check e resposta 404 segura.
- [x] `gator/README.md` criado com instruções locais.
- [x] `gator/npm run check` validado por `node --check`.
- [x] Health check executado no PC: HTTP 200 no registro anterior e teste HTTP local aprovado nesta etapa.
- [x] Supabase central acessível em 22/10/2026 com as credenciais de `.env.local` e `gator/.env`: dez tabelas consultadas sem retornar registros; sete RPCs expostas no catálogo REST.
- [ ] Gateway engine implementado: próxima etapa.

## Evidência local

- Build do app Lovable: aprovado no DataFlow em 22/10/2026.
- Lint: aprovado em 22/10/2026 após normalizar finais de linha e substituir seis tipos `any` explícitos.
- Build local: aprovado em 22/10/2026 após corrigir importação inexistente de `REMIX_SYNC_SECRET`; agora usa `getChildConfig().remixSyncSecret`.
- Verificação sintática do Gator: `npm --prefix gator run check` aprovado.
- Alterações locais anteriores de funcionalidades foram preservadas; ainda não revisadas/publicadas como conjunto.
- Instalação: concluída sem vulnerabilidades reportadas.
- Supabase: credenciais presentes e conexão REST validada em 22/10/2026. Tabelas e RPCs principais existem; RLS, execução das RPCs, backup e restauração ainda precisam de validação.
- Gator: scripts `start` e `dev` ajustados para carregar o `.env` local com Node.
- Gator: scaffold criado e commitado; ainda não é um proxy de produção.

## Próxima fase autorizada

1. Corrigir e publicar a normalização de formato sem tocar na lógica do app.
2. Validar o schema já existente do Supabase, RLS, Vault e RPCs antes de aplicar novas migrations.
3. Validar o handshake de um remix publicado contra o Gator.
4. Implementar o motor unificado e o primeiro endpoint autenticado do Gator.

Uma caixa só deve virar `[x]` quando existir evidência verificável.

## Registro seguro no Gator — 22/10/2026

- [x] Endpoint de registro implementado no serviço Gator separado.
- [x] HMAC obrigatório, timestamp, allowlist HTTPS e nonce persistido antes do upstream.
- [x] Falhas de banco/upstream não ativam keys; respostas não expõem credenciais.
- [x] Testes HTTP e de segurança com serviços simulados: 19 testes aprovados.
- [ ] Registro real de remix publicado, Vault, RLS e idempotência no banco comprovados.
- [ ] Motor de proxy autenticado do Gator implementado.

Os testes do Gator são separados do root; a ausência de suíte no app Lovable continua pendente.

## Validação do banco real — 22/10/2026

- [x] 27 verificações REST aprovadas com `npm --prefix gator run db:selftest`.
- [x] Vault configurado e acesso anônimo ao segredo recusado.
- [x] RPC de registro executada com chave sintética desabilitada: hash, cifra armazenada e upsert idempotente verificados.
- [x] Nonce duplicado recusado pelo banco; dados de teste removidos.
- [ ] Auditoria SQL de RLS e grants: conector sem acesso SQL ao projeto central. Consulta somente de leitura preparada em `gator/db/verify-security.sql`.
- [ ] Quotas concorrentes, chamada upstream real e backup/restauração comprovados.

Detalhes e comandos em `gator/DB-VERIFICACAO.md`.

## Emissor e baseline verificados — 22/10/2026

- [x] Emissor do remix compatível com o HMAC do Gator, sem enviar o segredo compartilhado.
- [x] Cache de registro somente após confirmação do Gator; solicitações simultâneas compartilham a tentativa.
- [x] Receptor de compatibilidade exige HMAC e persistência de nonce; não aceita apenas token fixo.
- [x] Falha de rede/5xx não ativa chave no registro do app.
- [x] Snapshot isolado do commit: TypeScript aprovado, lint com zero erros e sete avisos, build aprovado; 18 testes do app e 19 testes do Gator aprovados.
- [ ] Remix publicado contra endereço HTTPS real do Gator: ainda pendente.

Alterações funcionais anteriores de motor, painel e mídia continuam separadas da publicação desta etapa.

## Pai fora do Lovable e preparação da VPS — 22/10/2026

- [x] Decisão do usuário registrada: pai e Gator na VPS; filhos no Lovable.
- [x] Build `node-server` do pai aprovado; home e health HTTP 200, administração sem token HTTP 401.
- [x] `GATEWAY_ROLE=central` bloqueia auto-registro do pai, inclusive em disparo forçado.
- [x] Dockerfiles do pai e Gator construídos em Linux com dependências instaladas do zero.
- [x] Lockfile npm multiplataforma e dependência de desenvolvimento AJV 8 fixados para instalação reproduzível.
- [x] Containers Linux com raiz somente leitura: health do pai e Gator HTTP 200, administração sem token HTTP 401.
- [x] Perfil por IP publica apenas health; acesso autenticado HTTP permanece bloqueado (503).
- [x] Docker Compose e proxy HTTPS para dois subdomínios validados localmente.
- [x] 19 testes do app e 19 do Gator aprovados; workflow de CI criado.
- [ ] Resultado do workflow no GitHub confirmado.
- [ ] Instalação na VPS, DNS e certificados públicos executados.
- [ ] Desativação do deploy antigo do pai após validação de migração.

`deploy/README.md` descreve a operação. O proxy usa rotas existentes do pai como ponte; o motor unificado no Gator e as quotas concorrentes ainda não estão concluídos.

- Evidência adicional desta etapa: ambiente Linux limpo aprovado em `npm ci`, lint (zero erros/sete avisos), TypeScript, 19 testes do app, 19 testes do Gator e build Node. Teste de inicialização do pai aprovado fora do Lovable.
