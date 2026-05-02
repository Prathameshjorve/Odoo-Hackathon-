"use client"

import { ModeToggle } from "@/components/theme-toggle";

export function GlobalThemeToggle() {
  return (
    <div className="fixed top-4 right-4 z-50 rounded-full border border-slate-200/80 bg-background/90 p-1 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/80">
      <ModeToggle />
    </div>
  );
}
