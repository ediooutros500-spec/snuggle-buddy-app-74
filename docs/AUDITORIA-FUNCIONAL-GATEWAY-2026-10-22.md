# Auditoria funcional do Gateway — 22/10/2026

## Resultado

O sistema está online e possui uma base administrativa funcional, mas **ainda não é um gateway totalmente administrável nem foi validado com inferência real**. Há controles exibidos/salvos que não governam as requisições, telas incompletas e falhas de aplicação de políticas. Corrigir os itens P1 antes de liberar consumo real a clientes.

Painel: https://secretsof.delvertokens.store/ · API: https://api.delvertokens.store/v1

Versão confirmada na VPS: `zilong-gateway-parent:3264c13f9262`. HEAD documental anterior à auditoria: `d325232`. Os arquivos locais já modificados, inclusive o novo `gateway-core.server.ts`, não foram tratados como funcionalidades publicadas. Não houve deploy nem alteração de políticas de produção nesta auditoria.

## Método e limites

- Revisão de todos os 12 itens de navegação, seus eventos e os respectivos handlers do código implantado.
- 20 verificações HTTP iniciais nos dois hosts; login e consultas autenticadas, CSRF e logout verificados separadamente.
- 31 testes existentes da aplicação e 25 do Gator passaram novamente, em cópia isolada da versão entregue.
- Cinco problemas de política reproduzidos em sete cenários locais executando os handlers/helpers reais com banco/provedor simulados. Nenhuma chamada de IA foi enviada nesses testes.
- 19 verificações existentes do contrato do banco passaram. A chave anônima correta do banco central foi validada com HTTP 200 no serviço de autenticação; seis leituras de tabelas retornaram listas vazias. As verificações iniciais que usaram a chave pública do frontend e retornaram 401 **não são evidência de RLS do banco central**.
- SQL/RLS/grants e corpos reais das funções SQL ainda exigem conexão SQL autorizada; REST não conclui essa auditoria.
- Revisão visual, responsividade, teclado e execução de cliques no navegador não realizadas: o controle de navegador local está desativado no Work. Os achados de interface vêm da revisão do código entregue, não de screenshots.
- O login utilizado gerou os eventos normais de entrada/saída. O remix do usuário recebeu um sinal normal de diagnóstico. Não foram criadas contas/clientes, alterados limites ou executadas migrations/deploys durante esta auditoria.
- A disponibilidade real de cada modelo/modalidade, streaming, ferramentas e failover com chaves válidas continua sem comprovação. Health e catálogo não substituem uma chamada real.

## Estado real observado

| Indicador | Resultado |
|---|---|
| Painel e health do pai | HTTP 200 |
| Health público do Gator | HTTP 200 |
| Gateway/equipe/pool com sessão administrativa | HTTP 200 |
| Administração sem sessão | HTTP 401 |
| Administração pelo host exclusivo da API | HTTP 404 |
| Catálogo e cinco rotas de inferência sem chave | HTTP 401 |
| Alteração administrativa com Origin incorreto | HTTP 403 |
| Administração após logout | HTTP 401 |
| Clientes / chaves Lovable cadastradas / logs de requisição | 0 / 0 / 0 |
| Contas administrativas ativas | 1 |
| Contas de testes anteriores desativadas | 2; preservadas para auditoria |
| Remix `oi-kindred-connection.lovable.app` | Site HTTP 200; announce HTTP 200, `registered: false`, pede `REMIX_SYNC_SECRET` |
| Serviços do gateway | Três containers saudáveis |
| Serviços anteriores da VPS | 26 containers com os mesmos IDs; StarChef readiness HTTP 200 |
| Recursos no momento da consulta | Disco 86% ocupado, aproximadamente 14 GB livres; memória disponível aproximadamente 2 GB; swap em uso aproximadamente 3,7 GB |

## Revisão de todas as telas

