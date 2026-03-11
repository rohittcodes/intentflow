"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, CheckCheck, AlertCircle, Info, Users, ClipboardCheck, X } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea } from "./scroll-area";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeConfig: Record<string, { icon: typeof AlertCircle; color: string }> = {
  error:    { icon: AlertCircle,    color: "text-red-500" },
  approval: { icon: ClipboardCheck, color: "text-amber-500" },
  team:     { icon: Users,          color: "text-blue-500" },
  info:     { icon: Info,           color: "text-muted-foreground" },
};

export function NotificationsPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const notifications = useQuery(api.notifications.listForUser);
  const unreadCount   = useQuery(api.notifications.unreadCount);
  const markAllRead   = useMutation(api.notifications.markAllRead);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && (unreadCount ?? 0) > 0) {
      markAllRead();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Bell className="h-[18px] w-[18px]" />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        align="end" 
        className="w-80 p-0 shadow-xl border-border/60"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {(unreadCount ?? 0) > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-1"
            onClick={() => markAllRead()}
          >
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </Button>
        </div>

        {/* List */}
        <ScrollArea className="max-h-[360px]">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground/60 mt-1">We'll notify you when something important happens.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((n) => {
                const config = typeConfig[n.type] ?? typeConfig.info;
                const Icon = config.icon;
                return (
                  <button
                    key={n._id}
                    onClick={() => {
                      if (n.link) {
                        setOpen(false);
                        router.push(n.link);
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 w-full px-4 py-3 text-left transition-colors",
                      "hover:bg-muted/50",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium leading-tight", !n.read && "text-foreground")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
