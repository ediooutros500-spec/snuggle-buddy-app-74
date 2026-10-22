# Zilong Gator

Central independente na VPS para reunir as chaves dos projetos Lovable do operador. Qualquer projeto com o [gatilho instalado](../docs/REMIX-HOOK.md) pode contribuir com a própria chave. Painel e Gator ficam na VPS; não há pai Lovable obrigatório nem número fixo de remixes.

## Primeiro passo

```powershell
cd gator
copy .env.example .env
npm run check
npm start
```

Health check local:

```text
GET http://127.0.0.1:20128/health
```

## Registro automático (padrão)

`GATOR_REGISTRATION_MODE=auto` dispensa segredo e assinatura por remix. O servidor envia JSON com `api_key` e `project_origin` por HTTPS para `POST /api/public/v1/workers/register`. O Gator valida a chave no endereço fixo do Lovable antes de salvá-la cifrada por RPC. A validação faz uma chamada de um token e pode consumir crédito. 401/403 recusa, 402/429 cadastra como exhausted, rede/5xx não salva. 429 não comprova saldo disponível.

Somente origens HTTPS canônicas dos subdomínios Lovable são aceitas. Há limite de três tentativas/minuto por origem e dez por IP de conexão, por processo. A origem é um rótulo informado: validar a chave não comprova propriedade do domínio nem concede acesso administrativo. O receptor não faz fetch para a origem.

A resposta contém apenas `registered`, `worker_id` e `status`. O painel protegido mostra indicação parcial da chave; a credencial completa permanece no servidor. Um projeto publicado precisa receber uma requisição para executar o gatilho. A chave precisa existir no runtime; o código não cria chaves ausentes.

## Registro assinado opcional

As instruções desta seção aplicam-se somente a instalações que escolham explicitamente `GATOR_REGISTRATION_MODE=signed` tanto no Gator como no emissor. O padrão auto acima não exige segredo nem nonce.

O Gator atende `POST /api/public/v1/workers/register`. Configure `GATOR_SUPABASE_URL`, `GATOR_SUPABASE_SERVICE_ROLE_KEY` e `REMIX_SYNC_SECRET` em `gator/.env`. Os comandos start/dev carregam esse arquivo. O segredo deve coincidir com o configurado no servidor do remix. Nenhuma credencial vai no browser.

O contrato segue o emissor do app: JSON com `api_key` e `project_origin`; headers `x-handshake-timestamp` (milissegundos), `x-handshake-nonce` e `x-handshake-signature`. A assinatura HMAC-SHA256 hexadecimal cobre `origin|timestamp|nonce|api_key`.

Somente origens HTTPS dos subdomínios Lovable são aceitas. A janela de assinatura é cinco minutos. O nonce é reservado no banco antes de validar a key no upstream; uma tentativa deve sempre usar um novo nonce. Falha de persistência bloqueia o registro. Não há autenticação apenas por token fixo neste endpoint.

A key é validada no Lovable com timeout e sem seguir redirects. HTTP 401/403 recusa a key; 402/429 registra como exhausted; erro de rede/5xx não ativa a key. A gravação usa a RPC existente `register_worker_key`, que depende do Vault `pool_keys_key`. Nenhuma migration é aplicada automaticamente. A resposta traz somente registered, worker_id e status.

Há limite de 16 KiB por payload e dez tentativas por minuto por IP de conexão. Atrás de reverse proxy, o limite usa o IP do proxy; configure proteção adicional no proxy antes de expor publicamente. Nonces persistidos precisam de retenção/limpeza operacional antes de produção.

## Verificação

Execute `npm run check` e `npm test` dentro de gator. Os testes usam HTTP local e serviços simulados; não consomem créditos nem escrevem no banco real. A cifra no Vault e a idempotência foram verificadas com chave sintética desabilitada, conforme [verificação do banco](DB-VERIFICACAO.md). O registro ponta a ponta com remix publicado e o motor de proxy autenticado ainda estão pendentes.

Use Node.js 22.23.2 ou superior. Nunca coloque keys no frontend ou no Git.