| Tela | Situação | O que funciona | O que falta ou está incorreto |
|---|---|---|---|
| Visão geral | Parcial | Carrega clientes e pool reais | Total de modelos vem de lista fixa de seis itens; requisições refletem contadores do pool, sem conciliação por cliente/período; saudação fixa “Edio”; sem indicadores de prontidão do pool |
| Endpoints | Parcial | Mostra endereço público correto e copia URLs | Apresenta imagens/vídeos/embeddings sem indicar ausência de validação real; não mostra exemplos, teste autorizado, capacidades ou consulta de jobs |
| Modelos | Incompleta | Exibe seis cartões | “Ativo” é fixo; não consulta disponibilidade; catálogo diverge do `/v1/models`; sem ações de habilitar/desabilitar, preço, capacidades ou diagnóstico |
| Rotas e fallback | Incompleta | Renderiza um formulário | É o mesmo formulário de Preferências/Quotas; não gerencia prioridades, aliases, condições, políticas ou simulação de fallback |
| Clientes e API keys | Parcial funcional | Criação, chave única, máscara, rotação, suspensão e reativação | Falta editar nome/modelos/RPM/quota/notas pela tela; múltiplas chaves, expiração, pesquisa/paginação e confirmação de cópia; botões de alteração aparecem também para leitura, embora o servidor negue |
| Limites e quotas | Incompleta | Campo numérico é salvo na configuração | Não configura quota por cliente; limite global salvo não é aplicado no fluxo; nenhuma reserva concorrente, limite de simultaneidade ou diagnóstico |
| Workers | Parcial | Lista metadados e contadores reais | Sem controles de desativação, revalidação, prioridade, quota e reativação na interface; algumas operações existem na API, mas não na tela; status sempre estilizado em verde |
| Sincronização de remixes | Parcial | Valida origem e envia sinal ao remix | Mesma tela de Workers; não distingue sinal entregue de cadastro confirmado; resultado detalhado e erro do filho não são exibidos; remix existente ainda exige segredo legado |
| Uso e custos | Não implementada | Item existe no menu | Não tem tratamento próprio: cai nos cartões da visão geral; sem custo, tokens, período, cliente, exportação ou conciliação |
| Logs de requisições | Parcial | Mostra até 50 registros mais recentes | Sem paginação, busca, filtros, horário, detalhe, request ID ou tentativas; erro/tokens consultados não aparecem; cobertura de gravação incompleta |
| Preferências | Parcial com defeitos | Envia alteração ao banco | Não inicializa os campos a partir de `ad.settings`; salvar limpa a lista de modelos bloqueados e fixa cooldown em 15; modelo padrão e RPM salvos não governam o fluxo entregue |
| Segurança | Parcial funcional | Contas, perfis, bloqueio, troca de senha e últimas 100 ações; bloqueio do último administrador no servidor | MFA, recuperação e mudança de senha pelo próprio operador/leitor; sessão expirada/revogada nem sempre retorna imediatamente ao login; histórico local sem exportação e sem trilha completa do pool |

As telas são selecionadas por estado React, todas na URL `/`. Atualizar a página perde a seção escolhida; não há URLs próprias nem navegação por histórico para cada recurso.

## Achados e prioridades

P1 = corrigir antes de liberar uso real. P2 = completar para operação administrativa confiável. Nenhum P0 foi demonstrado no escopo executado; isso não equivale a certificação de segurança.

### A01 — P1: caminhos de resolução podem usar modelo desabilitado

Em `src/lib/claude-compat.server.ts`, `resolveModel` devolve o modelo constante imediatamente quando o campo é omitido. Os fallbacks de nomes desconhecidos também retornam modelos sem reaplicar a lista de bloqueados.

**Reprodução local:** `resolveModel(undefined, ["google/gemini-3.6-flash"])` retorna justamente o modelo desabilitado. Um nome Claude não reconhecido também retorna o destino bloqueado do fallback.

**Correção/aceite:** resolver destino uma única vez e validar bloqueio global, catálogo e permissão do cliente depois de qualquer default/alias/fallback. Cobrir omissão, aliases, nomes desconhecidos e fallback com testes negativos.

### A02 — P1: mídia ignora modelos permitidos ao cliente e bloqueios globais

`src/lib/media-gateway.server.ts` autentica e limita frequência, mas os handlers de imagens, embeddings e vídeos usam apenas suas allowlists estáticas. Não verificam `auth.client.allowed_models` nem `gateway_settings.disabled_models`.

**Reprodução local:** um cliente restrito ao modelo de texto Gemini alcançou o encaminhamento de imagem, embedding e vídeo e recebeu HTTP 200 do provedor simulado. Eram esperados bloqueios antes do encaminhamento. Não foi necessário consumir crédito real.

**Correção/aceite:** todas as modalidades devem usar a mesma decisão de autorização; testar 403 para modelo não permitido e impedir qualquer chamada ao provedor quando bloqueado.

### A03 — P1: quota de cliente não bloqueia o consumo

A autenticação retorna ID/nome/modelos/RPM, sem quota nem total. As rotas de texto entregues não chamam `consume_client_quota` ou mecanismo de reserva. A existência da RPC no banco não garante sua utilização.

**Reprodução local:** cliente com quota 0 e 100 requisições anteriores ainda alcançou o provedor simulado e obteve HTTP 200.

**Correção/aceite:** reserva transacional antes de chamar o provedor, reconciliação/falha e recuperação após reinício; testes com chamadas concorrentes. Distinguir quota do cliente da contagem diária por chave Lovable.

### A04 — P1: RPM global salvo é ignorado e limites são inconsistentes

Chat/Messages usam `rateLimitKey(request)` baseado em cabeçalhos/IP e RPM do cliente, sem consultar `global_rate_limit_rpm`. Catálogo e mídia usam bucket por cliente. O estado é mantido em memória do processo.

