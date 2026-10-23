# Teste real dos modelos de texto do Gateway

Concluído em 22/10/2026, 21:38:22 (America/Sao_Paulo).

Resultado: **11 modelos configurados responderam** e **8 IDs solicitados ainda não estão configurados na API**.

API testada: https://api.delvertokens.store/v1/chat/completions.

Uma requisição por ID, sem streaming, prompt “Responda somente OK.” e limite de 256 tokens. Cliente temporário com quota limitada ao número de chamadas; removido ao terminar. Nenhuma alteração nas permissões, catálogo ou configurações de produção.

## Modelos configurados

| Modelo | HTTP | Resposta | Tempo | Tokens informados |
|---|---:|---|---:|---:|
| google/gemini-3.6-flash | 200 | OK | 2.97 s | 104 |
| google/gemini-3.5-flash | 200 | OK | 2.46 s | 96 |
| google/gemini-3.1-flash-lite | 200 | OK. | 2.26 s | 8 |
| google/gemini-3.1-pro-preview | 200 | OK. | 3.47 s | 104 |
| google/gemini-2.5-flash | 200 | OK | 2.69 s | 108 |
| google/gemini-2.5-pro | 200 | OK | 2.66 s | 103 |
| openai/gpt-5.6-sol | 200 | OK | 1.98 s | 17 |
| openai/gpt-5.6-terra | 200 | OK | 2.06 s | 17 |
| openai/gpt-5.6-luna | 200 | OK | 2.23 s | 17 |
| openai/gpt-5.5 | 200 | OK | 3.36 s | 29 |
| openai/gpt-5.5-pro | 200 | OK | 4.41 s | 29 |

## IDs novos ainda não configurados

| Modelo solicitado | HTTP | Resultado |
|---|---:|---|
| anthropic/claude-opus-5-5 | 400 | model_not_found |
| anthropic/claude-opus-5 | 400 | model_not_found |
| anthropic/claude-sonnet-5 | 400 | model_not_found |
| anthropic/claude-haiku-4-5 | 400 | model_not_found |
| anthropic/claude-fable-5-1 | 400 | model_not_found |
| openai/gpt-6-astra | 400 | model_not_found |
| openai/gpt-6.1-sol | 400 | model_not_found |
| google/gemini-4-argon | 400 | model_not_found |

Essas oito rejeições aconteceram na política da nossa API. Não foram testes diretos de disponibilidade no provedor. Não houve substituição por aliases ou fallback para outro ID; os modelos configurados retornaram o mesmo ID solicitado na resposta do gateway.

## Evidência e limites

- 19 registros no histórico; os 19 request IDs conferem com as respostas.
- 632 tokens totais informados nas 11 respostas bem-sucedidas; isso não representa conciliação financeira.
- Cliente e chave temporários removidos; logs das chamadas reais preservados.
- Não houve chamada de imagem, vídeo ou embeddings. Esses modelos ficaram explicitamente fora da lista de testes.
- Teste de resposta curta em Chat Completions; não comprova tools, streaming, contexto longo, qualidade geral ou Anthropic nativo.
- JSON com tempos, uso e request IDs: docs/audits/text-models-2026-10-22.json.
