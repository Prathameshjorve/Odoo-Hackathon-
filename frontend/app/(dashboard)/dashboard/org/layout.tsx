"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { authStorage, clearAuthData } from "@/lib/auth";
import { userApi } from "@/lib/api";
import { User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkOrganizationRole = async () => {
      try {
        // Get token from storage
        const accessToken = authStorage.getAccessToken();

        if (!accessToken) {
          // No token, redirect to login
          const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
          router.push(loginUrl);
          return;
        }

        // Validate token and get user data from API
        const response = await userApi.getMe(accessToken);

        if (!response.success || !response.data?.user) {
          // Invalid token or API error
          clearAuthData();
          const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
          router.push(loginUrl);
          return;
        }

        const userData = response.data.user;

        // Check if user has ORGANIZATION role
        if (userData.role !== "ORGANIZATION") {
          setError(
            "Access Denied: This area is only for organization accounts."
          );

          // Redirect USER role users to their dashboard
          if (userData.role === "USER") {
            setTimeout(() => {
              router.push("/dashboard/user");
            }, 2000);
          } else {
            // Unknown role, redirect to login
            setTimeout(() => {
              clearAuthData();
              router.push("/login");
            }, 2000);
          }
          return;
        }

        // User has correct role, update cached data and allow access
        authStorage.setUser(userData);
        setUser(userData);
        setIsChecking(false);
      } catch (error: any) {
        console.error("Organization role check error:", error);

        // Only clear auth on explicit unauthorized error
        if (error.isUnauthorized) {
          setError("Your session has expired. Please login again.");
          setTimeout(() => {
            clearAuthData();
            const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
            router.push(loginUrl);
          }, 2000);
        } else {
          // Network error - try to use cached data
          const cachedUser = authStorage.getUser();
          if (cachedUser && cachedUser.role === "ORGANIZATION") {
            setUser(cachedUser);
            setIsChecking(false);
          } else if (cachedUser && cachedUser.role === "USER") {
            setError(
              "Access Denied: This area is only for organization accounts."
            );
            setTimeout(() => {
              router.push("/dashboard/user");
            }, 2000);
          } else {
            setError(
              "Network error. Please check your connection and try again."
            );
            setTimeout(() => {
              const loginUrl = `/login?redirect=${encodeURIComponent(
                pathname
              )}`;
              router.push(loginUrl);
            }, 2000);
          }
        }
      }
    };

    checkOrganizationRole();
  }, [router, pathname]);

  // Show loading state
  if (isChecking && !error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6 space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting you to the appropriate page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render children only if user has ORGANIZATION role
  return <>{children}</>;
}
