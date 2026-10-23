import { createFileRoute } from "@tanstack/react-router";
import { GatewayHome } from "@/components/gateway-home";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Lovable Gateway" }] }),
  component: GatewayHome,
});
