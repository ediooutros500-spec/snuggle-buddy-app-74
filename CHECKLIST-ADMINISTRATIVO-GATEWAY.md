# Execução do plano administrativo

Plano: [PLANO-ADMINISTRATIVO-GATEWAY.md](docs/PLANO-ADMINISTRATIVO-GATEWAY.md). Marcar concluído somente com evidência. Uma entrega pode estar parcialmente implementada; commit, teste local e implantação são estados distintos.

Auditoria atual: [revisão funcional de todas as telas em 22/10/2026](docs/AUDITORIA-FUNCIONAL-GATEWAY-2026-10-22.md). Os itens concluídos de autenticação não significam que quotas, modelos e consumo estejam integralmente protegidos.

## E0 — Base e integração real

- [x] Identificar o commit publicado e preservar alterações locais anteriores (inventário em 22/10/2026).
- [x] Conferir VPS: gateway e StarChef saudáveis antes da nova etapa.
- [ ] Publicar a versão atualizada da origem no Lovable.
- [ ] Cadastrar um remix real e executar inferência real com consumo conciliado.
- [ ] Auditar SQL/RLS/grants no projeto Supabase central correto.
- [ ] Ensaiar backup/restauração do banco central antes de migrations.

## E1 — Acesso administrativo e chaves

- [x] Login individual, sessão HttpOnly/Secure, expiração e logout.
- [x] Perfis administrador/operador/leitura, verificados no servidor.
- [x] Gerência de usuários e auditoria sem segredos.
- [x] Chaves de cliente: hash no armazenamento, exibição única e rotação.
- [x] Executar diagnóstico/backfill e retirar autenticação por chave em texto: banco sem clientes legados nesta execução; zero conversões necessárias.
- [ ] Múltiplas chaves e expiração individual, consolidando a tabela dedicada existente.
- [ ] MFA e recuperação administrativa controlada.
- [x] Testes de autorização, CSRF, sessão revogada e vazamento de segredos.
- [x] Build isolado, implantação e verificações reais na VPS.

## E2 — Motor e limites

- [ ] Migrar catálogo/chat/messages para pipeline único no Gator.
- [x] Compartilhar políticas de modelos e limites entre texto, mídia e catálogo na ponte Node atual, sem declarar migração do motor para o Gator concluída.
- [x] Admissão de quota total de cliente por atualização condicional atômica no banco; uma unidade disponível admite somente uma chamada concorrente.
- [x] Aplicar RPM global e por cliente, compartilhado entre endpoints da instância atual.
- [ ] Reservas de quota atômicas, reconciliação e recuperação após falha.
- [ ] Limites compartilhados por cliente, chave e simultaneidade.
- [ ] Deadline/cancelamento/streaming e failover seguro testados.

## E3 — Pool

- [x] Gestão de credenciais e projetos: cadastro com validação, identificação, limite diário e ativação/desativação. Validação com credencial real ainda pendente.
- [ ] Cooldown, prioridade e circuit breaker visíveis e efetivos.
- [ ] Diagnóstico do cadastro automático e políticas centrais opcionais.

## E4 — Painel, modelos e rotas

- [x] Dez páginas administrativas com URLs próprias, dedicadas ao provedor Lovable.
- [ ] Catálogo único persistido e capacidades verificadas.
- [ ] Formulários distintos e políticas de roteamento com simulação.
- [x] Substituir indicadores estáticos de segurança pela gestão de equipe/auditoria e corrigir contagem de clientes ativos.

## E5 — Uso e observabilidade

- [ ] Logs paginados, request ID e histórico de tentativas.
- [ ] Uso conciliado, custos identificados como medidos/estimados/desconhecidos.
- [ ] Auditoria de alterações, retenção, exportação e alertas.

## E6/E7 — Funcionalidades adicionais e operação

