# Login, equipe e proteção das chaves

Esta etapa troca o token digitado no painel por usuário/senha e sessão. Não conclui o plano administrativo inteiro. O andamento verificável está em `CHECKLIST-ADMINISTRATIVO-GATEWAY.md`.

## Contas e sessões

- Conta inicial criada uma única vez quando o armazenamento está vazio, usando `GATOR_ADMIN_BOOTSTRAP_USERNAME` e `GATOR_ADMIN_BOOTSTRAP_PASSWORD_HASH`. Senha de no mínimo 14 caracteres, armazenada com scrypt e salt aleatório.
- Perfil administrador gerencia equipe e consulta auditoria. Operador altera clientes/pool/configuração operacional; leitura apenas consulta. A permissão é conferida no servidor.
- Cookie de sessão opaco, HttpOnly, Secure, SameSite=Strict; 30 minutos de inatividade e máximo de oito horas. Logout invalida imediatamente. Reiniciar o processo encerra todas as sessões.
- Desativar conta, mudar perfil ou senha invalida as sessões anteriores. Não é possível desativar ou rebaixar o último administrador ativo.
- Alterações por sessão exigem Origin igual a `PARENT_PUBLIC_URL`. API keys de cliente não são sessões administrativas.
- Login tem limite global e por usuário por processo. MFA, recuperação automatizada e proteção distribuída continuam pendentes.

Equipe disponível em **Segurança**. A senha inicial é entregue em arquivo privado ao operador, nunca no Git ou em logs. Depois do primeiro acesso, altere-a nessa tela. Nenhuma senha é recuperável pelo painel; só pode ser substituída.

## Persistência e recuperação operacional

Contas e auditoria ficam em `/app/data/admin/accounts.json`, volume Docker `admin_data`, com arquivo 600 e diretório 700. A imagem executa como usuário sem privilégios. Gravação por arquivo temporário e rename, operações serializadas no processo. Essa implementação admite **uma réplica do servidor administrativo**; múltiplas réplicas exigem armazenamento transacional compartilhado antes de escalar.

O JSON contém hashes de senha e até 10.000 eventos sem credenciais. Deve ser incluído no backup cifrado externo. A interface exibe os 100 eventos mais recentes. Eventos de alteração do banco e eventos locais de auditoria ainda não formam uma única transação; a etapa de telemetria/auditoria deve consolidar essa garantia. Não marcar auditoria distribuída como completa.

O bootstrap não sobrescreve contas existentes. Recuperação de último administrador exige acesso autorizado ao volume e procedimento offline com backup; excluir o volume para “recuperar” apagaria contas e auditoria e não faz parte do procedimento normal. MFA e procedimento automatizado de recuperação precisam de entrega própria.

## Chaves de cliente

As novas chaves usam 32 bytes aleatórios. O valor completo aparece apenas na resposta de criação/rotação e no aviso de cópia única. Listagens devolvem somente hint. A substituição invalida a chave anterior; suspender o cliente bloqueia todas as suas requisições.

Por compatibilidade com a autenticação existente e sem migration de schema, nesta etapa o campo legado `gateway_clients.client_key` passa a conter `gw_hash_v1:<hint-inicial>:<hint-final>:<sha256>`. Esse registro é um verificador, não é a API key e não pode autenticar requisições. Leitura por hash é prioritária; caminho de texto antigo pode ser removido depois do backfill. Campos/tabela de chaves já existentes serão consolidados na etapa de múltiplas chaves e expiração. **Ainda há uma chave por cliente**, sem expiração individual.

Migração idempotente preparada em `gator/scripts/migrate-client-key-hashes.mjs`; primeiro executar sem argumentos para diagnóstico, depois com `--apply` somente com a nova autenticação já validada. O script converte por ID e valor anterior, recusa atualização concorrente e não imprime chaves. Não executar a imagem antiga depois do backfill: ela não entende os verificadores. Para rollback operacional, preservar suporte à nova autenticação ou planejar rotação das chaves; não reintroduzir plaintext como rotina de rollback.

`GATOR_ALLOW_LEGACY_CLIENT_KEYS=false` remove o caminho de autenticação em texto após a conversão. `GATOR_ALLOW_LEGACY_ADMIN_TOKEN` é somente uma ponte explícita para ferramentas de manutenção; o padrão é false e o painel não a usa. As credenciais administrativas do Supabase e do Lovable permanecem exclusivamente no servidor.

## Validação antes de ativar

Testar: sessão/login/logout, senha errada, usuário inválido, CSRF, viewer/operador/admin, último administrador, revogação após mudança de senha e ausência de senhas/chaves nos arquivos/respostas. Depois verificar uma chave criada pelo painel na API, substituição bloqueando a antiga, suspensão e limpeza do cliente sintético. Testar restart e persistência das contas e auditoria. Health não substitui esses testes.
