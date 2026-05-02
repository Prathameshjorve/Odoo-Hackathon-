"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigationByRole } from "@/lib/navigation-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/contexts/UserContext";

type UserRole = "customer" | "organizer" | "admin";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  
  // Map internal roles to navigation config keys
  const role: UserRole = user?.isAdmin 
    ? "admin" 
    : user?.role === "ORGANIZATION" 
      ? "organizer" 
      : "customer";
      
  const links = navigationByRole[role] || [];

  return (
    <nav className="flex flex-col gap-2 py-4">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-muted-foreground uppercase text-xs">
          Menu
        </h2>
        <div className="space-y-1">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
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
                    "group flex items-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary",
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {link.label}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </nav>
  );
}
