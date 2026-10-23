import { useState } from "react";
import { MCP_APPS, MCP_CATALOG, mcpPrompt } from "@/lib/mcp-catalog";
export function McpCatalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [app, setApp] = useState(MCP_APPS[0] ?? "Claude Code");
  const [selected, setSelected] = useState(MCP_CATALOG[0]!.id);
  const [message, setMessage] = useState("");
  const entry = MCP_CATALOG.find((x) => x.id === selected)!;
  const items = MCP_CATALOG.filter(
    (x) =>
      (!category || x.category === category) &&
      `${x.name} ${x.category} ${x.trial}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <div className="ag-stack">
      <section className="ag-panel">
        <h2>Conectores MCP</h2>
        <p>
          30 guias de conexão. Cada cliente conecta suas próprias contas na IDE ou CLI. Os modelos
          usam nossa API; o aplicativo executa as ferramentas.
        </p>
        <p className="ag-note">
          Catálogo documentado em 23/10/2026. As conexões destes 30 serviços ainda não foram
          validadas de ponta a ponta com nossa API. Esta lista é uma seleção inicial, sem ranking de
          uso.
        </p>
        <div className="ag-actions">
          <input
            aria-label="Pesquisar conectores"
            placeholder="Pesquisar conector ou tarefa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Categoria MCP"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {[...new Set(MCP_CATALOG.map((x) => x.category))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <a href="/mcp/guias.md" target="_blank" rel="noreferrer">
            Abrir os 30 prompts para compartilhar
          </a>
        </div>
      </section>
      <section className="ag-panel">
        <h2>Escolha um conector ({items.length})</h2>
        <div className="ag-actions">
          {items.map((x) => (
            <button
              type="button"
              key={x.id}
              aria-pressed={selected === x.id}
              onClick={() => {
                setSelected(x.id);
                setMessage("");
              }}
            >
              {x.name}
            </button>
          ))}
        </div>
        {!items.length && <p>Nenhum conector encontrado.</p>}
      </section>
      <section className="ag-panel">
        <h2>{entry.name}</h2>
        <p>
          {entry.category} · Documentado · Teste real pendente
          {entry.reference ? " · Implementação de referência" : ""}
        </p>
        <p>Teste sugerido: {entry.trial}.</p>
        <label>
          Aplicativo{" "}
          <select
            value={app}
            onChange={(e) => {
              setApp(e.target.value);
              setMessage("");
            }}
          >
            {MCP_APPS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <p>
          Copie o prompt e envie ao assistente da sua IDE ou CLI. Ele deve consultar o guia do
          mantenedor e configurar a conexão no seu ambiente.
        </p>
        <pre className="ag-code">{mcpPrompt(entry, app)}</pre>
        <div className="ag-actions">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(mcpPrompt(entry, app));
                setMessage("Prompt copiado.");
              } catch {
                setMessage("Não foi possível copiar. Selecione o texto acima.");
              }
            }}
          >
            Copiar prompt
          </button>
          <a href={entry.url} target="_blank" rel="noreferrer">
            Guia do mantenedor
          </a>
        </div>
        <p role="status">{message}</p>
      </section>
      <section className="ag-panel">
        <h2>Como validar</h2>
        <ol>
          <li>Configurar a conexão no aplicativo e autorizar a conta do cliente.</li>
          <li>Confirmar que as ferramentas aparecem no aplicativo.</li>
          <li>Solicitar o teste sugerido usando um modelo da nossa API.</li>
          <li>
            Confirmar que o aplicativo executou a ferramenta e que o modelo respondeu após receber o
            resultado.
          </li>
        </ol>
        <p>
          A central registra requisições ao modelo. A conexão direta com o MCP é diagnosticada no
          aplicativo. Os clientes também podem configurar outros MCPs compatíveis.
        </p>
      </section>
    </div>
  );
}
