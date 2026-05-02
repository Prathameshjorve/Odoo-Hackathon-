"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigationByRole } from "@/lib/navigation-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/contexts/UserContext";

type UserRole = "customer" | "organizer" | "admin";

interface SidebarProps {
  orientation?: "vertical" | "horizontal";
}

export default function Sidebar({ orientation = "vertical" }: SidebarProps) {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  // Map internal roles to navigation config keys
  const role: UserRole = user?.isAdmin
    ? "admin"
    : user?.role === "ORGANIZATION"
      ? "organizer"
      : "customer";

  const links = navigationByRole[role] || [];

  const isHorizontal = orientation === "horizontal";

  return (
    <nav className={cn(
      "flex gap-2",
      isHorizontal ? "flex-row items-center py-2 overflow-x-auto no-scrollbar" : "flex-col py-4"
    )}>
      <div className={cn(
        "px-3 py-2",
        isHorizontal ? "flex flex-row items-center gap-2 p-0" : ""
      )}>
        {!isHorizontal && (
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-muted-foreground uppercase text-xs">
            Menu
          </h2>
        )}
        <div className={cn(
          "space-y-1",
          isHorizontal ? "flex flex-row items-center gap-1 space-y-0" : "space-y-1"
        )}>
          {isLoading ? (
            Array.from({ length: isHorizontal ? 3 : 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                {!isHorizontal && <Skeleton className="h-4 w-24" />}
              </div>
            ))
          ) : (
            links.map((link, index) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={index}
                  href={link.href}
                  className={cn(
                    "group flex items-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary whitespace-nowrap",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground",
                    !isHorizontal && isActive && "border-l-2 border-primary",
                    isHorizontal && isActive && "border-b-2 border-primary rounded-none"
                  )}
                >
                  <Icon className={cn("h-4 w-4", !isHorizontal && "mr-3")} />
                  <span className={cn(isHorizontal ? "ml-2" : "")}>{link.label}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </nav>
  );
}
