"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  FileText,
  Database,
  Link as LinkIcon,
  LogOut,
  Trash2,
} from "lucide-react";

import DashboardSidebar from "@/components/ui/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigationItems = [
    {
      label: "Workflows",
      href: "/dashboard/workflows",
      icon: <LayoutGrid className="w-20 h-20" />,
    },
    {
      label: "Templates",
      href: "/dashboard/templates",
      icon: <FileText className="w-20 h-20" />,
    },
    {
      label: "Datastores",
      href: "/dashboard/datastores",
      icon: <Database className="w-20 h-20" />,
    },
    {
      label: "Connections",
      href: "/dashboard/connections",
      icon: <LinkIcon className="w-20 h-20" />,
    },
    {
      label: "Trash",
      href: "/dashboard/trash",
      icon: <Trash2 className="w-20 h-20" />,
    },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <DashboardSidebar
        items={navigationItems}
        header={
          <div className="flex items-center gap-12">
            <div className="flex items-center justify-center w-32 h-32 rounded-8 bg-heat-100 text-accent-white">
              <LayoutGrid className="w-16 h-16" />
            </div>
            <div className="flex flex-col">
              <span className="text-label-medium text-accent-black">
                Intentflow
              </span>
              <span className="text-body-small text-black-alpha-56">
                Dashboard
              </span>
            </div>
          </div>
        }
      />
      <main className="flex-1 overflow-auto">
        <div className="container p-24 md:p-32 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
