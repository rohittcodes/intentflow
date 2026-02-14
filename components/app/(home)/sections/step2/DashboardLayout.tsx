"use client";

import * as React from "react";
import {
  LayoutGrid,
  FileText,
  Database,
  Link as LinkIcon,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
  ExternalLink
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/shadcn/sidebar";
import Button from "@/components/ui/shadcn/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeView: "workflows" | "templates" | "datastores" | "connections";
  onViewChange: (view: "workflows" | "templates" | "datastores" | "connections") => void;
  onReset: () => void; // For logout/back
}

export function DashboardLayout({
  children,
  activeView,
  onViewChange,
  onReset,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-4">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutGrid className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-sidebar-foreground">Intentflow</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Dashboard</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "workflows"}
                  onClick={() => onViewChange("workflows")}
                  tooltip="Workflows"
                >
                  <LayoutGrid />
                  <span>Workflows</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "templates"}
                  onClick={() => onViewChange("templates")}
                  tooltip="Templates"
                >
                  <FileText />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "datastores"}
                  onClick={() => onViewChange("datastores")}
                  tooltip="Datastores"
                >
                  <Database />
                  <span>Datastores</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "connections"}
                  onClick={() => onViewChange("connections")}
                  tooltip="Connections"
                >
                  <LinkIcon />
                  <span>Connections</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onReset} tooltip="Back to Home">
                  <LogOut />
                  <span>Back to Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <div className="container p-6 md:p-8 max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
