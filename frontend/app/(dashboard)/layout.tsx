"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/components/dashboard/navbar";
import { authStorage, clearAuthData } from "@/lib/auth";
import { userApi } from "@/lib/api";
import { User } from "@/lib/types";
import { UserProvider } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background max-w-[1600px] mx-auto ">
      {/* Navbar Skeleton */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 xl:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-5 w-20 hidden sm:block" />
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        <div className="hidden md:flex w-full items-center gap-2 pb-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      </header>

      {/* Simple Content Skeleton */}
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>  
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = authStorage.getAccessToken();

      if (!accessToken) {
        // Not authenticated, redirect to login
        const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
        router.push(loginUrl);
        return;
      }

      try {
        // Validate token with API
        const response = await userApi.getMe(accessToken);

        if (response.success && response.data?.user) {
          const userData = response.data.user;
          
          // Check for isAdmin cookie as fallback
          const isAdminCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('isAdmin='))
            ?.split('=')[1] === 'true';
          
          // Set isAdmin from response or cookie
          userData.isAdmin = userData.isAdmin || isAdminCookie;
          
          setUser(userData);

          // Update cached user data
          authStorage.setUser(userData);

          setIsChecking(false);
        } else {
          // Invalid response, but check if we have cached user
          const cachedUser = authStorage.getUser();
          if (cachedUser) {
            setUser(cachedUser);
            setIsChecking(false);
          } else {
            // No cached data, redirect to login
            const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
            router.push(loginUrl);
          }
        }
      } catch (error: any) {
        console.error("Auth check error:", error);

        // Only clear auth data if it's an unauthorized error (401/403)
        if (error.isUnauthorized) {
          clearAuthData();
          const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
          router.push(loginUrl);
        } else {
          // Network error or temporary issue - use cached data
          const cachedUser = authStorage.getUser();
          if (cachedUser) {
            setUser(cachedUser);
            setIsChecking(false);
          } else {
            // No cached data available
            const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
            router.push(loginUrl);
          }
        }
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isChecking) {
    return <DashboardSkeleton />;
  }

  return (
    <>
    <UserProvider user={user} isLoading={isChecking}>
      <div className="max-w-[1600px] mx-auto px-4">
      <Navbar />
      <div className="">{children}</div>
      </div>
    </UserProvider>
    </>
  );
}