- [x] Playground de texto pela API pública, usando chave e permissões do cliente; inferência real depende de credencial Lovable.
- [ ] Mídia/jobs somente quando validados; isolamento e expiração.
- [ ] Token Saver opcional e medido, sem alterar instruções/ferramentas.
- [ ] Backup externo, restauração isolada e retorno de deploy ensaiados.
- [x] Backup local das contas administrativas com restauração em diretório isolado e comparação do conteúdo; não substitui backup externo cifrado nem restauração do banco.
- [ ] Monitoramento de recursos/certificados sem afetar os demais projetos da VPS.

## Registro desta execução

- Iniciada em 22/10/2026 por solicitação do usuário.
- Acesso Git configurado no PC aponta para executável inexistente; conector GitHub não está disponível nesta sessão. Manter commits locais e tentar publicação somente por acesso existente/autorizado.
- Cadastro de remix/inferência real não será marcado como pronto com base em health check ou chaves sintéticas.

- Código E1: commit local `3264c13f9262`, implantado na VPS com a mesma tag em 22/10/2026. Etapa parcial: MFA/recuperação automatizada e múltiplas chaves/expiração continuam pendentes.
- Validação local: 31 testes da aplicação e 25 do Gator; builds Lovable e Node, tipos e smoke aprovados. Lint sem erros; avisos anteriores preservados.
- Validação HTTPS real: login/cookie seguro, sessão de leitura impedida de alterar dados ou gerir equipe, revogação de usuário, CSRF, emissão/rotação/suspensão e logout aprovados. API rejeita o verificador armazenado como credencial. Cliente temporário removido; usuário de teste desativado, mantendo auditoria.
- Reinício do servidor preservou contas e auditoria. Arquivo administrativo com permissão 600. Caminhos de autenticação administrativa por token legado e de chaves de cliente em texto desativados.
- Inventário final: os 26 containers anteriores mantêm os mesmos IDs. Os três serviços do gateway estão saudáveis; prontidão do StarChef respondeu HTTP 200.
- Publicação GitHub pendente: conector indisponível e autenticação local do GitHub CLI inválida. Os commits estão preservados no PC; a VPS foi atualizada diretamente a partir do commit isolado e testado.
- Conferência visual no navegador indisponível: controle do navegador local desativado nas configurações do Work. Verificações funcionais feitas pelos endereços HTTPS reais; não declarar revisão visual concluída.

## Auditoria funcional solicitada em 22/10/2026

- [x] Revisar os 12 itens do menu e seus handlers na versão efetivamente implantada.
- [x] Verificar HTTP público, sessão administrativa, CSRF, logout, pool e VPS sem alterar políticas de produção.
- [x] Reexecutar 31 testes da aplicação e 25 do Gator; 19 verificações do contrato do banco aprovadas.
- [x] Reproduzir localmente, sem chamadas de IA, falhas de bloqueio de modelos, autorização de mídia, quota, RPM global e configuração do modelo padrão.
- [x] Validar a chave anônima correta do banco central e registrar leituras vazias; manter auditoria SQL/RLS/grants pendente.
- [x] Conferir remix existente: HTTP 200, mas `registered: false` e exigência do segredo legado; pool central ainda vazio.
- [x] A01: aplicar bloqueio de modelo após qualquer default/alias/fallback.
- [x] A02: respeitar modelos do cliente e bloqueios globais em imagem, vídeo e embeddings.
- [x] A03/A04, proteção inicial: aplicar quota de tentativas admitidas no banco e RPM global/por cliente na instância atual.
- [ ] A03/A04, conclusão: ledger com reconciliação/estorno e RPM distribuído/persistente e simultaneidade. Buckets de RPM atuais reiniciam com o processo.
- [x] A05: refletir modelo padrão/RPM reais no formulário e na API; salvar parcialmente sem apagar bloqueios. Edição de cooldown legado explicitamente recusada.
- [ ] A06/A14: atualizar hook publicado e validar cadastro/chamada/stream reais com deadline coordenado.
- [x] A07: chat e probes legados da central retornam 410; diagnóstico central exige sessão; catálogo legado dos filhos não executa probes pagos.
- [ ] A08: implementar Uso/Custos, catálogo e roteamento reais e edição de clientes/workers.
- [ ] A09/A10: conciliar uso/logs/tentativas e testar timeout, cancelamento e failover.
- [ ] A11: MFA/recuperação, gestão de senha/sessão, interface por perfil e cabeçalhos de proteção.
- [ ] A12: auditoria completa, armazenamento consistente e restauração de backup externo cifrado.
- [ ] A13: contratos de entrada, confirmação de updates e erros/revogação tratados uniformemente.
- [ ] Revisão visual e testes de cliques, acessibilidade e responsividade quando o navegador estiver disponível.

