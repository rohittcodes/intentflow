"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  FileText,
  Database,
  Link as LinkIcon,
  LogOut,
  Trash2,
  Activity,
  Settings,
  CreditCard,
  Users,
  Search,
  ScrollText,
  HelpCircle,
  Home,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/ui/DashboardSidebar";
import WorkspaceSwitcher from "@/components/ui/WorkspaceSwitcher";
import ProjectSwitcher from "@/components/ui/ProjectSwitcher";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { NotificationsPanel } from "@/components/ui/NotificationsPanel";
import { WhatsNewPanel } from "@/components/ui/WhatsNewPanel";
import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const mainNavigationItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Workflows",
      href: "/dashboard/workflows",
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      label: "Templates",
      href: "/dashboard/templates",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "Knowledge Base",
      href: "/dashboard/knowledge",
      icon: <Database className="w-4 h-4" />,
    },
    {
      label: "Analytics",
      href: "/dashboard/analytics",
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: "Logs",
      href: "/dashboard/logs",
      icon: <ScrollText className="w-4 h-4" />,
    },
    {
      label: "Usage",
      href: "/dashboard/usage",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      label: "Connections",
      href: "/dashboard/connections",
      icon: <LinkIcon className="w-4 h-4" />,
    },
    {
      label: "Conversations",
      href: "/dashboard/conversations",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "Trash",
      href: "/dashboard/trash",
      icon: <Trash2 className="w-4 h-4" />,
    },
  ];

  const footerNavigationItems = [
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      label: "Members",
      href: "/dashboard/settings/members",
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: "Billing",
      href: "/dashboard/settings/billing",
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background overflow-hidden">
          <DashboardSidebar
            items={mainNavigationItems}
            footerItems={footerNavigationItems}
            header={
              <div className="flex items-center w-full">
                <WorkspaceSwitcher />
              </div>
            }
          />
          <main className="flex-1 overflow-auto flex flex-col">
            <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex-1 hidden md:flex items-center">
                <div className="w-[200px] ml-2">
                  <ProjectSwitcher />
                </div>
              </div>

              {/* Agentic Centered Search */}
              <div className="flex-1 flex justify-center max-w-2xl px-4 w-full">
                <div className="relative w-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg blur-[2px]"></div>
                  <div className="relative flex items-center bg-background rounded-lg border border-border shadow-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      ref={searchInputRef}
                      type="search"
                      placeholder="Ask the agent or search anything..."
                      className="w-full bg-transparent rounded-lg pl-9 pr-14 h-10 border-none focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/70"
                      onClick={() => setCommandOpen(true)}
                      readOnly
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex flex-1 justify-end items-center gap-1">
                <WhatsNewPanel />
                <a
                  href="https://docs.intentflow.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </a>
                <div className="w-px h-5 bg-border/60 mx-1" />
                <NotificationsPanel />
              </div>
            </header>
            <div className="flex-1 w-full px-4 py-6 md:px-6 md:py-8">
              {children}
            </div>

            <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
          </main>
        </div>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
