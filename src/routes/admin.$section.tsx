import { createFileRoute, notFound } from "@tanstack/react-router";
import { GatewayAdmin } from "@/components/gateway-admin";
import { ADMIN_SECTIONS } from "@/components/gateway-navigation";
export const Route = createFileRoute("/admin/$section")({
  beforeLoad: ({ params }) => {
    if (!ADMIN_SECTIONS.some((s) => s.id === params.section)) throw notFound();
  },
  head: () => ({ meta: [{ title: "Lovable Gateway · Administração" }] }),
  component: AdminPage,
});
function AdminPage() {
  return <GatewayAdmin section={Route.useParams().section} />;
}
