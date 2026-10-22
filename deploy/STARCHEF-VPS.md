# Gateway na mesma VPS do StarChef

**Acessos públicos atuais:** painel `https://secretsof.delvertokens.store` e base da API `https://api.delvertokens.store/v1`. DNS e HTTPS reaproveitados do OmniRoute; independem do túnel local.

Destino escolhido pelo usuário em 22/10/2026: reutilizar a VPS do StarChef. O acesso é SSH direto, com chave privada já existente no computador do operador. A Hostinger não é necessária para acessar esta VPS; sua conexão não bloqueia a implantação. O usuário esclareceu que a Hostinger é usada apenas para o site.

Conexão SSH comprovada em 22/10/2026, com conferência estrita da chave do servidor. Containers `starchef-cloud` e OpenResty existentes identificados; backend e Redis do StarChef saudáveis. A documentação operacional existente usa `starchef.daataflow.com` e runtime `/opt/starchef/runtime`. Endereço SSH e chave privada ficam nos registros privados do operador, fora do repositório público.

## Configuração preparada

Use exclusivamente `deploy/compose.shared-vps.yml` para esta implantação. Ele cria o projeto independente `zilong-gateway-shared`, sem disputar as portas públicas 80/443. Portas loopback 4430 (painel/compatibilidade) e 4431 (Gator) confirmadas livres na inspeção. A porta 20128 já está ocupada por outro serviço: não usá-la no host. Reconfirmar antes do início; as portas podem ser alteradas por `PARENT_LOOPBACK_PORT` e `GATOR_LOOPBACK_PORT`.

Inspeção de leitura: aproximadamente 2 GiB de memória disponível e 15 GiB de disco livre, com 85% de ocupação e uso de swap. É capacidade inicial para avaliar o runtime limitado, não garantia sob carga. Construir as imagens fora da VPS e transferir somente os artefatos necessários; não executar limpeza global do Docker.

O runtime é `/opt/zilong-gateway/runtime`, separado do StarChef. Os três containers usam usuário sem privilégios, sistema de arquivos somente leitura, limites de memória/CPU e logs limitados. O limite de memória total é 576 MiB; não comprova capacidade livre sob carga. As imagens foram construídas fora da VPS.

Não execute os perfis Caddy `https` ou `ip-check` do Compose de hospedagem dedicada nessa VPS: o proxy existente já ocupa as portas públicas. Não altere o Compose, banco, credenciais ou certificados do StarChef para implantar o gateway.

## Verificações antes de ativar

1. Acesso SSH direto confirmado; não é necessário reconectar a Hostinger.
2. Memória, disco, carga, containers e portas conferidos por comandos de leitura. Repetir a inspeção imediatamente antes de ativar os containers.
3. Preparar diretório e imagens do gateway, preservando segredos somente no runtime privado. O Supabase do gateway continua sendo o seu banco central próprio.
4. Validar a configuração sem mostrar segredos:

```sh
docker compose -f deploy/compose.shared-vps.yml config --quiet
```

5. Subir somente o projeto independente do gateway e conferir health local e administração sem token recusada. Não modificar a stack do StarChef.
6. Definir os dois novos subdomínios para painel e API. Adicionar vhosts próprios no OpenResty existente, com DNS e certificados próprios, após inspecionar sua rede e configuração reais. O endereço exato dos upstreams depende de o proxy rodar no host ou em container; não assumir que seu loopback é o loopback do host.
7. No host da API, encaminhar `/health` e `/api/public/v1/workers/register` ao Gator. Temporariamente `/v1/*` deve apontar para `/api/public/v1/*` do pai, como ponte de compatibilidade. Desativar buffering e ajustar timeout nas rotas com streaming. Testar a configuração antes de recarregar somente o proxy.
8. Configurar a URL HTTPS pública uma vez no template Lovable, publicar e visitar um projeto real. Conferir cadastro, cifra e uma chamada upstream.
9. Conferir novamente a saúde do StarChef e dos demais serviços. Para retorno, remover somente os vhosts e containers deste projeto; não executar operações de limpeza global do Docker.

## Instalação inicial (histórico)

**Instalado e rodando na VPS em 22/10/2026**, por autorização do usuário. Projeto `zilong-gateway-shared` no runtime `/opt/zilong-gateway/runtime`. Imagens Linux construídas no computador e transferidas por SSH: `zilong-gateway-parent:ea2e83fbb037` e `zilong-gator:ea2e83fbb037`. Código equivalente publicado no commit `edff5af7811924501be1fc9f087cb997d0ed70f1`. Arquivo de imagens verificado por SHA-256 antes do carregamento; preservado em `/opt/zilong-gateway/releases/ea2e83fbb037`.

Validação Compose com os arquivos de ambiente efetivos aprovada. Credenciais separadas, arquivos com permissão 600, somente o runtime central possui service role. Containers saudáveis, usuário sem privilégios, filesystem somente leitura, reinício `unless-stopped` e limites de 384/128 MiB conferidos. Portas publicadas exclusivamente em `127.0.0.1:4430` e `127.0.0.1:4431`.

Verificações reais aprovadas:

