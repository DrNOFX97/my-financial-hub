import {
  LayoutDashboard,
  Receipt,
  Wallet,
  BarChart3,
  Calendar,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  CreditCard,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Faturas & Recibos", url: "/faturas", icon: Receipt },
  { title: "Gastos Mensais", url: "/gastos-mensais", icon: Wallet },
  { title: "Extrato Bancário", url: "/extrato", icon: CreditCard },
];

const analysisItems = [
  { title: "Gráficos", url: "/graficos", icon: BarChart3 },
  { title: "Receitas", url: "/receitas", icon: TrendingUp },
  { title: "Despesas", url: "/despesas", icon: TrendingDown },
];

const toolsItems = [
  { title: "Calendário", url: "/calendario", icon: Calendar },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Definições", url: "/definicoes", icon: Settings },
];

function SidebarSection({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: typeof mainItems;
  collapsed: boolean;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-muted uppercase text-xs tracking-wider font-medium">
        {!collapsed && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="hover:bg-sidebar-accent transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">
                FinGestão
              </h2>
              <p className="text-[10px] text-sidebar-muted">Gestão Económica</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSection label="Principal" items={mainItems} collapsed={collapsed} />
        <SidebarSection label="Análise" items={analysisItems} collapsed={collapsed} />
        <SidebarSection label="Ferramentas" items={toolsItems} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-muted text-center">
            v1.0 · FinGestão
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
