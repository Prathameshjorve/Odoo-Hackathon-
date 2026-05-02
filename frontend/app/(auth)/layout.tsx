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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <Package className="size-4" />
            </div>
            <span className="text-xl"> BookNow </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {children}
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/auth.jpg"
          alt="Image"
          className="absolute inset-0 h-full brightness-[0.7] w-full object-cover dark:brightness-[0.4] dark:grayscale"
        />
      </div>
    </div>
  )
}
