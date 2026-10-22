# Execução do plano administrativo

Plano: [PLANO-ADMINISTRATIVO-GATEWAY.md](docs/PLANO-ADMINISTRATIVO-GATEWAY.md). Marcar concluído somente com evidência. Uma entrega pode estar parcialmente implementada; commit, teste local e implantação são estados distintos.

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
