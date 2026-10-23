# Configuração dos modelos de texto — resultado real

Conferido em 22/10/2026, 21:52:42, horário de São Paulo.

Os oito modelos adicionais foram habilitados e implantados na VPS. O catálogo agora contém **19 modelos de texto** (os 11 anteriores e os oito novos), além das modalidades existentes. Todos os 19 retornaram HTTP 200 e texto OK/OK. em chamadas reais pela API pública. Não foram chamadas rotas de imagem, vídeo ou embeddings.

## Endereços e encaminhamento

- Base pública: https://api.delvertokens.store/v1.
- `/chat/completions`: os 19 modelos de texto; Claude é adaptado para Anthropic Messages upstream, GPT usa Responses upstream e Google usa Chat Completions upstream.
- `/messages`: Claude segue nativamente ao endpoint Messages do Lovable. JSON, blocos, campos e eventos SSE nativos não são convertidos para outro provedor.
- `/models` e catálogo do painel: oito IDs novos e aliases conferidos por HTTPS; permissões de cliente continuam filtrando a descoberta.
- `/responses` público continua fora desta entrega; Responses é o destino interno dos modelos OpenAI. Jobs de vídeo continuam pendentes.

## Resultado por modelo

| Modelo | HTTP | Texto | Duração | Tokens informados |
|---|---:|---|---:|---:|
| anthropic/claude-opus-5-5 | 200 | OK | 3.01 s | 20 |
| anthropic/claude-opus-5 | 200 | OK | 2.87 s | 18 |
| anthropic/claude-sonnet-5 | 200 | OK | 1.89 s | 18 |
| anthropic/claude-haiku-4-5 | 200 | OK | 1.88 s | 18 |
| anthropic/claude-fable-5-1 | 200 | OK | 4.47 s | 20 |
| openai/gpt-6-astra | 200 | OK | 2.46 s | 17 |
| openai/gpt-6.1-sol | 200 | OK | 2.46 s | 17 |
| google/gemini-4-argon | 200 | OK | 5.29 s | 41 |
| google/gemini-3.6-flash | 200 | OK | 2.76 s | 124 |
| google/gemini-3.5-flash | 200 | OK. | 2.33 s | 108 |
| google/gemini-3.1-flash-lite | 200 | OK. | 1.71 s | 8 |
| google/gemini-3.1-pro-preview | 200 | OK. | 3.63 s | 135 |
| google/gemini-2.5-flash | 200 | OK | 2.82 s | 103 |
| google/gemini-2.5-pro | 200 | OK | 2.76 s | 110 |
| openai/gpt-5.6-sol | 200 | OK | 2.01 s | 17 |
| openai/gpt-5.6-terra | 200 | OK | 1.79 s | 17 |
| openai/gpt-5.6-luna | 200 | OK | 1.65 s | 17 |
| openai/gpt-5.5 | 200 | OK | 1.82 s | 29 |
| openai/gpt-5.5-pro | 200 | OK | 4.11 s | 39 |

Uma chamada por modelo, prompt “Responda somente OK.”, sem streaming e limite de 256 tokens. O ID retornado em Chat Completions correspondeu ao solicitado; não foram usados aliases para contornar modelos indisponíveis. Isso verifica resposta básica nessa conta/pool, não qualidade geral, contexto máximo ou disponibilidade permanente.

## Protocolos e aliases

| Conferência real | Resultado |
|---|---|
| native-json | HTTP 200, aprovado |
| native-sse | HTTP 200, aprovado |
| openai-sse | HTTP 200, aprovado |
| alias:claude-3-5-sonnet | HTTP 200, aprovado |
| alias:claude-sonnet-4 | HTTP 200, aprovado |
| alias:claude-3-5-haiku | HTTP 200, aprovado |
| alias:claude-opus-4 | HTTP 200, aprovado |
| native-tools | HTTP 200, aprovado |
| openai-tools | HTTP 200, aprovado |

- `claude-3-5-sonnet` e `claude-sonnet-4` → `anthropic/claude-sonnet-5`.
- `claude-3-5-haiku` → `anthropic/claude-haiku-4-5`.
- `claude-opus-4` → `anthropic/claude-opus-5-5`.
- Nomes Claude desconhecidos são recusados; não há troca silenciosa por GPT/Google. Os aliases OpenAI anteriores permanecem.
- Native Messages pode retornar o ID/versionamento real do Anthropic, por exemplo `claude-haiku-4-5-20251001`; isso é preservado em vez de substituir o corpo do provedor.
- Cliente limitado a Google foi impedido de chamar Claude: HTTP 403. Chaves temporárias foram removidas; logs reais preservados.

## Validação e implantação

- Código/Imagem: `b83583a69548` / `zilong-gateway-parent:b83583a69548`.
- 76 testes isolados, tipos, builds Lovable/Node e smoke Node aprovados; lint sem erros e seis avisos anteriores. GitHub Actions aprovou o commit de implementação.
- Matriz: 19 registros e 19 request IDs conferidos. Protocolos: 10 registros, incluindo uma rejeição de permissão; 9 IDs de respostas aprovadas conferidos.
- Descoberta pública: HTTP 200; oito IDs canônicos, quatro aliases e filtragem de mídia por cliente conferidos.
- Apenas o serviço Node foi recriado. Gator/proxy e os 26 containers anteriores foram preservados; StarChef readiness HTTP 200.
- Testes locais cobrem preservação de thinking/signatures/cache em corpo e SSE fragmentado, cancelamento do stream nativo e eventos de erro. Os testes reais cobrem texto, SSE e duas chamadas de ferramentas; não comprovam todos os recursos avançados do provedor.
- Logs contêm metadados/uso, sem prompts, respostas ou chaves. O relatório mostra somente o conteúdo benigno do teste.
- O indicador genérico de disponibilidade no painel continua conservador: este teste não implementa monitoramento contínuo de cada modelo/credencial.

## Checklist

- [x] Configurar cinco Claude, GPT-6 Astra, GPT-6.1 Sol e Gemini 4 Argon.
- [x] Expor no catálogo público e no painel; preservar permissões, quota e RPM.
- [x] Claude nativo em Messages e adaptação para clientes OpenAI em Chat Completions.
- [x] Validar os 19 textos, quatro aliases, JSON, SSE e ferramentas por HTTPS.
- [x] Não executar geração de imagem/vídeo nem embeddings.
- [x] Remover clientes/chaves temporários e manter evidências sem segredos.
- [ ] Responses público, ciclo de jobs de vídeo e demais etapas do plano permanecem separados desta entrega.
