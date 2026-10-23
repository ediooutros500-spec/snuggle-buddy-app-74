# Saldo e consumo Lovable por conta e workspace

Investigação em 23/10/2026. Não implementado; nenhum saldo real foi consultado nesta etapa.

## Resultado da investigação no repositório remixável

Repositório confirmado: ediooutros500-spec/snuggle-buddy-app-74. O cadastro atual está em src/lib/child-handshake.server.ts e lê as configurações de src/lib/child-config.server.ts. Envia somente a chave de inferência, origem e rótulos. Os arquivos locais de ambiente contêm nomes de chave, mas nenhum valor local utilizável de LOVABLE_API_KEY; por isso a prova utilizou uma credencial já cadastrada no pool central, sem exibir nem salvar seu valor.

Teste em 23/10/2026 com a MESMA credencial de projeto nos três serviços:

| Operação | HTTP | Resultado observado |
| --- | --- | --- |
| Uma chamada mínima de texto ao AI Gateway | 402 | Recusa por pagamento/créditos; corpo descartado, não foi possível quantificar saldo ou identificar renovação |
| initialize do MCP Lovable com a chave como Bearer | 401 | Exige outra autorização; não retornou saldo |
| GET /v1/workspaces da API pública com Lovable-API-Key | 401 | Chave do projeto não autorizou consulta administrativa |

A situação “active” no cadastro não é prova de crédito disponível. O resultado 402 também não demonstra saldo numérico zero ou próxima data de reposição. A listagem pública de modelos retornou 200 até sem uma chave válida e, portanto, não serve para validar acesso de faturamento.

Conclusão de viabilidade: não foi encontrado um caminho oficial funcional de saldo/renovação automático usando apenas o segredo de inferência herdado pelo remix. As respostas acima comprovam a recusa da credencial testada, não a impossibilidade de toda integração futura. Não acrescentar ao gatilho campos fictícios, um total calculado a partir de quotas locais ou uma data universal de reset.

O próximo desbloqueio é uma autorização OAuth de usuário para executar list_workspaces/get_workspace no MCP oficial. Não havia ferramenta Lovable autenticada disponível nesta sessão. Conexão configurada em outro aplicativo não fornece automaticamente autorização ao backend da central ou do remix. Ainda é necessário observar o retorno real, verificar os campos de créditos e descobrir se há dados de ciclo de cobrança; a documentação confirma saldo em get_workspace, mas não confirma uma data de renovação nessa resposta.

- [x] Inspecionar gatilho, configuração, planos e cadastro do repositório remixável.
- [x] Testar uma credencial real do pool central contra MCP e API administrativa, sem exposição de segredo.
- [x] Executar um teste mínimo de texto; sem imagem, vídeo ou embeddings.
- [x] Conferir a limitação explícita da API REST para saldo/consumo na documentação oficial.
- [ ] Autorizar consulta MCP no contexto que poderá executar a integração e obter um saldo real.
- [ ] Validar campo oficial de renovação; se ausente, não inventar data.
- [ ] Implementar envio periódico pelo remix, persistência e soma por workspace somente após validar a fonte real.

Evidência resumida, sem credenciais: docs/audits/lovable-credit-access-2026-10-23.json.

## Conta nova informada pelo usuário — 23/10/2026

- [x] Novo cadastro observado às 18:29:08 UTC (15:29:08 America/Sao_Paulo), inicialmente active e sem requisições contabilizadas no pool.
- [x] Selecionar credencial pelo mecanismo existente e conferir que seu hash corresponde exatamente ao novo cadastro antes de enviar teste.
- [x] Chamada direta ao AI Gateway com google/gemini-3.6-flash, max_tokens=8: HTTP 200; prompt_tokens=6, completion_tokens=4, total_tokens=10. Todos os quatro tokens de saída foram reportados como reasoning; conteúdo textual vazio. O teste prova aceitação e contabilização de tokens, não uma resposta textual final nem saldo monetário.
- [x] Resposta sem cabeçalhos de saldo, créditos, custo ou renovação. Campo de saldo e tipo de crédito debitado continuam desconhecidos.
- [x] Conferir navegador disponível: Lovable sem sessão autenticada. Solicitado ao usuário login na conta nova para conferir o consumo no painel oficial.
- [ ] Comparar consumo nas categorias construção e AI gateway. Não inferir a categoria a partir dos tokens ou do status active.

Evidência: docs/audits/new-account-credit-test-2026-10-23.json. Nenhuma chave incluída. O seletor do pool incrementa seus contadores operacionais ao reservar a credencial; esses contadores não são o relatório de faturamento Lovable.

## O que foi confirmado

