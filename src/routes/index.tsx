import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  Activity,
  ArrowUpDown,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Globe,
  Key,
  Layers,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Sun,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio Gateway — Enterprise AI Gateway & Key Pool" },
      {
        name: "description",
        content:
          "Open-source AI Gateway control plane inspired by shadcn Studio Admin. Client credentials, model locking, automated failovers, and analytics.",
      },
    ],
  }),
  component: DashboardPage,
});

type Client = {
  id: string;
  name: string;
  client_key: string;
  status: "active" | "suspended" | "revoked";
  allowed_models: string[] | null;
  rate_limit_rpm: number;
  quota_limit_requests: number | null;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  last_used_at: string | null;
  created_at: string;
};

type Log = {
  id: string;
  client_name: string | null;
  endpoint: string;
  requested_model: string | null;
  resolved_model: string | null;
  status_code: number;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
};

type Worker = {
  id: string;
  name: string;
  project_origin: string;
  masked_key: string;
  status: "active" | "exhausted" | "disabled";
  total_requests: number;
  last_used_at: string | null;
  last_error: string | null;
};

const ALL_AVAILABLE_MODELS = [
  "google/gemini-3.6-flash",
  "google/gemini-3.5-flash",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
  "openai/gpt-5.5",
  "openai/gpt-5.5-pro",
];

const mockChartData = [
  { time: "00:00", requests: 120, latency: 180 },
  { time: "03:00", requests: 90, latency: 165 },
  { time: "06:00", requests: 240, latency: 210 },
  { time: "09:00", requests: 780, latency: 340 },
  { time: "12:00", requests: 1120, latency: 380 },
  { time: "15:00", requests: 950, latency: 310 },
  { time: "18:00", requests: 640, latency: 250 },
  { time: "21:00", requests: 430, latency: 195 },
];

