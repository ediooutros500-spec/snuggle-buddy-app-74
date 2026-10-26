import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({ component: Home });
function Home() {
  return (
    <main>
      <p>Projeto remixável</p>
      <h1>Seu projeto começa aqui</h1>
      <p>
        Esta interface pode ser substituída pelo seu aplicativo. A conexão com a central é executada
        no servidor usando a credencial de IA do próprio projeto.
      </p>
      <p>Nenhuma chave é exibida ou enviada ao navegador.</p>
    </main>
  );
}