- O remix atual registra LOVABLE_API_KEY, origem e rótulos na central. Não consulta saldo nem ciclo de faturamento.
- A documentação oficial MCP lista get_workspace com plano e saldo de créditos. É um caminho para testar com autorização do usuário; não comprova todos os campos retornados nem sincronização de produção.
- A documentação do conector Lovable API declara explicitamente que não reporta saldo ou consumo porque a API REST não inclui endpoints de créditos. A chave de execução de modelos não deve ser tratada como autorização administrativa da conta.
- Créditos são compartilhados pelo workspace. Vários remixes no mesmo workspace não devem criar saldos independentes nem multiplicar o total disponível.
- Regras de renovação variam por tipo de crédito. Créditos diários de construção não devem ser somados como saldo disponível para inferência da API.

## Etapa 1: prova somente leitura

- [x] Ler registro atual do remix e documentação oficial MCP/API/faturamento.
- [ ] No conector Lovable autorizado, executar list_workspaces e get_workspace para um workspace de teste.
- [ ] Registrar nomes e tipos dos campos retornados, sem tokens, chaves, dados pessoais ou dump completo da conta.
- [ ] Verificar saldo geral, saldo específico de IA, plano, identificador do workspace, data de cobrança, datas de validade e renovação. Campo ausente permanece desconhecido.
- [ ] Comparar os valores com Plans & credit usage da mesma conta e horário.
- [ ] Confirmar se há acesso oficial apropriado para consulta recorrente pelo backend antes de implementar sincronização automática.

Prompt para o teste no Claude:

> Use somente o conector Lovable: liste meus workspaces e consulte os detalhes do workspace que eu indicar. Mostre plano e saldo de créditos retornados. Confira se existem campos de saldo específico de IA, renovação, ciclo de cobrança ou validade. Quando um campo não existir na resposta, escreva “não informado”. Não envie mensagens ao agente Lovable, não crie nem altere projetos, não publique nada e não exponha chaves ou tokens.

## Etapa 2: estrutura da central

- [ ] Vincular Conta → workspace → projetos/remixes → credenciais de inferência. Manter Conta 1/Conta 2 como rótulos amigáveis, usando IDs reais internamente.
- [ ] Separar autorização administrativa de consulta das chaves de inferência. Conectar cada workspace próprio uma vez; não herdar autorizações administrativas do pai por remix.
- [ ] Guardar instantâneos: workspace, saldo, unidade, tipo de crédito, origem da informação, horário da consulta e erro da sincronização.
- [ ] Distinguir dado confirmado pelo fornecedor, estimativa calculada e informação manual.
- [ ] Mostrar dados desatualizados como desatualizados; consulta malsucedida não transforma saldo desconhecido em zero.
- [ ] Nunca expor credenciais em código, frontend, logs, repositório ou endpoint público. Relatórios recebidos de filhos exigem autenticação própria e proteção contra repetição; saldo comunicado por um filho não é confirmação independente do fornecedor.

## Etapa 3: painel administrativo

- [ ] Contas: plano, saldo geral, saldo de IA se retornado, remixes vinculados, última sincronização, próxima concessão e vencimentos conhecidos.
- [ ] Consumo: requisições, tokens conhecidos/desconhecidos, modelo, cliente, conta/workspace e período.
- [ ] Médias: créditos por chamada, chamadas por crédito e tokens por crédito quando houver consumo AI gateway real comparável no mesmo escopo/período. Marcar aproximações e cobertura dos dados.
- [ ] Separar consumo de inferência de construção, Cloud e conectores; a queda do saldo total não identifica isoladamente o gasto do gateway.
- [ ] Previsão de duração com histórico suficiente, janela informada e rótulo de estimativa; separar renovação confirmada de data derivada das regras do plano.
- [ ] Alertas de saldo baixo e falha de sincronização; não reativar credencial esgotada apenas porque uma data prevista passou. Confirmar recuperação com verificação controlada.

## Renovação: regras documentadas, não datas verificadas desta conta

- Diários de construção/chat: 00:00 UTC (21:00 do dia anterior em America/Sao_Paulo em 23/10/2026). Não são a franquia de inferência.
- Franquia mensal de IA: Free no primeiro dia do mês em UTC; Pro/Business no ciclo da assinatura.
- Créditos mensais do plano: início de cada período mensal, mesmo no faturamento anual.
- Créditos comprados, bônus e acumulados têm regras próprias de validade; não existe um único reset para todo o saldo.
- Datas exatas por conta só devem aparecer como confirmadas se vierem de resposta oficial ou forem conferidas no painel pelo titular.

## Remix ou central?

Preferir consulta administrativa na central se houver autenticação e acesso oficial apropriados. O remix continua fornecendo identificação do projeto e estado da credencial. Pode enviar métricas agregadas que ele observa, porém não consegue descobrir dados de faturamento que a plataforma não fornece a ele. Copiar o projeto não concede acesso administrativo ao workspace de destino.

## Fontes oficiais

- https://docs.lovable.dev/integrations/lovable-mcp-server — get_workspace e OAuth.
- https://docs.lovable.dev/integrations/lovable-api-connector — limitações: sem relatório de saldo/consumo.
- https://docs.lovable.dev/integrations/lovable-api — API e requisitos de planos/permissões.
- https://docs.lovable.dev/introduction/credits-and-usage — tipos de créditos, consumo e renovação.