## Primeira correção implantada — 22/10/2026

- Código: `48e3b429e209`, implantado como `zilong-gateway-parent:48e3b429e209`. Somente o serviço Node do gateway foi atualizado; Gator e proxy continuam saudáveis.
- [x] 45 testes da aplicação aprovados, incluindo regressões dos achados e concorrência na última unidade de quota; 25 testes do Gator aprovados na auditoria anterior, sem mudança no Gator nesta entrega.
- [x] Tipos, build Node, build Lovable e smoke Node aprovados; lint sem erros e com sete avisos anteriores.
- [x] HTTPS real: quota zero bloqueia texto, Messages, imagem, vídeo e embeddings; permissões de mídia e bloqueios globais impedem encaminhamento.
- [x] Banco real: com quota total 1, oito pedidos concorrentes resultaram em uma admissão e sete rejeições de quota; consumo persistido exatamente 1. Sem chave Lovable no pool/local, a chamada admitida terminou em indisponibilidade, sem geração paga.
- [x] RPM global alterado pela API efetivamente bloqueou catálogo; restaurar o limite original permitiu acesso novamente.
- [x] Alterar apenas RPM preservou a lista de modelos bloqueados; catálogo público respeitou os bloqueios; rotas legadas centrais retornaram 410.
- [x] Clientes sintéticos removidos, configurações restauradas, logout e acesso administrativo verificados. Os 26 containers anteriores mantêm IDs; StarChef readiness HTTP 200.
- [x] Painel: editar RPM/quota/modelos de cliente, permitir/bloquear modelos e distinguir configuração de disponibilidade não verificada. Uso/Custos e rotas avançadas agora informam pendência.
- [ ] Concluir as demais etapas da auditoria e validar remix/inferência reais. Esta entrega não atualiza um remix antigo publicado no Lovable.
- Detalhes de contagem e limites: [CORRECOES-POLITICAS-GATEWAY.md](docs/CORRECOES-POLITICAS-GATEWAY.md). Commit local e implantação não significam publicação no GitHub; autenticação/conector continuam pendentes.

## Painel de provedor único implantado — 22/10/2026

