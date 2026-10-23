import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { GatewayAdmin } from "@/components/gateway-admin";
import { ADMIN_SECTIONS } from "@/components/gateway-navigation";
export const Route = createFileRoute("/admin/$section")({
  beforeLoad: ({ params }) => {
    if (params.section === "mcp") throw redirect({ href: "/admin/overview" });
    if (params.section === "requests") throw redirect({ href: "/admin/models" });
    if (params.section === "team") throw redirect({ href: "/admin/settings" });
    if (!ADMIN_SECTIONS.some((s) => s.id === params.section)) throw notFound();
  },
  head: () => ({ meta: [{ title: "Gateway · Administração" }] }),
  component: AdminPage,
});
function AdminPage() {
  return <GatewayAdmin section={Route.useParams().section} />;
}
