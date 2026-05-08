import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  FileText,
  Sparkles,
  Settings,
  Award,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Promotions", url: "/promotions", icon: GraduationCap },
  { title: "All Candidates", url: "/candidates", icon: Users },
  { title: "Graduates", url: "/graduates", icon: Award },
  { title: "Reports & Exports", url: "/reports", icon: FileText },
  { title: "AI Advisor", url: "/ai-advisor", icon: Sparkles, soon: true },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            N
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-foreground">CarrerHub</span>
            <span className="text-[10px] text-muted-foreground">by CMH Cloud Marketing Hub</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)}>
                    <Link to={it.url} className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      <span className="flex-1">{it.title}</span>
                      {it.soon && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                          Soon
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