- [x] Código a66d32d33ce3 e correção 762c1ecb25a1; imagem ativa zilong-gateway-parent:762c1ecb25a1.
- [x] Substituir menus genéricos/repetidos por resumo, conexões Lovable, clientes, catálogo, consumo, requisições, teste de API, integração, configuração e equipe.
- [x] Busca/paginação de clientes; edição de quota/RPM/modelos/notas e ações de chaves preservadas.
- [x] Histórico paginado, filtros, request ID e CSV; chamadas autenticadas rejeitadas também geram registro. Trilha completa de tentativas/failover permanece pendente.
- [x] Consumo por período/modelo/cliente com limites de amostragem explícitos; tokens desconhecidos e custo financeiro desconhecido identificados. Conciliação financeira permanece pendente.
- [x] Banco legado exige tokens NOT NULL: armazenar -1 para desconhecido e normalizar para null na API/CSV; zero medido continua zero.
- [x] Troca da própria senha no servidor com senha atual e revogação de sessões, coberta em teste isolado; senha administrativa real preservada. MFA/recuperação continuam pendentes.
- [x] 60 testes locais, tipos e builds Node/Lovable aprovados; lint sem erros e seis avisos anteriores.
- [x] HTTPS real: cinco recursos administrativos negam acesso anônimo; cookie seguro; dez páginas HTTP 200 e seção desconhecida 404; listagem sem segredos; validação de entrada e registro inexistente 404.
- [x] Cliente descartável com quota zero: chat HTTP 429 e embeddings sem permissão HTTP 403; dois logs com IDs, duração e uso desconhecido; agregação, busca mascarada e CSV conferidos. Dados removidos.
- [x] Três serviços saudáveis, 26 containers anteriores preservados e StarChef readiness HTTP 200.
- [x] Navegador liberado nesta etapa: login, resumo, menu em tela estreita, conexões e catálogo conferidos visualmente; busca do catálogo testada. Capturas salvas. Auditoria completa de acessibilidade e de todos os formulários ainda pendente.
- [ ] Inferência, cadastro manual com chave real e remix real atualizados; pool permanece sem credenciais Lovable.
- [ ] Publicar commits no GitHub: autenticação local continua inválida e conector não disponível.

Detalhes: [PAINEL-PROVEDOR-UNICO.md](docs/PAINEL-PROVEDOR-UNICO.md). Os itens agrupados de A08–A13 acima continuam abertos porque ainda incluem conciliação, roteamento avançado, MFA, backups e demais requisitos não cobertos nesta entrega.

## Origem remixável no Lovable — preparação local em 22/10/2026

- [x] Raiz identifica o papel informado pelo servidor: central preserva administração; projeto Lovable/remix mostra painel de conexão.
- [x] Diagnóstico de credencial disponível, origem, destino e cadastro confirmado; chave permanece no backend.
- [x] Reutilizar gatilho automático existente e botão de nova tentativa, sem exigir segredo ou GitHub em cada remix.
- [x] Diagnóstico diferencia credencial ausente e domínio de prévia/local; não apresenta publicação/remix isoladamente como cadastro concluído.
- [x] 62 testes, tipos, build Lovable e build Node aprovados; lint sem erros e seis avisos anteriores.
- [x] Conferir tela local no navegador e URL de destino; sem envio de chave real ou chamada paga.
- [x] Especificar os 16 modelos desejados com nossos endereços públicos, aliases e diferenças da implementação atual.
- [ ] Sincronizar os commits no GitHub e publicar a origem no Lovable; autenticação GitHub local inválida.
- [ ] Publicar/abrir remix com chave própria e verificar cadastro e inferência reais.
- [ ] Ativar catálogo novo e aliases somente após implementar Anthropic nativo, novos IDs, Responses público e ciclo de jobs de vídeo com os testes necessários.

Contrato e checklist detalhado: [ORIGEM-LOVABLE-E-CATALOGO-16.md](docs/ORIGEM-LOVABLE-E-CATALOGO-16.md). Esta preparação não alterou a versão da central rodando na VPS nem o remix antigo publicado.

## Correção do gatilho no runtime Lovable — 22/10/2026

- [x] Conferir remix oi-bright-idea-lab: código atualizado e credencial no servidor; tentativa de envio falha antes de alcançar a central.
- [x] Reproduzir TypeError de redirect:error em workerd; executar módulo de handshake com dados sintéticos: antes zero envios, corrigido um envio e confirmação do receptor de teste.
- [x] Trocar para redirect:manual e rejeitar HTTP 3xx, sem encaminhar credencial a outro destino.
- [x] Ajustar orçamentos de espera e apresentar erros conhecidos do receptor sem expor resposta arbitrária ou segredos.
- [x] 64 testes, tipos e builds Lovable/Node aprovados; lint sem erros e seis avisos anteriores.
- [ ] Confirmar republicação do remix existente com a correção, registered:true e credencial no pool da central. Não exige criar outro remix.
