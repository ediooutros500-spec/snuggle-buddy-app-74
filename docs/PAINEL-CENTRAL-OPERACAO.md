# Revisão do painel central — 22/10/2026

Esta entrega reorganiza o painel da VPS. O painel remixável será tratado depois; registro automático dos projetos, credenciais criptografadas, endpoints de inferência, modelos e aliases continuam funcionando.

## Telas

- Dashboard: indicadores, tráfego/respostas, modelos mais utilizados, taxa de sucesso, latência e clientes com maior atividade. Períodos de 24 horas, 7, 15, 30 e 90 dias. Agrupamento no fuso America/Sao_Paulo; quando há apenas um dia, usa as horas registradas. Gráficos usam dados reais e sinalizam amostragem acima de 2.000 logs.
- Contas: nomes automáticos persistentes Conta 1, Conta 2 etc., sem workspace/projeto na lista. Exclusão, ativação e limite diário; não renumera contas restantes após exclusões. Um projeto que continuar executando o gatilho poderá cadastrar a credencial novamente; desativação é a opção para mantê-la bloqueada no pool.
- Clientes: validade de 1, 7, 15 ou 30 dias, ou sem expiração; modelos com busca, famílias, ícones e seleção por checkbox. Nenhuma seleção = todos os modelos globalmente permitidos. Novos clientes começam com 30 dias no formulário; clientes existentes mantêm seu prazo até edição explícita. Editar e escolher um prazo renova a partir do salvamento.
- Modelos: histórico de requisições com filtros, detalhes e exportação CSV. O catálogo separado foi removido da navegação; as permissões globais e o modelo padrão ficam em Configurações.
- Consumo: filtros por cliente/modelo, tokens de entrada/saída, erros, sucesso, latência e médias que não tratam uso desconhecido como zero. Não há valores financeiros inventados.
- Testar API: seleção de cliente e família/modelo, usando a chave desse cliente e seus limites reais. Como as chaves são armazenadas como hash, o operador precisa colar a chave emitida. O servidor confere a correspondência entre chave e cliente antes do teste; somente modelos de texto são testados.
- Integração: tutoriais separados para Claude Code, Cline, Continue, Cursor e terminal, por família de modelos, com fontes oficiais e endereços da central. Recursos de clientes que dependem de Responses público continuam limitados.
- Configurações: controles globais existentes, permissões de modelos e troca da senha atual. Equipe/auditoria saíram da interface; verificações de autorização e registros internos de alterações continuam protegidos. URLs antigas `/admin/requests` e `/admin/team` redirecionam às telas correspondentes.

Foram retirados o cabeçalho de provedor único, ADMIN CONSOLE, introdução de primeiro aplicativo, passos de onboarding, rodapé promocional, link isolado de API pública, formulário de adicionar conexão e cartão de disparo manual do registro. Isso não remove o gatilho de registro automático do servidor.

## Dispositivos e persistência

O limite usa o cabeçalho `X-Device-ID`, com identificador estável de 8 a 128 caracteres por instalação. Com trava ativa, ausência/ID inválido e novos IDs acima do limite são recusados na autenticação. A primeira utilização ocupa uma vaga, de maneira serializada nesta instância. O painel mostra quantidade, primeiro/último acesso e acessos por ID; permite liberar as vagas. Sem trava, chamadas sem ID continuam aceitas e aparecem como acessos não identificados; não são apresentadas como aparelhos. O registro de IDs sem trava guarda até 100 identificadores por cliente. A identificação é declarada pelo aplicativo, não é impressão digital de hardware e não impede que dois aparelhos compartilhem intencionalmente o mesmo ID.

Expiração e dispositivos são validados no servidor em todos os endpoints que usam a autenticação de cliente, antes da inferência. As políticas ficam em `client-access.json` no volume administrativo já persistente da VPS; as credenciais do provedor e chaves de cliente continuam no banco central. Arquivos são privados e substituídos atomicamente; a fila serializa concorrência na instância Node atual. Falha ao gravar uma nova política suspende o cliente, evitando acesso mais amplo por falha parcial. Falha de leitura impede autenticação de clientes. O cadastro automático no Lovable não usa essas restrições locais.

O backup deve incluir todo o volume administrativo, além do banco central. A trava não deve ser ativada em um IDE/CLI que não permita configurar cabeçalhos próprios. A contagem começa na implantação: não reconstruímos aparelhos a partir dos logs antigos, IPs ou user agents.

## Checklist de entrega

- [x] Remover os elementos e menus indicados, preservando endpoints e o gatilho.
- [x] Montar dashboard e detalhamento real de consumo.
- [x] Contas com identificação automática e exclusão autorizada no servidor.
- [x] Validade e seleção de modelos com famílias/ícones e opção de todos.
- [x] Implementar persistência, expiração e limite por ID de dispositivo, sem alteração de schema no Supabase.
- [x] Reorganizar histórico, configurações, senha, testes e tutoriais.
- [x] 90 testes, tipos, builds Lovable/Node e smoke aprovados; lint sem erros e seis avisos anteriores. Prévia revisada em largura de celular e desktop, com dados reais e seleção por famílias.
- [x] Código b280a9390747 enviado ao GitHub; GitHub Actions aprovado.
- [x] Volume administrativo copiado para o release privado antes da implantação. Imagem b280a9390747 saudável na VPS; oito páginas e redirecionamentos legados conferidos por HTTPS.
- [x] Doze verificações HTTPS aprovadas: exclusão de conta descartável desativada, rejeição de origem indevida, trava/ausência de ID, Claude nativo, teste OpenAI por cliente, renovação de prazo, liberação de vagas, consumo detalhado e persistência depois de reiniciar o parent. Cliente/chave temporários removidos e dois logs reais preservados.
- [x] Gator/proxy preservados e saudáveis; os 26 containers anteriores permaneceram intactos e StarChef readiness respondeu HTTP 200. Cadastro automático permanece inalterado e seus testes passaram; não foi criado um novo remix para esta revisão.
- [ ] Tratar o painel remixável em uma próxima etapa, conforme a ordem pedida.

Fontes dos tutoriais: [Claude Code](https://code.claude.com/docs/en/llm-gateway), [Cline](https://docs.cline.bot/provider-config/openai-compatible), [Continue](https://docs.continue.dev/customize/model-providers/top-level/openai), [Cursor](https://cursor.com/help/models-and-usage/api-keys). Ícones locais: Simple Icons, arquivos Anthropic e Google Gemini da revisão develop; OpenAI da versão 13.21.0, preservando os paths SVG publicados. Não são buscados por CDN no navegador.

Evidência: [verificação HTTPS](audits/central-panel-redesign-2026-10-22.json). A expiração no instante limite e a concorrência de dispositivos foram verificadas com relógio controlado nos testes locais; a VPS confirmou renovação e persistência de prazo, sem esperar dias artificiais.
