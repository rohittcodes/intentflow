import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import React from "react";

interface PageHeaderProps {
  /** Page title shown as the context label */
  title: string;
  /** Optional breadcrumb parent (e.g. "Settings" when on Settings > Members) */
  parent?: string;
  /** Optional: right-side action buttons or elements */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, parent, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        // Break out horizontally past the layout's padding
        "w-[calc(100%+2rem)] md:w-[calc(100%+3rem)]",
        "-ml-4 md:-ml-6",
        // Cancel the layout's top padding so strip is flush at top
        "-mt-6 md:-mt-8",
        // Internal spacing — equal top/bottom inside the strip, space below
        "px-4 md:px-6 py-4 mb-5",
        "border-b border-border/60",
        className
      )}
    >
      {/* Left: breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {parent && (
          <>
            <span className="text-muted-foreground/50 font-medium">{parent}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
          </>
        )}
        <span className="font-semibold text-foreground/70 tracking-wide">{title}</span>
      </nav>

      {/* Right: any actions passed in */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