**Reprodução local:** com RPM global configurado em 1, duas chamadas consecutivas foram aceitas. Não há garantia de limite compartilhado entre instâncias, após reinício ou entre as famílias de endpoints.

**Correção/aceite:** limites globais e por cliente/chave explícitos e compartilhados; identidade de proxy confiável; limite de simultaneidade; testar isolamento entre clientes e reinício.

### A05 — P1: configurações exibidas/salvas não representam o comportamento

`refresh()` do painel não aplica as configurações recebidas aos campos. `save()` sempre manda `disabled_models: []` e `cooldown_minutes: 15`, podendo apagar uma política de bloqueio existente. O texto usa `DEFAULT_MODEL` constante; o cooldown de failover também é fixo no código/SQL local.

**Reprodução local:** alterar o modelo padrão no banco simulado não muda o destino quando a chamada omite o modelo. Inspeção confirma que os outros dois campos são sobrescritos no formulário. A auditoria não salvou configurações reais para demonstrar isso.

**Correção/aceite:** carregar valores reais, separar formulários, validar intervalos/capacidades e salvar apenas os campos alterados. Conferir a decisão efetiva da API após salvar e após recarregar a página.

### A06 — P1 operacional: cadastro e inferência reais continuam bloqueados

O pool está vazio. O remix informado respondeu `registered: false` e ainda pede o segredo legado. A central atual usa registro automático, mas a versão antiga já publicada no remix não é atualizada simplesmente porque a VPS mudou.

**Correção/aceite:** publicar origem/hook atualizado no Lovable e atualizar o remix existente ou criar outro a partir da origem atualizada. Confirmar `LOVABLE_API_KEY` no runtime do servidor desse projeto, endereço da central herdado e confirmação com `worker_id`. Depois fazer uma chamada real e streaming com chave de cliente, conciliando consumo e tentativa. Não exigir GitHub individual nem segredo compartilhado por remix para o fluxo automático escolhido pelo usuário.

### A07 — P1 condicional: endpoints legados têm políticas separadas

`/api/public/ai-models` faz testes de até 11 modelos por GET sem autenticação, cache, limite próprio, timeout explícito ou teto de saída. Na VPS atual retorna HTTP 500 porque não há chave Lovable local; **não foi demonstrado consumo indevido nessa instalação**. Ao habilitar uma chave local ou publicar a mesma rota em um projeto Lovable, esse caminho precisa de proteção.

`/api/public/ai-chat` autentica por sessão Supabase ou token de teste, fora da política das chaves de cliente, sem quota/RPM do gateway. Cadastro de usuários no serviço Supabase central está habilitado segundo a configuração pública; não foi criada uma conta para explorar esse caminho. `/diagnostics` continua usando autenticação legada, diferente da sessão do painel.

**Correção/aceite:** remover/bloquear rotas legadas na central ou integrá-las ao motor e à política correta. Probes de capacidade devem ser administrativos, limitados e explícitos. Evitar oferecer caminho alternativo ao consumo controlado.

### A08 — P2: várias áreas administrativas são apresentação ou formulário repetido

Modelos fixos “Ativos”, Rotas/Quotas/Preferências repetidas, Uso/Custos sem tela própria e Workers sem ações. Isso impede administrar o produto como sugerem os nomes no menu.

**Correção/aceite:** contratos por recurso e telas próprias com URLs, estado real, ações permitidas por perfil e indicação de indisponibilidade onde a função ainda não existe. Workers precisa de controles de quota/estado e diagnóstico real do cadastro; clientes precisa de edição de políticas.

### A09 — P2: telemetria não concilia requisição, tentativa, tokens e custo

Messages incrementa estatística com tokens zero antes de consumir a resposta; Chat não faz o mesmo incremento. Mídia não grava o mesmo histórico. Chamadas que falham antes de obter upstream podem não gerar registro. Logs são disparados sem garantia de sucesso e latência é medida antes de terminar geração/streaming. Contadores do pool medem seleção/tentativas, inclusive failover, e não equivalem a respostas de clientes concluídas.

**Correção/aceite:** ID único, tentativa por credencial sem segredo, início/fim/erro/cancelamento, uso real após conclusão, custo medido/estimado/desconhecido identificado; paginação, filtros e exportação. Comparar um pedido real com todos os seus registros.

### A10 — P2: resiliência de inferência ainda incompleta

`fetchGatewayWithFailover` não recebe cancelamento do cliente nem aplica deadline explícito no fetch. Streams não implementam propagação completa de cancelamento/backpressure; respostas substituídas em retries não têm descarte explícito consistente. Retentativas de geração precisam considerar duplicação e custo.