- Home, health do pai e health do Gator: HTTP 200; papel central confirmado.
- Administração sem token: HTTP 401; com token: HTTP 200 e leitura do Supabase aprovada.
- Catálogo autenticado e consulta do pool: HTTP 200.
- Origem inválida recusada pelo Gator com HTTP 400 antes de chamar o upstream.
- Pool e clientes vazios: nenhuma chave Lovable real cadastrada e nenhuma chamada de IA consumida nesta verificação.
- StarChef readiness: HTTP 200 antes e depois; backend saudável. IDs dos 26 containers anteriores preservados, sem recriação dos demais projetos.

Acesso provisório neste computador por túnel SSH: painel em `http://127.0.0.1:34430` e health do Gator em `http://127.0.0.1:34431/health`. O transporte até a VPS é cifrado pelo SSH; essas URLs são locais, não acessíveis pelos remixes. O túnel dura enquanto o processo SSH e este computador estiverem ativos.

Continuam pendentes os dois subdomínios, DNS/certificados/rotas no proxy compartilhado, URL HTTPS herdada no template e registro de um projeto Lovable real. O motor unificado e as quotas concorrentes do gateway são pendências separadas da hospedagem. Instalação e health aprovados não significam plano completo nem validação de tráfego de IA real.

## Estado atual: painel e API separados — 22/10/2026

Atualização `fedcdf418cb6` ativa e verificada. Código publicado em `5850a9969e292431ec0e7be00702d0eac413364a`. O painel continua em loopback 4430; a nova entrada da API ocupa loopback 4431. O Gator passou a ficar somente na rede interna Docker. O túnel existente fornece painel em `http://127.0.0.1:34430` e base da API em `http://127.0.0.1:34431/v1`.

O painel mostra a URL base em **Endpoints** e gera chaves de cliente em **Clientes e API keys**. `PARENT_PUBLIC_URL` e `API_PUBLIC_URL` apontam provisoriamente para os acessos do túnel. Isso não configura um endereço público para os remixes.

Teste real aprovado: criação de chave pelo painel, consulta autenticada de modelos pela entrada da API, recusa de chave inválida/ausente, acesso administrativo com chave de cliente recusado, caminhos administrativos no host da API retornando 404, suspensão bloqueando a chave. Chat e Messages aceitaram a autenticação e recusaram o payload de teste vazio com 400 antes de chamar o upstream. O cliente temporário foi removido e a remoção foi conferida no banco. Nenhuma inferência de IA foi executada.

Os três containers estão saudáveis. StarChef readiness permaneceu HTTP 200. A primeira tentativa do proxy retornou automaticamente à versão anterior por uma capacidade Linux incompatível com a restrição do container; a imagem foi corrigida removendo a capacidade de porta privilegiada, mantendo usuário sem privilégios, `cap_drop: ALL` e `no-new-privileges`. Validação local nessas mesmas condições aprovada e incluída no CI.

Backups da configuração anterior e scripts privados de ativação/verificação estão em `/opt/zilong-gateway/releases/fedcdf418cb6`. A versão anterior permanece disponível. A ponte de compatibilidade continua no pai; isso não conclui o motor unificado, quotas concorrentes, HTTPS público ou cadastro real de remixes. Fluxo de uso em [PAINEL-E-API.md](../docs/PAINEL-E-API.md).

## Ativação dos hosts públicos do OmniRoute — 22/10/2026

Por instrução do usuário, os dois hosts existentes foram redirecionados para o novo gateway: `secretsof.delvertokens.store` para loopback 4430 e `api.delvertokens.store` para 4431. Ambos já apontavam para a VPS. Certificados existentes conferidos, válidos até 22/12/2026. Não houve alteração de DNS, emissão de certificado ou substituição de chave privada.

Vhosts versionados em `deploy/openresty/`. Backup privado dos vhosts anteriores e ambientes do gateway em `/opt/zilong-gateway/releases/public-hosts-20261022/before`. A configuração completa do OpenResty passou em `nginx -t` antes da recarga graciosa. O container do proxy e os containers/dados do OmniRoute foram preservados. A inspeção mostrou que o OmniRoute ainda estava executando; somente esses dois endereços públicos mudaram de destino. O host `omni.dataiaorder.fun` e os demais projetos não foram alterados.

Ambiente efetivo atualizado: `PARENT_PUBLIC_URL=https://secretsof.delvertokens.store`, `API_PUBLIC_URL=https://api.delvertokens.store` e `GATOR_PUBLIC_URL=https://api.delvertokens.store`. As imagens continuam na versão `fedcdf418cb6`; essa etapa alterou configuração operacional e o template dos remixes.

Verificação por HTTPS público com validação TLS, sem seguir redirects: painel/health/API HTTP 200, chave temporária criada pelo painel e aceita em `/v1/models`, chave de cliente recusada na administração, caminhos administrativos no host de API HTTP 404, suspensão recusando a chave, rota pública de registro alcançando o Gator e recusando origem inválida antes do upstream. Cliente temporário removido e ausência conferida. Nenhum crédito de IA consumido. StarChef readiness HTTP 200 após a troca.

`src/lib/central-address.ts` agora contém o endereço público herdável. O teste de ambiente vazio confirma que uma variável vazia não apaga esse endereço. Ainda falta publicar essa versão do projeto de origem no Lovable e registrar um remix real; o remix antigo `oi-kindred-connection.lovable.app` usa o gatilho anterior e não recebe mudanças retroativas. Não exigir GitHub dos filhos. Motor unificado, quotas concorrentes e inferência real permanecem pendentes.
