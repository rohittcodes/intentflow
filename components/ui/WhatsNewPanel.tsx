"use client";

import { useState } from "react";
import { Sparkles, X, Zap, Shield, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const CHANGELOG = [
  {
    id: 1,
    icon: BellRing,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    tag: "New",
    tagColor: "bg-blue-500/10 text-blue-600",
    title: "Smart Notifications",
    description: "Get notified about workflow failures, approvals, and team events. Falls back to email if you're offline.",
    date: "Mar 11, 2025",
  },
  {
    id: 2,
    icon: Zap,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    tag: "Improved",
    tagColor: "bg-amber-500/10 text-amber-600",
    title: "Execution Logs",
    description: "Full execution history with status filters, expandable rows showing inputs, outputs, and token usage.",
    date: "Mar 10, 2025",
  },
  {
    id: 3,
    icon: Shield,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    tag: "Improved",
    tagColor: "bg-green-500/10 text-green-600",
    title: "Workspace Invites",
    description: "Invite team members by role with shareable invite links. Manage permissions and revoke access anytime.",
    date: "Mar 8, 2025",
  },
];

export function WhatsNewPanel() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <Sparkles className="h-4 w-4" />
          {/* Dot indicator for unread updates */}
          {!dismissed && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] p-0 rounded-2xl shadow-xl border-border/60 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wide">What&apos;s New</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen(false);
              setDismissed(true);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Changelog entries */}
        <div className="divide-y divide-border/40">
          {CHANGELOG.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors">
                {/* Icon */}
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", item.iconBg)}>
                  <Icon className={cn("h-4 w-4", item.iconColor)} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", item.tagColor)}>
                      {item.tag}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">{item.date}</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground/90 mb-0.5">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
          <p className="text-[10px] text-center text-muted-foreground/50">
            Intentflow is updated frequently — check back for more.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