**Correção/aceite:** deadline total, timeouts por fase, liberação de bodies, cancelamento e concorrência; testes de stream interrompido, timeout, falha antes/depois do primeiro byte e política de retry por modalidade. Não declarar isso validado apenas pelos testes de cadastro.

### A11 — P2: segurança administrativa tem pendências de operação e interface

Login, cookie seguro, verificação de perfil no servidor e revogação funcionam no escopo testado. Continuam ausentes MFA, recuperação controlada, gestão de sessões e mudança da própria senha para operador/leitura. A tela apresenta botões de escrita para perfil somente leitura. Após trocar a própria senha/perfil, a interface não tem tratamento uniforme da sessão revogada em todas as ações.

Na resposta HTML da raiz dos dois hosts não foram encontrados HSTS, CSP, proteção contra enquadramento, `nosniff` ou política de referenciador. Cookie Secure/HttpOnly e CSRF não substituem esses cabeçalhos. Não foi demonstrada exploração de clickjacking/XSS.

**Correção/aceite:** MFA/recuperação, fluxo próprio de senha, perfil refletido na UI e tratamento central de 401/403. Definir e testar cabeçalhos compatíveis com a aplicação, especialmente restrição de enquadramento do painel.

### A12 — P2: auditoria e recuperação ainda não cobrem o sistema inteiro

Contas/auditoria ficam em JSON local num volume; sessões ficam em memória. Operações são serializadas por processo, exigindo uma réplica administrativa. Alteração no banco e evento local de auditoria não formam uma transação. Quota/reativação/dispatch de worker não geram a mesma trilha completa. Falha de auditoria após emissão de chave pode devolver erro embora a mudança no banco já tenha ocorrido.

Há backup/restauração local das contas já verificado. Não há evidência de backup externo cifrado e restauração do banco central, incluindo chave de cifra e configuração. Disco compartilhado está em 86%; monitoramento e retenção precisam cobrir o risco sem limpeza global dos demais serviços.

**Correção/aceite:** armazenamento e auditoria consistentes, cobertura das alterações do pool, alertas, backup externo cifrado, restauração isolada e plano de retorno que preserve o suporte a chaves por hash.

### A13 — P2: validações e mensagens podem indicar sucesso sem efeito

POST de cliente não aplica os mesmos limites de RPM da alteração; a atualização de configurações usa conversões/fallbacks numéricos, sem contrato forte. Updates comuns de cliente e worker não comprovam que uma linha existente foi atingida. `refresh()` ignora erro HTTP da consulta de workers e pode mostrar lista vazia como se fosse uma consulta válida. Várias ações não tratam falhas de rede uniformemente; o envio de sinal não apresenta o motivo de registro recusado pelo remix.

**Correção/aceite:** schemas no servidor, limites numéricos e de tamanho, 404 para recurso inexistente, atualização concorrente/idempotência nas ações sensíveis, erros independentes por área e diagnóstico `registered`/`worker_id` no fluxo de sincronização.

### A14 — P2: orçamento de tempo do handshake não cobre todas as etapas

O filho interrompe o pedido de registro após oito segundos. A central pode gastar até oito segundos só na validação upstream, além da gravação e consulta do worker, também com seus próprios limites. É possível registrar na central e o filho perder a confirmação; os testes com respostas imediatas não cobrem esse cenário.

**Correção/aceite:** deadline global coordenado, operações idempotentes e consulta de estado da confirmação. Testar provedor lento e persistência lenta sem duplicar worker ou perder o diagnóstico.

## Sequência de correção e critérios de conclusão

1. **Políticas antes de consumir crédito:** A01–A05, A07. Motor único para texto/mídia/catálogo; bloqueio real de modelo/quota/RPM; salvar configurações sem remover bloqueios. Adicionar os casos reproduzidos à suíte como regressões que exijam a correção.
2. **Remix real:** A06 e A14. Atualizar publicação Lovable, confirmar primeiro registro, depois uma chamada e um stream reais com uso conciliado.
3. **Administração real:** A08, A11 e A13. Recursos/telas próprios, edição efetiva de clientes/workers/modelos/rotas, URLs, permissões visuais e mensagens corretas.
4. **Rastreabilidade e recuperação:** A09, A10 e A12. Consumo/tentativas, cancelamento, logs completos, MFA/recuperação e backup externo restaurado em ambiente isolado.

O resultado só deve ser chamado de completo depois de verificar todos os critérios do plano e deste relatório. Os 56 testes aprovados atualmente cobrem principalmente cadastro, acesso e contratos existentes; os problemas reproduzidos mostram lacunas dessa cobertura.

## Entregáveis e publicação

Esta auditoria entrega relatório e atualização do checklist. As correções de código listadas acima **não foram implantadas por esta revisão**. Conector GitHub continua indisponível e a autenticação Git local estava inválida na execução anterior; os commits desta documentação serão preservados localmente, sem declarar sincronização com GitHub/Lovable.
