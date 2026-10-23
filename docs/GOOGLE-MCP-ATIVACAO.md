# Ativação dos seis conectores Google

23/10/2026. Gmail, Drive, Calendar, Docs, Sheets e Slides têm endpoints oficiais e configurador implementado. Ainda não ativados: o usuário informou que não tem aplicativo OAuth. Não inserir Client IDs fictícios nem reutilizar credenciais de aplicativos de terceiros.

## Requisitos externos

1. A documentação atual exige participação no Google Workspace Developer Preview Program. Confirmar elegibilidade e liberação do projeto antes do teste. Habilitar APIs não garante liberação do preview.
2. Criar/selecionar um projeto Google Cloud para o Gateway MCP.
3. Habilitar as APIs Gmail, Drive, Calendar, Docs, Sheets e Slides, mais as seis APIs MCP correspondentes.
4. Configurar Google Auth Platform, tela de consentimento e usuários de teste. Aceitação das políticas e concessão de acesso devem ser feitas pelo titular.
5. Criar um cliente OAuth para o aplicativo, seguindo a configuração de cliente para agentes da documentação Google, e baixar seu JSON privado.
6. Se o cliente for web, registrar exatamente os seis callbacks `http://127.0.0.1:53301/callback` a `http://127.0.0.1:53306/callback`, um por conector, e baixar novamente o JSON atualizado.

Não armazenar o JSON no repositório nem enviar o segredo no chat. Ele será lido localmente pelo configurador e salvo apenas no perfil privado do Claude, como suporta a configuração OAuth Google do aplicativo. Os backups privados do perfil também contêm credenciais.

## Aplicação no computador

```powershell
node scripts/configure-desktop-mcp.mjs --connector google --google-oauth-file "CAMINHO_LOCAL_DO_JSON"
```

Sem `--apply`, apenas valida e informa os nomes a adicionar. Após conferir:

```powershell
node scripts/configure-desktop-mcp.mjs --connector google --google-oauth-file "CAMINHO_LOCAL_DO_JSON" --apply
```

Reabrir o Claude, conectar cada serviço e autorizar somente a conta pretendida. O configurador preserva a chave da API e as conexões já existentes. Não altera uma entrada Google já existente com mesmo nome ou URL: revisar conflitos antes de reaplicar.

## Supabase e Lovable

Ambos já constam no perfil ativo do computador testado: `Supabase` usa `https://mcp.supabase.com/mcp?read_only=true`; `Lovable` usa `https://mcp.lovable.dev`. Buscar esses nomes na lista do Claude. Se o aplicativo ainda não os mostra, encerrar e reabrir, confirmar que está no perfil Gateway e registrar eventual erro de carregamento. Cadastro no perfil não prova login ou execução.

## Checklist

- [x] Confirmar Supabase e Lovable no perfil ativo.
- [x] Implementar configuração dos seis endpoints Google com OAuth próprio.
- [x] Impedir aplicação com credenciais inválidas ou callbacks web incompletos.
- [ ] Confirmar acesso ao Developer Preview do Google Workspace MCP.
- [ ] Criar projeto e aplicativo OAuth, habilitar APIs e obter JSON local.
- [ ] Aplicar perfil Google e confirmar visibilidade, login e ferramenta por serviço.

Fontes oficiais: https://developers.google.com/workspace/guides/configure-mcp-servers e https://claude.com/docs/third-party/claude-desktop/configuration#managedmcpservers
