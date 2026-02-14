"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function DashboardSidebar({
  items,
  header,
  footer,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-accent-white border-r border-black-alpha-8 transition-all duration-300",
        isCollapsed ? "w-64" : "w-256"
      )}
    >
      {/* Header */}
      {header && (
        <div className="p-16 border-b border-black-alpha-8">
          {isCollapsed ? (
            <div className="flex items-center justify-center w-32 h-32 rounded-8 bg-heat-100 text-accent-white mx-auto">
              <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
              </svg>
            </div>
          ) : (
            header
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-8">
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-12 px-12 py-10 rounded-8 transition-all text-label-medium",
                    active
                      ? "bg-heat-8 text-heat-100 font-medium"
                      : "text-black-alpha-64 hover:bg-black-alpha-4 hover:text-accent-black",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Always visible */}
      <div className="p-8 border-t border-black-alpha-8">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex items-center gap-12 px-12 py-10 rounded-8 transition-all text-label-medium text-black-alpha-64 hover:bg-black-alpha-4 hover:text-accent-black w-full",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="w-20 h-20 flex items-center justify-center flex-shrink-0">
            <svg
              className={cn("w-20 h-20 transition-transform", isCollapsed && "rotate-180")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </span>
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
