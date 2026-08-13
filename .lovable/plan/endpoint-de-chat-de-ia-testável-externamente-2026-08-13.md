# Endpoint de chat de IA testável externamente

## Situação atual

O projeto está vazio (só a página placeholder) e o backend ainda não está ativado. Não existe nenhuma função `ai-chat` hoje.

Importante: neste stack não existem Edge Functions em Deno (`Deno.env.get`). O equivalente é uma **rota de servidor pública** do app, que roda no servidor, guarda secrets com segurança e tem URL fixa chamável por curl. Vou implementar exatamente o comportamento pedido nesse formato.

## O que será construído

1. **Backend ativado** (banco + secrets), para guardar as chaves.
2. **Secrets**
   - `LOVABLE_API_KEY` — criada/garantida no backend, lida só no servidor, nunca enviada ao navegador nem à resposta.
   - `AI_CHAT_TEST_TOKEN` — secret temporária gerada aleatoriamente para o modo de teste.
3. **Endpoint `POST /api/public/ai-chat`**
   - Modelo padrão `google/gemini-3.6-flash`.
   - Body: `messages` (obrigatório), `model`, `system`, `stream` (opcionais).
   - Validação com Zod: máximo de mensagens, tamanho máximo por mensagem e total, papéis permitidos (`user`/`assistant`), modelo restrito a uma allowlist.
   - Erros sempre em JSON claro (`{ error, code }`) com status 400/401/429/502.
   - Suporte a `stream: true` (resposta em streaming) e resposta JSON quando falso.
4. **Modo de teste protegido (apenas desenvolvimento)**
   - Se o header `x-ai-chat-test-token` bater exatamente com `AI_CHAT_TEST_TOKEN` (comparação de tempo constante), a chamada passa sem sessão.
   - Sem o header, ou com valor errado, exige sessão autenticada normal.
   - Bloco marcado com comentário `DEV ONLY — REMOVE BEFORE PRODUCTION` e instruções de remoção.
5. **Página inicial** simples com um chat de teste apontando para o endpoint, para o app não ficar no placeholder.
6. **Entrega**: informo a URL completa do endpoint e um exemplo de `curl` com o header de teste.

## Segurança

- A chave da IA nunca aparece em respostas, logs ou no bundle do cliente; é lida apenas dentro do handler.
- Nada de digest, prefixo da chave ou detalhes internos nas mensagens de erro.
- Rate limit simples por IP para o modo de teste, evitando abuso do endpoint público.

## Como remover o bypass antes de produção

Documentado no topo do arquivo da rota: apagar o bloco marcado como DEV ONLY, apagar a secret `AI_CHAT_TEST_TOKEN` e, se desejar, mover a rota de `api/public/` para uma server function autenticada.

## Detalhes técnicos

- Rota: `src/routes/api/public/ai-chat.ts` (`createFileRoute` com `server.handlers.POST`), prefixo `api/public` porque callers externos precisam passar sem auth do site.
- Chamada ao Lovable AI Gateway em `https://ai.gateway.lovable.dev/v1/chat/completions` com header `Authorization: Bearer ${process.env['LOVABLE_API_KEY']}`, lido dentro do handler.
- Auth normal: verificação do bearer token do Supabase no header `Authorization` quando o token de teste não estiver presente.
- Como o endpoint é do app (não Supabase), o curl usa o token de teste; a anon key do Supabase é aceita apenas no fluxo autenticado normal.
