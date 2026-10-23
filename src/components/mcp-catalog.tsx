import { useState } from "react";

const pilot = [
  {
    name: "Context7",
    status: "Visível no Claude",
    detail:
      "Confirmado por captura do usuário: conectado e duas ferramentas carregadas. Execução pelo modelo ainda pendente.",
  },
  {
    name: "Notion",
    status: "Autorização concluída",
    detail:
      "Usuário confirmou a conclusão do OAuth por captura de tela. Confirmar ferramentas no Claude e executar consulta de teste.",
  },
  {
    name: "GitHub",
    status: "Autorização pendente",
    detail:
      "HTTP 401. O conector embutido requer uma OAuth App própria com device flow e Client ID.",
  },
  {
    name: "Cloudflare Docs",
    status: "Protocolo verificado",
    detail:
      "initialize e tools/list: HTTP 200, duas ferramentas. Apenas documentação pública; ainda não adicionado ao aplicativo.",
  },
  {
    name: "Exa",
    status: "Protocolo verificado",
    detail:
      "initialize e tools/list: HTTP 200, duas ferramentas. Ainda não adicionado ao aplicativo.",
  },
  ...["Supabase", "Figma", "Linear", "Sentry", "Vercel"].map((name) => ({
    name,
    status: "Autorização pendente",
    detail:
      "HTTP 401 com desafio de autenticação. Conta e conexão no aplicativo ainda não validadas.",
  })),
];

export function McpCatalog() {
  const [search, setSearch] = useState("");
  const rows = pilot.filter((x) =>
    `${x.name} ${x.status}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <div className="ag-stack">
      <section className="ag-panel">
        <h2>Validação de conectores</h2>
        <p>
          Primeiro lote: 10 conectores no Claude Desktop usando nossa API de modelos. Cada cliente
          autoriza suas próprias contas pelo aplicativo.
        </p>
        <p className="ag-note">
          Registro manual do piloto em 23/10/2026, neste computador de teste. Esta página não
          acompanha sessões ou logins dos demais clientes em tempo real.
        </p>
        <div className="ag-actions">
          <input
            aria-label="Pesquisar conectores"
            placeholder="Pesquisar conector ou situação"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>
      <section className="ag-panel">
        <h2>Conectores do piloto</h2>
        <div className="ag-table-wrap">
          <table className="ag-table">
            <thead>
              <tr>
                <th>Conector</th>
                <th>Etapa</th>
                <th>Evidência e próximo passo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.name}>
                  <td>
                    <strong>{x.name}</strong>
                  </td>
                  <td>{x.status}</td>
                  <td>{x.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p>Nenhum conector encontrado.</p>}
      </section>
      <section className="ag-panel">
        <h2>Teste atual: ferramentas do Notion</h2>
        <p>
          O login foi concluído. Volte ao Claude, confira se as ferramentas do Notion aparecem e
          peça uma consulta em uma página de teste autorizada.
        </p>
        <p>
          O teste estará completo quando o aplicativo executar a ferramenta e o modelo responder com
          o resultado.
        </p>
        <p className="ag-note">
          A API de inferência não distribui esta configuração automaticamente. A distribuição para
          outros computadores será tratada após validar este piloto.
        </p>
      </section>
    </div>
  );
}
