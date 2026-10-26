# Comparação administrativa e plano de conclusão

26/10/2026. Revisão documental das referências e leitura do código local do Gateway. Não é uma certificação de funcionamento de todos os recursos dos projetos de referência. Nenhuma alteração de produção ou migração foi realizada nesta comparação.

## Fontes e escopo

- 9Router: https://github.com/decolua/9router — README: contas, combos, tradução de formatos, quotas, logs, analytics e sincronização.
- OmniRoute (projeto chamado informalmente de OmniRouter nesta conversa): https://github.com/cheaper-inference/OmniRoute/blob/main/docs/guides/FEATURES.md
- Guia: https://github.com/cheaper-inference/OmniRoute/blob/main/docs/guides/USER_GUIDE.md

O endereço antigo diegosouzapw/OmniRoute redireciona ao projeto cheaper-inference. As referências podem mudar; as funcionalidades abaixo são documentadas, não executadas pelo agente. Manter nosso escopo: um provedor Lovable, múltiplas conexões autorizadas, um administrador, sem portal de clientes e sem aba MCP administrativa.

## Matriz

| Área | Referência | Base local observada | Concluir no nosso gateway |
| --- | --- | --- | --- |
| Dashboard | 9Router analytics; OmniRoute analytics/health | Gráficos de uso, sucesso e latência média | p50/p95/p99, taxas por minuto, concorrência, streaming concluído/cancelado; distinguir amostra do total |
| Contas | Ambos: conexões e múltiplas contas | Cadastro automático/manual, nomes, estado e contadores | Última verificação, erros categorizados, próxima tentativa, saúde por conta/modelo; nunca confundir seleção com chamada bem-sucedida |
| Chaves/clientes | OmniRoute API key management | Criação/revogação, validade, modelos, quotas, dispositivos declarados | Validar políticas em todos os endpoints, rotação e revisão da consistência entre processo/DB; não prometer identidade física de dispositivo |
| Requisições | Ambos: filtros e logs | Histórico paginado, CSV, status, tempo, tokens e erro resumido | Detalhe por request ID, todas as tentativas, conta usada em cada uma, erro seguro do provedor, cache/raciocínio se reportados |
| Contexto | Logs/debug e ferramentas de análise | Sem composição do corpo por bloco na telemetria | System, mensagens por papel, ferramentas, defer_loading, referências, anexos e resultados: contagens e tamanhos; conteúdo desligado por padrão |
| Consumo/custo | Ambos: tokens e estimativas; OmniRoute budgets | Uso por modelo/cliente e amostragem; costUsd nulo no agregador | Cobertura de medição, comparações e preços versionados opcionais; custo calculado não equivale a crédito Lovable debitado |
| Roteamento | 9Router combos; OmniRoute estratégias/circuit breaker | Rodízio e tentativas; 402/429 tratados juntos | Diferenciar 402, 429, auth, timeout/5xx; respeitar Retry-After; exclusão de chaves já tentadas; limites antes de abrir stream |
| Políticas de modelo | Ambos: aliases/modelos/combos | Famílias, aliases, modelos habilitados e restrições por cliente | Validação de capacidades por protocolo; fallback de MODELO somente explicitamente configurado e visível |
| Testar API | OmniRoute model/translator playground | Seleção de cliente e modelo | Testar nosso endereço real, mostrar formato, uso e tentativas; casos streaming e tool calls com limites claros |
| Integração | Ambos: IDE/CLI | Tutoriais por família e configuração MCP local | Exemplos copiáveis por cliente sem expor chave salva; base URL correta por ferramenta; suporte e limites do provedor explícitos |
| Configurações | OmniRoute AI/security/advanced/storage | Opções globais e troca de senha | Garantir que toda opção editável tenha efeito real; retenção, limites de corpo/tempo/concorrência e configuração de observabilidade |
| Saúde | OmniRoute health | Health e informações gerais | Estado de DB, escrita de logs, pool, upstream observado, versão e última falha; health 200 não prova inferência |
| Backup/restore | OmniRoute export/import | Procedimentos externos; armazenamento administrativo local | Backup separado de DB e volume administrativo, criptografia e restauração ensaiada; exportação padrão sem credenciais |
| Auditoria | OmniRoute audit e configuration trail | Registro interno; aba removida por pedido | Manter internamente ações críticas sem recolocar menus Equipe/Auditoria; acesso a eventos em Configurações se necessário |
| MCP/agents | OmniRoute inclui servidor MCP/A2A; 9Router tem integrações | Configurador local de conectores; não é proxy MCP da VPS | Preservar conexões por cliente e carregamento sob demanda; não anunciar um servidor MCP central inexistente |
| Compressão/cache | Ambos documentam economia/cache | Mudanças locais de token saver não revisadas e não commitadas | Medir antes; otimização opcional. Não remover ferramentas, instruções, assinaturas thinking ou alterar semântica automaticamente |
| Webhooks | OmniRoute documenta eventos operacionais | Sem mecanismo confirmado nesta revisão | Etapa posterior, com destino autorizado, autenticação e bloqueio SSRF; não essencial para corrigir erros atuais |

