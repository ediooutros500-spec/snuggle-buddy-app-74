# Correção de mensagens de sistema intermediárias

Em 22/10/2026, o usuário mostrou no Claude/Cowork com Opus 5.5 o erro HTTP 400: “Cada mensagem precisa de role 'user' ou 'assistant'.” A validação do gateway estava limitada ao contrato antigo de Messages. A [documentação oficial da Anthropic](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages) admite `role: system` no meio da conversa em modelos compatíveis, incluindo Opus 5.5. O corpo da requisição original do aplicativo não foi capturado; a reprodução controlada abaixo gerou exatamente o erro da imagem.

## Alteração

- `/v1/messages` aceita `user`, `assistant` e `system`; outros papéis continuam recusados.
- No Anthropic nativo, a mensagem de sistema permanece no mesmo lugar, com os mesmos blocos e campos. Não é movida ao início nem convertida em texto do usuário. Isso preserva a ordem de instruções, ferramentas e o prefixo de cache.
- Encaminhamento para outros provedores recusa esse recurso explicitamente. Os conversores também o recusam, para impedir rebaixamento silencioso para uma mensagem de usuário.
- A validação final de suporte por modelo, posição das mensagens e recursos beta continua com o provedor. Não implica que todos os modelos Claude tenham a mesma capacidade.

## Verificações

Reprodução real anterior: modelo `anthropic/claude-opus-5-5`, `messages=[{role:user,content:oi},{role:system,content:Responda somente OK.}]`, limite 128 tokens. Nossa API retornou HTTP 400 com o texto exato da imagem. Envio direto ao Lovable, mantendo a chave somente no processo da VPS, respondeu HTTP 200 e OK.

Depois da implantação:

| Caso pela API pública | Resultado |
|---|---|
| Mesmo pedido com system intermediário, JSON | HTTP 200, OK, 4079 ms |
| System intermediário em blocos, SSE | HTTP 200, OK, evento message_stop presente |
| Pedido nativo comum sem system intermediário | HTTP 200, OK |
| Papel desconhecido | HTTP 400, sem encaminhamento |
| System intermediário para Google | HTTP 400 explícito, sem transformá-lo em texto de usuário |

Os cinco request IDs foram conferidos no histórico. Clientes e chaves temporários removidos; logs reais preservados, sem prompts ou credenciais. Evidências: `docs/audits/system-role-before-2026-10-22.json` e `docs/audits/system-role-after-2026-10-22.json`.

80 testes isolados passaram; tipos, builds Lovable/Node e smoke Node aprovados. Lint sem erros e seis avisos anteriores. GitHub Actions aprovou o código. Commit de implementação `dfb9ccca68ed`, implantado como `zilong-gateway-parent:dfb9ccca68ed`. Gator/proxy e os 26 containers anteriores preservados; StarChef readiness HTTP 200.

## Checklist

- [x] Reproduzir o erro da imagem sem acessar o conteúdo privado das conversas do aplicativo.
- [x] Conferir o contrato e o suporte no upstream real.
- [x] Preservar mensagens e blocos nativos, incluindo instruções após resultados de ferramentas.
- [x] Testar preservação de ordem e recusa de papéis desconhecidos e de conversão destrutiva.
- [x] Implantar e testar JSON, SSE, pedido comum e rejeições esperadas por HTTPS.
- [x] Atualizar evidências, commits e checklist.
- [ ] Confirmar nova tentativa dentro do Claude/Cowork do usuário. A reprodução HTTP aprovada não substitui a confirmação da conversa real.
