"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Loader2 } from "lucide-react";
import { authStorage } from "@/lib/auth";
import { userApi } from "@/lib/api";
import { getRedirectUrl } from "@/lib/routes";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = authStorage.getAccessToken();

      if (!accessToken) {
        // Not authenticated, allow access to auth pages
        setIsChecking(false);
        return;
      }

      try {
        // Validate token with API
        const response = await userApi.getMe(accessToken);

        if (response.success && response.data?.user) {
          // User is authenticated, redirect away from auth pages
          const redirectUrl = getRedirectUrl(response.data.user.role);
          router.push(redirectUrl);
          return;
        } else {
          // Invalid response, check cached data
          const cachedUser = authStorage.getUser();
          if (cachedUser) {
            // Have cached user, redirect them
            const redirectUrl = getRedirectUrl(cachedUser.role);
            router.push(redirectUrl);
            return;
          }
        }
      } catch (error: any) {
        // Only clear auth data on explicit unauthorized error
        if (error.isUnauthorized) {
          authStorage.clearAll();
        } else {
          // Network error - check cached data
          const cachedUser = authStorage.getUser();
          if (cachedUser) {
            const redirectUrl = getRedirectUrl(cachedUser.role);
            router.push(redirectUrl);
            return;
          }
        }
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6 md:p-10 relative overflow-hidden">
      {/* Premium background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      
      <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="flex flex-col items-center gap-2">
          <a href="/" className="flex items-center gap-2 font-medium group transition-all duration-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 p-1.5 overflow-hidden shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform duration-300">
              <img src="/logo.png" alt="BookFastX Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors"> BookFastX </span>
          </a>
        </div>
        <div className="bg-background/80 border rounded-3xl p-8 shadow-2xl shadow-foreground/5 backdrop-blur-md hover:shadow-primary/5 transition-all duration-500">
          {children}
        </div>
      </div>
    </div>
  )
}
