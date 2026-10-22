# Painel administrativo e API de clientes

O gateway tem dois endereços distintos:

| Acesso                | Quem usa                                             | Função                                                                     |
| --------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Painel administrativo | Operador, com token administrativo                   | Criar e suspender chaves de clientes, acompanhar pool, uso e configurações |
| API, base `/v1`       | Aplicativos, com a chave de cliente criada no painel | Consultar modelos e enviar pedidos de IA                                   |

O cliente recebe a URL base da API e sua chave `gw_...`. Usa `Authorization: Bearer SUA_CHAVE` ou `x-api-key`. A chave administrativa não deve ser entregue ao cliente. A `LOVABLE_API_KEY` é outra credencial, usada somente pelo servidor ao acessar o upstream.

## Fluxo

1. O operador abre o painel e entra com o token administrativo.
2. Em **Clientes e API keys**, informa o nome e cria uma chave.
3. Em **Endpoints**, copia o endereço completo da API.
4. O aplicativo usa essa URL e a chave de cliente. O gateway autentica o cliente e seleciona uma chave Lovable do pool.
5. Suspender o cliente no painel bloqueia novas chamadas com essa chave.

Exemplo, quando houver domínio HTTPS:

```sh
curl https://SUA_API/v1/models \
  -H 'Authorization: Bearer SUA_CHAVE_DE_CLIENTE'
```

## Implantação na VPS compartilhada

`parent` publica somente o painel/servidor de compatibilidade em loopback 4430. `api` publica a entrada de clientes em loopback 4431. `gator` fica somente na rede interna Docker, responsável pelo registro das chaves Lovable. O serviço `api` bloqueia caminhos administrativos e encaminha `/v1/models`, `/v1/chat/completions`, `/v1/messages` e os caminhos de mídia existentes para o servidor de compatibilidade. O cadastro de projetos segue para o Gator, preservando streaming nas rotas de IA.

`PARENT_PUBLIC_URL` e `API_PUBLIC_URL` configuram os endereços mostrados no painel. `API_PUBLIC_URL` deve conter somente a origem, sem `/v1`; a interface acrescenta esse prefixo. `GATOR_PUBLIC_URL`/`CENTRAL_REGISTRATION_ORIGIN` destinam-se ao cadastro dos remixes e precisam do endereço público HTTPS da API.

Os endereços provisórios por túnel SSH são `http://127.0.0.1:34430` (painel) e `http://127.0.0.1:34431/v1` (API). Só funcionam neste computador enquanto o túnel estiver ativo. Os dois subdomínios, DNS e certificados públicos ainda precisam ser definidos e ativados.

## Limites da etapa

O catálogo aceita clientes ativos e respeita sua lista de modelos; clientes suspensos ou chaves inválidas recebem 401. O host da API não publica administração. A implementação usa a ponte de compatibilidade atual; motor unificado no Gator, quotas concorrentes, inferência real e cadastro do primeiro remix permanecem pendentes. Um catálogo HTTP 200 não comprova crédito disponível nem geração de IA funcional.
