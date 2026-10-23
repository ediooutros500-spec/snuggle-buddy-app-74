# Correção do cabeçalho Claude Code no Lovable

Em 22/10/2026, o aplicativo Claude/Cowork repetia chamadas Fable 5.1 que o gateway apresentava como HTTP 502. O histórico antigo não guardava o motivo upstream. A correção `f6e6cf85c871` passou a preservar erros de solicitação 400/404/409/413/422, com mensagem do provedor sanitizada, em ambos os protocolos de texto. Logs guardam somente classificação e nomes de campos conhecidos, sem conteúdo de conversas nem credenciais.

Depois dessa implantação, o usuário informou o erro real: `feature is not supported on /v1/messages: anthropic-beta "claude-code-20250219"`. Uma chamada controlada pela API pública reproduziu exatamente essa resposta HTTP 400.

## Ajuste

O commit `700086863187` remove somente o item exato `claude-code-20250219` da lista de betas quando o destino é `https://ai.gateway.lovable.dev`. Mantém os demais betas, versão Anthropic e corpo nativo (mensagens, tools, raciocínio, assinaturas e cache). Não troca modelo, não remove ferramentas, não converte mensagens de sistema e não faz uma segunda chamada automática sem todos os betas. Outros upstreams mantêm o marcador.

O ajuste trata a rejeição concreta acima. Recursos beta efetivos ainda podem não estar disponíveis no Lovable e devem continuar sendo recusados explicitamente, sem apagar os recursos pedidos pelo cliente.

## Verificações

- 84 testes aprovados, incluindo filtragem exata, preservação dos outros betas e do corpo, escopo por origem e retorno de erros em Messages e Chat Completions.
- Tipos aprovados; lint sem erros e seis avisos anteriores. Builds Lovable e Node, imagem Linux e smoke Node aprovados.
- Teste real Fable simples: HTTP 200 e texto OK.
- Teste separado com `thinking.type: enabled`: HTTP 400 detalhado, sem 502. Com `thinking.type: adaptive` e esforço medium: HTTP 200 e OK. Isso não foi a causa confirmada do erro enviado pelo usuário; a causa confirmada foi o cabeçalho beta.
- Clientes/chaves temporários removidos após os testes; histórico real preservado. Sem chamadas a imagens, vídeos ou embeddings.

## Checklist

- [x] Publicar retorno fiel dos erros upstream, sem registrar texto privado no histórico.
- [x] Obter o erro específico da conversa real a partir da nova tentativa do usuário.
- [x] Reproduzir o cabeçalho recusado pela API pública antes do ajuste.
- [x] Filtrar somente o marcador recusado no Lovable e verificar preservação dos recursos nativos.
- [x] Implantar `700086863187` na VPS e confirmar HTTP 200 e texto OK com o mesmo cabeçalho, em JSON e SSE; stream terminou com message_stop. Antes: HTTP 400 reproduzido.
- [x] Conferir os request IDs no histórico e remover os clientes temporários. Os 26 containers anteriores permaneceram intactos e StarChef readiness respondeu HTTP 200; Gator/proxy preservados. GitHub Actions aprovado.
- [ ] Confirmar a conversa completa no aplicativo do usuário; testes HTTP não equivalem a operar sua interface.

Evidências HTTP serão mantidas em `docs/audits/provider-errors-*.json`.
