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
- [ ] Migração compatível das chaves legadas e retirada de texto aberto.
- [ ] MFA e recuperação administrativa controlada.
- [x] Testes de autorização, CSRF, sessão revogada e vazamento de segredos.
- [ ] Build isolado, implantação e verificações reais na VPS.

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
- [ ] Remover indicadores estáticos de segurança e corrigir contadores.

## E5 — Uso e observabilidade

- [ ] Logs paginados, request ID e histórico de tentativas.
- [ ] Uso conciliado, custos identificados como medidos/estimados/desconhecidos.
- [ ] Auditoria de alterações, retenção, exportação e alertas.

## E6/E7 — Funcionalidades adicionais e operação

- [ ] Playground pela mesma API, sem ignorar permissões.
- [ ] Mídia/jobs somente quando validados; isolamento e expiração.
- [ ] Token Saver opcional e medido, sem alterar instruções/ferramentas.
- [ ] Backup externo, restauração isolada e retorno de deploy ensaiados.
- [ ] Monitoramento de recursos/certificados sem afetar os demais projetos da VPS.

## Registro desta execução

- Iniciada em 22/10/2026 por solicitação do usuário.
- Acesso Git configurado no PC aponta para executável inexistente; conector GitHub não está disponível nesta sessão. Manter commits locais e tentar publicação somente por acesso existente/autorizado.
- Cadastro de remix/inferência real não será marcado como pronto com base em health check ou chaves sintéticas.

- E1 implementada e validada localmente: 31 testes da aplicação e 25 do Gator; builds Lovable e Node, tipos e smoke aprovados. Itens marcados acima ainda aguardam confirmação na VPS nesta execução.
