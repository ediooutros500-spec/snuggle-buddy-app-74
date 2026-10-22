# Zilong Gator

Serviço central local/VPS do Gateway Zilong Body F74. O app Lovable continua sendo o pai remixável; o Gator receberá os handshakes dos filhos e fará o proxy para o Lovable AI Gateway.

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

## Registro assinado de remixes

O Gator atende `POST /api/public/v1/workers/register`. Configure `GATOR_SUPABASE_URL`, `GATOR_SUPABASE_SERVICE_ROLE_KEY` e `REMIX_SYNC_SECRET` em `gator/.env`. Os comandos start/dev carregam esse arquivo. O segredo deve coincidir com o configurado no servidor do remix. Nenhuma credencial vai no browser.

O contrato segue o emissor do app: JSON com `api_key` e `project_origin`; headers `x-handshake-timestamp` (milissegundos), `x-handshake-nonce` e `x-handshake-signature`. A assinatura HMAC-SHA256 hexadecimal cobre `origin|timestamp|nonce|api_key`.

Somente origens HTTPS dos subdomínios Lovable são aceitas. A janela de assinatura é cinco minutos. O nonce é reservado no banco antes de validar a key no upstream; uma tentativa deve sempre usar um novo nonce. Falha de persistência bloqueia o registro. Não há autenticação apenas por token fixo neste endpoint.

A key é validada no Lovable com timeout e sem seguir redirects. HTTP 401/403 recusa a key; 402/429 registra como exhausted; erro de rede/5xx não ativa a key. A gravação usa a RPC existente `register_worker_key`, que depende do Vault `pool_keys_key`. Nenhuma migration é aplicada automaticamente. A resposta traz somente registered, worker_id e status.

Há limite de 16 KiB por payload e dez tentativas por minuto por IP de conexão. Atrás de reverse proxy, o limite usa o IP do proxy; configure proteção adicional no proxy antes de expor publicamente. Nonces persistidos precisam de retenção/limpeza operacional antes de produção.

## Verificação

Execute `npm run check` e `npm test` dentro de gator. Os testes usam HTTP local e serviços simulados; não consomem créditos nem escrevem no banco real. O registro ponta a ponta com remix publicado e a cifra no Vault ainda precisam ser comprovados. O motor de proxy autenticado é a próxima etapa.

Use Node.js 22.23.2 ou superior. Nunca coloque keys no frontend ou no Git.
