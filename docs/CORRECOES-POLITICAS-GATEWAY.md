# Primeira correção da auditoria: políticas de consumo

Implementação sobre a versão implantada na VPS, preservando alterações locais anteriores ainda não revisadas. Esta entrega altera o servidor Node do gateway e seu painel; não atualiza por si só um remix já publicado no Lovable.

## Regras aplicadas

- Texto, mídia e catálogo compartilham o catálogo configurado, bloqueios globais e permissões de modelos do cliente. Default, aliases e nomes de compatibilidade são validados depois da resolução final.
- O modelo padrão vem da configuração persistida. Falha ao carregar configuração ou quota bloqueia o encaminhamento, sem recorrer a uma política permissiva.
- RPM global e por cliente são compartilhados entre os endpoints dentro da instância atual, sem usar cabeçalhos de IP como identidade do cliente. Catálogo participa do RPM, mas não consome quota de geração.
- A quota total de cliente usa compare-and-swap no banco: lê o consumo atual e só incrementa se consumo, quota e status ativo ainda forem os mesmos. Conflito repete a leitura; erro/contenda excessiva bloqueia a chamada. Requisições concorrentes não podem usar duas vezes o mesmo último espaço disponível.
- O contador representa **tentativas de geração admitidas pelo gateway**, uma por pedido, independentemente dos retries de credenciais. A reserva acontece antes de selecionar a chave Lovable. Pode consumir quota mesmo sem chave disponível, com falha de rede ou erro posterior do provedor. Não é cobrança nem contador de respostas bem-sucedidas. Não há estorno automático quando o resultado é incerto.
- RPM, quota e modelos do cliente podem ser criados/editados no painel. Zero de quota bloqueia geração; vazio significa sem limite. Nenhum modelo selecionado mantém a convenção anterior de permitir todos os modelos liberados globalmente.
- Salvar preferências altera apenas os campos enviados. Não limpa bloqueios nem redefine cooldown silenciosamente. Cooldown continua fixo no mecanismo legado; sua edição é recusada nesta etapa.
- Modelos mostram estado de configuração, com disponibilidade real explicitamente não verificada. Bloqueio/liberação na tela atualiza a política persistida.
- Rotas avançadas e Uso/Custos informam que estão pendentes, sem repetir formulários/cartões como se a função existisse. Sincronização apresenta o motivo recebido do remix e só confirma cadastro com `registered` e `worker_id`.
- Chat e probes legados são desativados na central com HTTP 410. O catálogo legado dos filhos não executa probes pagos. Diagnóstico central exige sessão administrativa.

## Limites que continuam abertos

- A quota é persistida e sua admissão é atômica no banco; **não existe ainda um ledger de reservas com reconciliação/estorno, uso por token ou recuperação de chamadas em andamento**. Não marcar E2 completa.
- Os buckets de RPM estão em memória de uma instância e reiniciam com o processo. Limite distribuído, persistência do RPM e simultaneidade continuam pendentes. Não escalar réplicas com promessa de RPM global distribuído.
- Telemetria detalhada, custo, backup externo, MFA e inferência real ainda exigem suas próprias entregas. A alteração remove o incremento antigo duplicado de Messages, mas não conclui a conciliação de tokens.
- Persistência de bloqueios e edição no painel não comprovam disponibilidade de modelo no provedor.
- O pool vazio e o hook legado do remix precisam de atualização/publicação no Lovable para completar a integração real.

## Validação e implantação

Verificações de regressão cobrem modelos desabilitados em default/fallback/aliases, configuração parcial, RPM compartilhado, quota zero/esgotada, concorrência na última unidade, recarga da política, falha do banco, restrições nas três modalidades e bloqueio das rotas legadas. Testes e build são realizados em cópia isolada do código escolhido para publicação. O checklist diferencia validação local e confirmação na VPS.

Implantado em 22/10/2026: commit `48e3b429e209`, imagem de mesmo sufixo. 45 testes da aplicação aprovados; builds Node/Lovable, tipos, lint e smoke aprovados. Em HTTPS real, quota zero bloqueou cinco rotas, restrições de modelo foram respeitadas e uma unidade de quota admitiu apenas um de oito pedidos concorrentes. Como o pool/local estavam sem chave Lovable, essa admissão terminou em indisponibilidade e não consumiu crédito do provedor. RPM global e preservação dos bloqueios foram testados e os valores originais restaurados. Clientes sintéticos foram removidos. StarChef e os 26 containers anteriores permaneceram saudáveis/inalterados.