function DashboardPage() {
  const [token, setToken] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gateway_admin_token") || "";
    }
    return "";
  });

  const [activeTab, setActiveTab] = React.useState<"overview" | "clients" | "pool" | "models" | "logs">("overview");
  const [isDark, setIsDark] = React.useState(true);

  // Data states
  const [clients, setClients] = React.useState<Client[]>([]);
  const [settings, setSettings] = React.useState<any>({});
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [poolMetrics, setPoolMetrics] = React.useState({ active: 0, exhausted: 0, totalRequests: 0 });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  // Forms
  const [newClientName, setNewClientName] = React.useState("");
  const [newClientRpm, setNewClientRpm] = React.useState(60);
  const [clientSearch, setClientSearch] = React.useState("");

  const saveToken = (val: string) => {
    setToken(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("gateway_admin_token", val);
    }
  };

  const headers = React.useMemo(() => {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  const loadAll = React.useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      // 1. Load Admin Data (Clients, Settings, Logs)
      const adminRes = await fetch("/api/admin/gateway", { headers });
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        setClients(adminData.clients || []);
        setSettings(adminData.settings || {});
        setLogs(adminData.logs || []);
      } else if (adminRes.status === 401) {
        setError("Token administrativo incorreto ou não configurado.");
      }

      // 2. Load Pool Data (Workers)
      const poolRes = await fetch("/api/public/v1/workers/register");
      if (poolRes.ok) {
        const pData = await poolRes.json();
        setWorkers(pData.workers || []);
        if (pData.metrics) setPoolMetrics(pData.metrics);
      }
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar dados do gateway.");
    } finally {
      setBusy(false);
    }
  }, [headers, token]);

  React.useEffect(() => {
    if (token) {
      loadAll();
    }
  }, [token, loadAll]);

  // Actions
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      const res = await fetch("/api/admin/gateway", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newClientName.trim(),
          rate_limit_rpm: newClientRpm,
        }),
      });
      if (res.ok) {
        setNewClientName("");
        await loadAll();
      }
    } catch {
      setError("Falha ao criar cliente");
    }
  };

  const handleToggleClientStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await fetch("/api/admin/gateway", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ id, status: nextStatus }),
      });
      await loadAll();
    } catch {
      setError("Erro ao atualizar cliente");
    }
  };

  const handleToggleModel = async (modelName: string) => {
    const currentDisabled: string[] = settings.disabled_models || [];
    const isCurrentlyDisabled = currentDisabled.includes(modelName);
    const updatedDisabled = isCurrentlyDisabled
      ? currentDisabled.filter((m) => m !== modelName)
      : [...currentDisabled, modelName];

    try {
      await fetch("/api/admin/gateway", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          action: "settings",
          disabled_models: updatedDisabled,
          default_model: settings.default_model || "google/gemini-3.6-flash",
        }),
      });
      setSettings((prev: any) => ({ ...prev, disabled_models: updatedDisabled }));
    } catch {
      setError("Erro ao alterar modelo");
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.client_key.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const totalReqs = clients.reduce((acc, c) => acc + (c.total_requests || 0), 0);
  const totalTokens = clients.reduce((acc, c) => acc + (c.total_input_tokens + c.total_output_tokens || 0), 0);

  return (
    <div className={isDark ? "dark" : ""}>
      <SidebarProvider defaultOpen>
        <Sidebar variant="inset" className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
                <Bot className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm leading-tight tracking-tight">Studio Gateway</span>
                <span className="text-xs text-muted-foreground">AI Proxy & Key Mesh</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                Dashboards
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "overview"}
                      onClick={() => setActiveTab("overview")}
                    >
                      <LayoutDashboard className="size-4" />
                      <span>Overview</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "clients"}
                      onClick={() => setActiveTab("clients")}
                    >
                      <Users className="size-4" />
                      <span>Clientes & APIs</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "pool"}
                      onClick={() => setActiveTab("pool")}
                    >
                      <Database className="size-4" />
                      <span>Pool de Workers</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "models"}
                      onClick={() => setActiveTab("models")}
                    >
                      <Cpu className="size-4" />
                      <span>Trava de Modelos</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "logs"}
                      onClick={() => setActiveTab("logs")}
                    >
                      <Activity className="size-4" />
                      <span>Logs de Execução</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                Conectividade
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a href="https://github.com/ediooutros500-spec/snuggle-buddy-app-74" target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" />
                        <span>GitHub Repo</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a href="https://supabase.com" target="_blank" rel="noreferrer">
                        <Server className="size-4" />
                        <span>Supabase (qtsyuyu...)</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">AK</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 truncate text-xs">
                <span className="font-medium truncate">Edio Salvador</span>
                <span className="text-muted-foreground truncate">Admin</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setIsDark(!isDark)}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="bg-background text-foreground">
          {/* Top Navbar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-border" />
              <div className="relative w-64 lg:w-80">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar métricas, clientes..."
                  className="h-8 pl-8 text-xs bg-muted/40"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="password"
                placeholder="Token Admin"
                value={token}
                onChange={(e) => saveToken(e.target.value)}
                className="h-8 w-44 lg:w-56 text-xs bg-muted/40"
              />
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={loadAll} disabled={busy}>
                <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>
            </div>
          </header>

          {/* Main Container */}
          <div className="flex-1 p-4 lg:p-6 space-y-6 max-w-7xl">
            {error && (
              <Card className="border-destructive/50 bg-destructive/10 text-destructive text-sm p-4 flex items-center gap-3">
                <ShieldAlert className="size-5 shrink-0" />
                <span>{error}</span>
              </Card>
            )}

            {!token && (
              <Card className="border-amber-500/30 bg-amber-500/10 p-5 text-sm">
                <div className="flex items-start gap-3">
                  <Shield className="size-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-600 dark:text-amber-400">Autenticação Administrativa Necessária</h4>
                    <p className="text-muted-foreground text-xs mt-1">
                      Insira o seu <code className="font-mono bg-muted px-1 py-0.5 rounded">CLAUDE_CODE_GATEWAY_TOKEN</code> no cabeçalho acima para desbloquear as APIs do painel, gerenciamento de clientes e telemetria.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* 4 Metric Cards no padrão Studio Admin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-xs uppercase font-medium">Requisições Atendidas</CardDescription>
                        <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Activity className="size-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight">{totalReqs.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <TrendingUp className="size-3 text-emerald-500" />
                        <span>Volume agregado</span>
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-xs uppercase font-medium">Tokens Processados</CardDescription>
                        <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Zap className="size-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight">{totalTokens.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span className="text-emerald-500 font-semibold">+18.4%</span>
                        <span>vs. semana anterior</span>
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-xs uppercase font-medium">Clientes Ativos</CardDescription>
                        <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Users className="size-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight">{clients.filter((c) => c.status === "active").length}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {clients.length} credenciais emitidas
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-xs uppercase font-medium">Pool de Workers</CardDescription>
                        <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Database className="size-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                        {poolMetrics.active} Ativos
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {poolMetrics.exhausted} em repouso (cooldown 15m)
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Chart no padrão ComposedChart do Studio Admin */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">Atividade do Gateway & Latência</CardTitle>
                        <CardDescription className="text-xs">
                          Volume de requisições por hora e tempo médio de despacho
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">Tempo Real</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={mockChartData}>
                          <defs>
                            <linearGradient id="fillReqs" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs">
                                    <div className="font-semibold">{payload[0].payload.time}</div>
                                    <div className="text-primary mt-1">Requisições: {payload[0].value}</div>
                                    <div className="text-muted-foreground">Latência: {payload[1]?.value}ms</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area type="monotone" dataKey="requests" stroke="hsl(var(--primary))" fill="url(#fillReqs)" strokeWidth={2} />
                          <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Clientes recentes & Modelos travados */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Clientes Registrados</CardTitle>
                        <CardDescription className="text-xs">Chaves com acesso ao gateway</CardDescription>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setActiveTab("clients")}>
                        Ver todos
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Chave</TableHead>
                              <TableHead>RPM</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clients.slice(0, 5).map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium text-xs">{c.name}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{c.client_key.slice(0, 12)}...</TableCell>
                                <TableCell className="text-xs">{c.rate_limit_rpm} req/m</TableCell>
                                <TableCell>
                                  <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">
                                    {c.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            {clients.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                                  Nenhum cliente cadastrado ainda.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Políticas Globais</CardTitle>
                      <CardDescription className="text-xs">Estado de operação do gateway</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0 text-xs">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Modelo Padrão</span>
                        <span className="font-mono font-medium">{settings.default_model || "gemini-3.6-flash"}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Cooldown de Chaves</span>
                        <span className="font-medium">15 minutos</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground">Rate Limit Global</span>
                        <span className="font-medium">120 RPM</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">Modelos Bloqueados</span>
                        <Badge variant="outline" className="text-[10px]">
                          {(settings.disabled_models || []).length} bloqueado(s)
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB 2: CLIENTES & APIS */}
            {activeTab === "clients" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Emitir Nova Credencial de Cliente</CardTitle>
                    <CardDescription className="text-xs">
                      Crie tokens exclusivos para limitar consumo, travar modelos e rastrear logs por cliente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateClient} className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="Nome do cliente (ex: App Mobile, Claude Terminal)"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="RPM (ex: 60)"
                        value={newClientRpm}
                        onChange={(e) => setNewClientRpm(Number(e.target.value))}
                        className="w-full sm:w-32 text-xs"
                      />
                      <Button type="submit" size="sm" className="gap-1.5 shrink-0">
                        <Plus className="size-4" />
                        Emitir Chave
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Clientes e Chaves Ativas</CardTitle>
                    <CardDescription className="text-xs">
                      Gerencie limites de taxa, revogue acessos e monitore cotas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>API Key</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>RPM</TableHead>
                          <TableHead>Consumo</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map((client) => (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium text-xs">{client.name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{client.client_key}</TableCell>
                            <TableCell>
                              <Badge variant={client.status === "active" ? "default" : "destructive"} className="text-[10px]">
                                {client.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{client.rate_limit_rpm} req/m</TableCell>
                            <TableCell className="text-xs">
                              {client.total_requests} reqs ({(client.total_input_tokens + client.total_output_tokens).toLocaleString()} tokens)
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleToggleClientStatus(client.id, client.status)}
                              >
                                {client.status === "active" ? "Suspender" : "Ativar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 3: POOL DE WORKERS */}
            {activeTab === "pool" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs uppercase">Chaves Ativas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{poolMetrics.active}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs uppercase">Chaves em Cooldown (429/402)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-500">{poolMetrics.exhausted}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs uppercase">Requisições Atendidas no Pool</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{poolMetrics.totalRequests}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Workers e Chaves Conectadas</CardTitle>
                    <CardDescription className="text-xs">
                      Lista de Remixes auto-registrados gerenciados no 2º Supabase.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Worker</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Chave</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Último Erro</TableHead>
                          <TableHead>Requisições</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workers.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium text-xs">{w.name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{w.project_origin}</TableCell>
                            <TableCell className="font-mono text-xs">{w.masked_key}</TableCell>
                            <TableCell>
                              <Badge
                                variant={w.status === "active" ? "default" : w.status === "exhausted" ? "secondary" : "destructive"}
                                className="text-[10px]"
                              >
                                {w.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{w.last_error || "Nenhum"}</TableCell>
                            <TableCell className="text-xs font-mono">{w.total_requests}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 4: TRAVA DE MODELOS */}
            {activeTab === "models" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Catálogo e Trava de Modelos</CardTitle>
                    <CardDescription className="text-xs">
                      Ative ou desative modelos individualmente. Modelos desativados são imediatamente rejeitados ou roteados para o fallback configurado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ALL_AVAILABLE_MODELS.map((modelName) => {
                        const isDisabled = (settings.disabled_models || []).includes(modelName);
                        return (
                          <div
                            key={modelName}
                            className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                              isDisabled ? "bg-muted/30 border-dashed opacity-75" : "bg-card border-border shadow-xs"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-mono font-medium">{modelName}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {modelName.startsWith("google/") ? "Google Gemini" : "OpenAI GPT"}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant={isDisabled ? "outline" : "default"}
                              className="h-7 text-xs"
                              onClick={() => handleToggleModel(modelName)}
                            >
                              {isDisabled ? "Desbloquear" : "Bloquear"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 5: LOGS */}
            {activeTab === "logs" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Chamadas Recentes</CardTitle>
                  <CardDescription className="text-xs">
                    Auditoria de requisições, endpoints acionados e latência.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quando</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Latência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{log.client_name || "Anônimo"}</TableCell>
                          <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                          <TableCell className="font-mono text-xs">{log.requested_model || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={log.status_code < 400 ? "default" : "destructive"} className="text-[10px]">
                              {log.status_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{log.latency_ms}ms</TableCell>
                        </TableRow>
                      ))}
                      {logs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                            Nenhum log gravado ainda. As chamadas registrarão eventos aqui automaticamente.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
