# Pai central e Gator na VPS

O pai é o painel/administração e as rotas de compatibilidade existentes. Ele roda em Node.js na VPS. O Gator é outro processo na mesma VPS. Qualquer projeto do operador no Lovable pode enviar a própria chave com o [gatilho instalado](../docs/REMIX-HOOK.md). O registro padrão é automático, sem segredo compartilhado. O pai usa `GATEWAY_ROLE=central`, portanto não envia sua key nem se registra como filho.

## Executar o pai fora do Lovable

```powershell
npm ci
npm run build:parent
copy .env.parent.example .env.parent
# Preencha .env.parent somente no servidor.
npm run start:parent
```

O build do pai usa o preset `node-server` do Nitro. O build padrão permanece compatível com os ambientes Lovable dos filhos. As credenciais administrativas só entram no processo em execução; os únicos argumentos públicos do build Docker são `VITE_SUPABASE_URL` e a chave publicável, quando necessários pela interface.

Na VPS, configure `.env.parent` e `gator/.env` com o mesmo Supabase central e `GATOR_REGISTRATION_MODE=auto`. O segredo compartilhado é necessário somente no modo signed opcional. O pai precisa das credenciais centrais durante a ponte de compatibilidade; nenhum filho precisa delas. Proteja os arquivos reais com permissões de leitura restritas ao operador.

## Containers e primeiro teste pelo IP

Na raiz do repositório, prepare os arquivos de ambiente:

```sh
cp .env.parent.example .env.parent
cp gator/.env.example gator/.env
cp deploy/.env.deploy.example deploy/.env.deploy
# Preencha as configurações e segredos no servidor antes de continuar.
docker compose --env-file deploy/.env.deploy -f deploy/compose.yml --profile ip-check up -d --build
```

O perfil `ip-check` publica apenas `http://IP/health` (Gator) e `http://IP/parent-health` (pai). O restante retorna 503. Isso permite testar a instalação pelo IP sem habilitar credenciais em HTTP público. As portas diretas do pai e do Gator ficam ligadas ao loopback da VPS.

## Dois subdomínios

Quando houver DNS, defina `PANEL_HOST` e `API_HOST` em `deploy/.env.deploy`. Aponte os dois registros DNS para a VPS e permita as portas 80/443 no firewall.

```sh
docker compose --env-file deploy/.env.deploy -f deploy/compose.yml --profile ip-check stop ip-check
docker compose --env-file deploy/.env.deploy -f deploy/compose.yml --profile https up -d --build
```

O Caddy solicita os certificados. Configure `PARENT_PUBLIC_URL=https://SEU_PAINEL` no pai e `GATOR_PUBLIC_URL=https://SUA_API` na central. Defina também esse endereço público uma vez em `src/lib/central-address.ts` no projeto de origem, para os remixes herdarem o destino sem configurar segredo. Os valores `panel.invalid` e `api.invalid` são marcadores: não geram uma instalação pública funcional.

| Endereço                                             | Destino atual                                            |
| ---------------------------------------------------- | -------------------------------------------------------- |
| Subdomínio do painel                                 | Pai Node.js                                              |
| Subdomínio da API, `/health`                         | Health do Gator                                          |
| Subdomínio da API, `/api/public/v1/workers/register` | Registro automático do Gator                             |
| Subdomínio da API, `/v1/*`                           | Ponte para as rotas `/api/public/v1/*` existentes no pai |

Essa ponte não conclui o motor unificado: autenticação, quotas concorrentes, catálogo validado, telemetria e failover ainda precisam ser centralizados no Gator. O painel atual também não equivale ao painel comercial completo do plano.

## Critérios antes de retirar o deploy antigo

- Pai e Gator saudáveis na VPS.
- DNS/HTTPS testados e administração autenticada validada.
- Um filho real registrado e uma chamada upstream comprovada.
- Backup e restauração do banco testados.
- Quotas, permissões e endpoints de compatibilidade auditados.

Os arquivos de Docker e proxy preparam a implantação. Sua existência não comprova que a VPS já foi instalada ou que o plano inteiro está pronto.
