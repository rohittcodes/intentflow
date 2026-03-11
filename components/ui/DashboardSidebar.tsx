"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut, Settings as SettingsIcon, User, ChevronUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

interface DashboardSidebarProps {
  items: {
    label: string;
    href: string;
    icon: React.ReactNode;
  }[];
  footerItems?: {
    label: string;
    href: string;
    icon: React.ReactNode;
  }[];
  header?: React.ReactNode;
}

export default function DashboardSidebar({ items, footerItems, header }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  const renderMenuItems = (menuItems: DashboardSidebarProps["items"]) => {
    return menuItems.map((item) => {
      // Improved isActive logic: exact match for parent routes that have children sub-routes listed
      const isSettingsParent = item.href === "/dashboard/settings" && pathname.startsWith("/dashboard/settings/");
      const isActive = isSettingsParent ? false : pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/dashboard");
      
      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.label}
            className={cn(
              "transition-all duration-200",
              isActive 
                ? "bg-secondary text-secondary-foreground font-bold shadow-sm" 
                : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            )}
          >
            <Link href={item.href} className="flex items-center gap-3">
              <span className={cn(isActive ? "text-primary" : "")}>{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <Sidebar className="border-r border-border/40 select-none" collapsible="icon">
      <SidebarHeader className="p-4">
        {header}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2 pt-2 gap-1">
          {renderMenuItems(items)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-border/40">
        <SidebarMenu className="gap-1 mb-2">
          {footerItems && renderMenuItems(footerItems)}
        </SidebarMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors group">
              <Avatar className="h-8 w-8 rounded-lg border border-border/50 shadow-sm">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User Avatar"} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1 text-left">
                <span className="text-[10px] font-bold truncate leading-none mb-1">
                  {user?.fullName || "User Profile"}
                </span>
                <span className="text-[9px] text-muted-foreground font-medium truncate leading-none">
                  {user?.primaryEmailAddress?.emailAddress || "Settings & Account"}
                </span>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl" align="end" side="top" sideOffset={8}>
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex items-center gap-3">
                 <Avatar className="h-8 w-8 rounded-lg border border-border/50 shadow-sm">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User Avatar"} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-bold leading-none mb-1 truncate">{user?.fullName}</p>
                  <p className="text-[10px] leading-none text-muted-foreground truncate">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg m-1">
              <Link href="/dashboard/settings/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg m-1">
              <Link href="/dashboard/settings">
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => signOut({ redirectUrl: '/' })} 
              className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-100/50 dark:focus:bg-red-950/50 rounded-lg m-1 font-medium"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
