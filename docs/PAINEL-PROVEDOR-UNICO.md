# Painel administrativo de um provedor — Lovable

A interface foi refeita para a operação de **um único provedor**, o Lovable AI Gateway. Organização inspirada nas áreas de contas, chaves, uso e integração do [OmniRoute](https://github.com/diegosouzapw/OmniRoute/blob/main/docs/guides/FEATURES.md) e [9Router](https://github.com/decolua/9router), com implementação própria. Não é um fork nem promete reproduzir todos os recursos desses produtos.

## Páginas e ações

| Endereço | Conteúdo administrativo |
|---|---|
| `/admin/overview` | Conexões elegíveis, clientes, atividade e diagnóstico do banco/pool |
| `/admin/connections` | Cadastrar chave Lovable com validação mínima upstream; identificar conta/workspace; editar limite diário; desativar/retomar; solicitar cadastro de projeto com diagnóstico real |
| `/admin/clients` | Busca/paginação, criar/editar cliente, quota/RPM/modelos/notas, emitir/rotacionar chave única e suspender acesso |
| `/admin/models` | Catálogo único, busca/modalidade, bloqueio global e escolha do padrão de texto; disponibilidade não presumida |
| `/admin/usage` | Período de 1/7/30/90 dias, requisições, erros e tokens registrados por modelo/cliente; uso desconhecido identificado |
| `/admin/requests` | Histórico paginado com período/status/modelo/cliente, request ID, erro, credencial mascarada e CSV com proteção contra fórmulas |
| `/admin/playground` | Teste real de texto pela API pública, com chave de cliente informada na sessão, suas permissões e limites |
| `/admin/integration` | URL base, protocolos compatíveis, endpoints e exemplo copiável de requisição |
| `/admin/settings` | RPM global e modelo padrão efetivos; seleção de credenciais e diagnóstico da instalação |
| `/admin/team` | Própria senha para qualquer perfil; gestão de equipe e auditoria para administrador |

A raiz `/` também abre o resumo. Endereços de seção desconhecidos retornam 404. Todas as páginas exigem sessão para carregar dados; toda alteração é validada no servidor e depende do perfil e da origem.

As áreas “Rede pai/filhos”, “Workers”, formulários repetidos e menus de funcionalidades indisponíveis foram retirados. O cadastro por remix passou a ser uma ferramenta dentro de **Conexões Lovable**. Não há seletor de outros provedores, tela comercial, preço fictício ou combinação entre provedores.

## Dados e segurança

Recursos administrativos por finalidade: `/api/admin/system`, `/credentials`, `/clients`, `/requests`, `/usage` e `/password`. O endpoint legado administrativo de clientes/configuração permanece compatível para as operações já entregues. Metadados do provedor são selecionados sem chave/cifra/hash completos. A chave Lovable cadastrada manualmente é validada apenas no endereço fixo upstream e salva pela RPC de cifra existente; nunca é devolvida pela listagem. Cadastro automático sem segredo por remix permanece disponível.

O novo registro de requisições inclui erros de política autenticados, ID, duração e tokens quando o provedor os informa. Texto grava ao concluir resposta/stream; mídia acompanha o término/cancelamento do body sem carregá-lo inteiro em memória, com uso desconhecido quando não é interpretado. Não incrementa novamente o contador de quota de clientes. Prompts/respostas e segredos não são registrados nessa trilha.

Compatibilidade com o banco central existente: suas colunas de tokens exigem NOT NULL. Novos registros usam -1 exclusivamente como marcador de consumo desconhecido; listagem, CSV e agregações convertem o marcador para null/desconhecido e não o somam como consumo. Um valor medido de zero permanece zero. A correção não exige alterar o esquema em produção.

Troca da própria senha exige sessão, origem permitida, senha atual e nova senha mínima de 14 caracteres. Ela só altera a conta autenticada e revoga suas sessões anteriores. Gestão de outras contas permanece exclusiva de administrador.

## Limites explícitos

- O relatório de uso agrega até 2.000 registros recentes no período e identifica quando há amostragem; o histórico é paginado e o CSV exporta até 1.000 linhas da página/faixa solicitada. Não apresenta amostra como todo o banco.
- Preço/custo financeiro continua desconhecido sem dados conciliados do provedor. Contadores de tentativas admitidas e de seleções de credenciais não equivalem a cobrança financeira.
- A validação manual de chave faz uma chamada mínima e pode consumir crédito; é explícita e limitada. Uma chave válida de usuário é necessária para comprovar geração de IA de ponta a ponta.
- Quota atômica por tentativas permanece como entregue na correção anterior; ledger/estorno, RPM distribuído, MFA, recuperação automatizada e backup externo seguem no checklist.
- A entrega não altera automaticamente um remix antigo publicado no Lovable nem exige que ele esteja conectado ao GitHub.
- Cadastro manual real, inferência/streaming com provedor real e auditoria SQL completa não devem ser declarados verificados apenas com mocks, health, build ou metadados.

## Conferência

Validar antes da liberação: 10 URLs; acesso anônimo negado; cadastro e edição de cliente; quota e permissões preservadas; conexão sintética sempre desabilitada; alteração de rótulo/limite; histórico, consumo e CSV com chamada rejeitada real; limpeza dos registros sintéticos; demais serviços da VPS inalterados. Verificação visual deve usar a interface real e registrar limitações caso o navegador não esteja disponível.

Entrega implantada em 22/10/2026: commits locais `a66d32d33ce3` e `762c1ecb25a1`, imagem do painel `zilong-gateway-parent:762c1ecb25a1`. Os 60 testes da aplicação, tipos e builds Node/Lovable passaram; lint sem erros e seis avisos anteriores. HTTPS validou dez páginas e 404 para seção inexistente, cinco recursos protegidos, login/logout, projeção segura de credenciais, validação de entrada, cliente com quota zero, dois registros de rejeição autenticada, request ID, agregação de uso desconhecido, busca e CSV. Cliente e logs de teste removidos. Os 26 containers anteriores mantiveram IDs e StarChef respondeu readiness 200.

Cadastro manual com chave Lovable válida, alteração de rótulos/limite em conexão real e inferência não foram executados em produção: o pool está vazio. A cobertura dessas alterações de conexão e da troca da própria senha é isolada; não equivale a teste com provedor real. GitHub continua pendente por autenticação local inválida.
