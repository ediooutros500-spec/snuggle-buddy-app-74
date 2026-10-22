# Erro "Failed to copy Supabase resources" no Remix

## Causa
A Lovable está passando por um problema na plataforma agora (desde 17:12 UTC): "configurar banco de dados em projetos novos e fazer remix pode falhar para alguns usuários". Acompanhe em https://status.lovable.dev.

Esse erro acontece na cópia do remix, feita pela plataforma, e não no código deste projeto. O código, os segredos e o banco deste projeto pai não foram afetados e não precisam de mudança.

## O que fazer
1. Aguardar até a página de status mostrar o incidente como resolvido.
2. Apagar o remix que falhou, se ele foi criado pela metade (ficou sem banco/funções).
3. Fazer o remix de novo uma única vez.
4. Se der certo, abrir o remix publicado para confirmar que ele está funcionando.
5. Se falhar de novo depois que o incidente for resolvido, me mande a mensagem de erro e eu investigo o projeto.

## O que não fazer
- Não alterar o código, os segredos nem as configurações de login por causa desse erro.
- Não ficar tentando o remix várias vezes durante o incidente (isso só gasta créditos).

## Detalhes técnicos
Nenhum arquivo será alterado. O handshake do filho (envio da chave para o pai) continua dependendo de um remix concluído com sucesso, então só vale testar depois que a cópia funcionar.
