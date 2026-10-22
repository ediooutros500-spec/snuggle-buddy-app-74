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
- [ ] Reservas de quota atômicas, reconciliação e recuperação após falha.
- [ ] Limites compartilhados por cliente, chave e simultaneidade.
- [ ] Deadline/cancelamento/streaming e failover seguro testados.

## E3 — Pool

- [ ] Gestão real de projetos, credenciais, validação e estados.
- [ ] Cooldown, prioridade e circuit breaker visíveis e efetivos.
- [ ] Diagnóstico do cadastro automático e políticas centrais opcionais.

## E4 — Painel, modelos e rotas

- [ ] Páginas administrativas com URLs próprias.
- [ ] Catálogo único persistido e capacidades verificadas.
- [ ] Formulários distintos e políticas de roteamento com simulação.
- [x] Substituir indicadores estáticos de segurança pela gestão de equipe/auditoria e corrigir contagem de clientes ativos.

## E5 — Uso e observabilidade

- [ ] Logs paginados, request ID e histórico de tentativas.
- [ ] Uso conciliado, custos identificados como medidos/estimados/desconhecidos.
- [ ] Auditoria de alterações, retenção, exportação e alertas.

## E6/E7 — Funcionalidades adicionais e operação

- [ ] Playground pela mesma API, sem ignorar permissões.
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
- [ ] A01: aplicar bloqueio de modelo após qualquer default/alias/fallback.
- [ ] A02: respeitar modelos do cliente e bloqueios globais em imagem, vídeo e embeddings.
- [ ] A03/A04: fazer cumprir quota e RPM global/por cliente, com reservas e limites compartilhados.
- [ ] A05: refletir configurações reais no formulário e na API; impedir que salvar apague bloqueios.
- [ ] A06/A14: atualizar hook publicado e validar cadastro/chamada/stream reais com deadline coordenado.
- [ ] A07: retirar ou proteger caminhos legados de chat, probes e diagnóstico.
- [ ] A08: implementar Uso/Custos, catálogo e roteamento reais e edição de clientes/workers.
- [ ] A09/A10: conciliar uso/logs/tentativas e testar timeout, cancelamento e failover.
- [ ] A11: MFA/recuperação, gestão de senha/sessão, interface por perfil e cabeçalhos de proteção.
- [ ] A12: auditoria completa, armazenamento consistente e restauração de backup externo cifrado.
- [ ] A13: contratos de entrada, confirmação de updates e erros/revogação tratados uniformemente.
- [ ] Revisão visual e testes de cliques, acessibilidade e responsividade quando o navegador estiver disponível.
