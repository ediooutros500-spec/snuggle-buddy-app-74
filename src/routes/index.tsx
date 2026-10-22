import { createFileRoute } from "@tanstack/react-router";
import { GatewayAdmin } from "@/components/gateway-admin";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Lovable Gateway · Administração" }] }),
  component: () => <GatewayAdmin section="overview" />,
});