## Constatações específicas do código

- src/lib/request-telemetry.server.ts registra uma linha final. Não guarda composição do contexto nem uma linha por tentativa. Uso desconhecido é representado por -1 e convertido para null na administração.
- src/lib/admin-resources.server.ts exporta até 1.000 linhas por página CSV e agrega até 2.000 registros no consumo. Melhorar a agregação antes de apresentar grandes períodos como totais completos.
- src/lib/key-pool.server.ts reúne 402 e 429 como exhausted e cooldown de 15 minutos; Configurações repete essa regra. Falta separar indisponibilidade financeira de limite de frequência.
- src/lib/client-access.server.ts mantém estado de dispositivos/expiração em arquivo com fila no processo. Uma instância isolada não comprova concorrência segura em múltiplas réplicas; IDs declarados podem ser trocados pelo cliente.
- Alterações locais não commitadas no motor e token-saver não foram incluídas em uma entrega nem consideradas funcionalidades verificadas.
- Nenhum dos recursos de analytics dos routers concede acesso ao saldo Lovable. Reset de limite, próxima tentativa e renovação de crédito são conceitos distintos. Não calcular saldo restante pela contagem de tokens sem conciliação confiável.

## Organização final do painel

1. Resumo: saúde e métricas do período.
2. Contas: remixes/credenciais, estado real e histórico de verificação.
3. Clientes: chaves, modelos, validade, limites e dispositivos declarados.
4. Modelos: configuração operacional por família e histórico filtrado, sem reintroduzir catálogo público separado.
5. Consumo: análise por cliente, conta/modelo e cobertura dos dados.
6. Testar API: chamadas controladas com detalhes de execução.
7. Integração: instruções por IDE/CLI.
8. Configurações: senha, políticas globais, retenção, saúde e backup.

Requisições podem permanecer centralizadas em Modelos, conforme pedido anterior, com links diretos a partir de contas/clientes/consumo. Diagnóstico de contexto é um detalhe da requisição, não um menu extra. Manter sem área de cliente, equipe e aba MCP.

## Ordem e checklist de implementação

### 1. Evidência antes de otimização

- [ ] Coletor limitado de estrutura/tamanho do corpo, sem texto por padrão.
- [ ] request_id + attempt_id + conta/modelo + resultado e tempo por tentativa.
- [ ] Tokens medidos distintos de estimados/desconhecidos; cache/raciocínio não duplicados na soma.
- [ ] Detalhe no painel com gráfico e comparativo; uma chamada “oi” deve mostrar o que foi recebido, sem precisar armazenar seu conteúdo.
- [ ] Retenção configurável, índices e agregação no banco para períodos grandes; exportação com limite declarado.

### 2. Falhas e roteamento

- [ ] 402, 429, 401/403, timeout e 5xx com motivos separados.
- [ ] Retry-After validado/limitado; disponibilidade por modelo quando houver evidência de restrição por modelo.
- [ ] Circuit breaker e tentativa de recuperação controlada; não afirmar que crédito renovou após cooldown.
- [ ] Não reativar conta suspensa pelo administrador em upsert/revalidação.
- [ ] Não trocar de modelo silenciosamente; não repetir depois de entregar bytes do stream ou executar ferramenta sem contrato seguro.

### 3. Administração consistente

- [ ] Políticas de clientes exercitadas em /messages, /responses se disponível, chat e demais rotas que anunciarmos.
- [ ] Mudança de configuração persiste e altera a API; opções apenas informativas identificadas.
- [ ] Testes de concorrência, validade e limites; definir suporte a uma ou mais réplicas.
- [ ] Backup privado, restauração em ambiente isolado e recuperação do login verificados.

### 4. Publicação e aceite

- [ ] Testes unitários de métricas, categorização de erro e redaction.
- [ ] Integração: um sucesso, fallback, pool vazio, 402, 429, auth recusada, timeout e upstream 5xx.
- [ ] Streaming: finalização, cancelamento, desconexão e nenhuma resposta/tool call duplicada.
- [ ] MCP: ferramentas diferidas, descoberta e tool_reference; erros do upstream preservados sem secrets.
- [ ] Permissões: endpoints administrativos recusam acesso anônimo e chave de cliente; exportações sem segredos.
- [ ] Falha na escrita do log não derruba a inferência; dados de usuário não aparecem em erro ou métrica.
- [ ] Medir custo de coleta com contexto grande; limitar profundidade, tamanho e cardinalidade.
- [ ] Migração revisada, compatibilidade com versão anterior e rollback preparado.
- [ ] Build, verificação visual, smoke na VPS e preservação dos outros serviços.
- [ ] Atualizar código da instalação independente/pacote somente depois de validar a versão entregue.

Não existe garantia técnica de “zero erros”. O aceite é uma matriz verificável com falhas tratadas, limites explícitos, observabilidade e rollback, sem afirmar testes que não foram executados.
