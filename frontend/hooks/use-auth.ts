"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStorage, clearAuthData } from "@/lib/auth";
import { userApi } from "@/lib/api";
import { User } from "@/lib/types";

export function useAuth() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const accessToken = authStorage.getAccessToken();

            if (!accessToken) {
                setIsAuthenticated(false);
                setUser(null);
                setIsLoading(false);
                return;
            }

            try {
                // Try to get user from cache first
                const cachedUser = authStorage.getUser();

                // Fetch fresh user data from API (includes role, organizationId, organization/adminOrganization)
                const response = await userApi.getMe(accessToken);

                if (response.success && response.data?.user) {
                    const userData = response.data.user;
                    setUser(userData);
                    setIsAuthenticated(true);

                    // Update cached user data in cookies with complete information
                    authStorage.setUser(userData);
                } else {
                    // Invalid token, clear auth
                    clearAuthData();
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch (error) {
                console.error("Auth check error:", error);
                // Use cached data if API fails
                const cachedUser = authStorage.getUser();
                if (cachedUser) {
                    setUser(cachedUser);
                    setIsAuthenticated(true);
                } else {
                    clearAuthData();
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const logout = async () => {
        try {
            const refreshToken = authStorage.getRefreshToken();
            if (refreshToken) {
                await userApi.logout(refreshToken);
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
            router.push("/login");
        }
    };

    return {
        user,
        isLoading,
        isAuthenticated,
        logout,
    };
}
