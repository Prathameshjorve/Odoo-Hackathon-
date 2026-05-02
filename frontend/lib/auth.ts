"use client";

import { User } from "./types";

export type { User };

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

// 15 minutes in days = 15 / (24 * 60) = 0.010416667
const ACCESS_TOKEN_EXPIRY_MINUTES = 15;
const ACCESS_TOKEN_EXPIRY_DAYS = ACCESS_TOKEN_EXPIRY_MINUTES / (24 * 60);

// Cookie helper functions - ONLY cookies, no localStorage or sessionStorage
export const setCookie = (name: string, value: string, minutes: number = 15) => {
  if (typeof window !== "undefined") {
    const expires = new Date();
    expires.setTime(expires.getTime() + minutes * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }
};

export const getCookie = (name: string): string | null => {
  if (typeof window !== "undefined") {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
  }
  return null;
};

export const deleteCookie = (name: string) => {
  if (typeof window !== "undefined") {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`;
  }
};

export const authStorage = {
  // Access Token - ONLY cookies with 15-minute expiry
  setAccessToken: (token: string) => {
    if (typeof window !== "undefined") {
      setCookie(ACCESS_TOKEN_KEY, token, ACCESS_TOKEN_EXPIRY_MINUTES);
    }
  },

  getAccessToken: (): string | null => {
    if (typeof window !== "undefined") {
      return getCookie(ACCESS_TOKEN_KEY);
    }
    return null;
  },

  removeAccessToken: () => {
    if (typeof window !== "undefined") {
      deleteCookie(ACCESS_TOKEN_KEY);
    }
  },

  // Refresh Token - ONLY cookies with 15-minute expiry
  setRefreshToken: (token: string) => {
    if (typeof window !== "undefined") {
      setCookie(REFRESH_TOKEN_KEY, token, ACCESS_TOKEN_EXPIRY_MINUTES);
    }
  },

  getRefreshToken: (): string | null => {
    if (typeof window !== "undefined") {
      return getCookie(REFRESH_TOKEN_KEY);
    }
    return null;
  },

  removeRefreshToken: () => {
    if (typeof window !== "undefined") {
      deleteCookie(REFRESH_TOKEN_KEY);
    }
  },

  // User Data - ONLY cookies with 15-minute expiry
  setUser: (user: User) => {
    if (typeof window !== "undefined") {
      const userString = JSON.stringify(user);
      setCookie(USER_KEY, userString, ACCESS_TOKEN_EXPIRY_MINUTES);
    }
  },

  getUser: (): User | null => {
    if (typeof window !== "undefined") {
      const userString = getCookie(USER_KEY);
      return userString ? JSON.parse(userString) : null;
    }
    return null;
  },

  removeUser: () => {
    if (typeof window !== "undefined") {
      deleteCookie(USER_KEY);
    }
  },

  // Clear All
  clearAll: () => {
    authStorage.removeAccessToken();
    authStorage.removeRefreshToken();
    authStorage.removeUser();
  },

  // Check if authenticated
  isAuthenticated: (): boolean => {
    return !!authStorage.getAccessToken();
  },
};

// Helper function to save auth data after login
export const saveAuthData = (data: {
  accessToken: string;
  refreshToken: string;
  user: User;
}) => {
  authStorage.setAccessToken(data.accessToken);
  authStorage.setRefreshToken(data.refreshToken);
  authStorage.setUser(data.user);
};

// Helper function to clear auth data on logout
export const clearAuthData = () => {
  authStorage.clearAll();
};

// Import api functions
import { userApi } from "./api";

// Helper function to get user data from API
export const GetUserData = async (): Promise<{
  name: string;
  email: string;
  role: "customer" | "organizer" | "admin";
} | null> => {
  try {
    // First try to get from cookies
    const cachedUser = authStorage.getUser();
    const accessToken = authStorage.getAccessToken();

    if (!accessToken) {
      console.error("No access token found");
      return null;
    }

    // Fetch fresh data from API
    const response = await userApi.getMe(accessToken);

    if (response.data && response.data.user) {
      const user = response.data.user;

      // Update cached user data
      authStorage.setUser(user);

      // Map role: USER -> customer, ORGANIZATION -> organizer
      // Check if user has isAdmin flag (not adminOrganization)
      const isAdmin = user.isAdmin === true;
      const isOrgMember = user.role === "ORGANIZATION" || user.organizationId != null;

      let mappedRole: "customer" | "organizer" | "admin" = "customer";
      if (isAdmin) {
        mappedRole = "admin";
      } else if (isOrgMember) {
        mappedRole = "organizer";
      }

      console.log("GetUserData - Debug:", {
        userName: user.name,
        userRole: user.role,
        isAdminFlag: user.isAdmin,
        hasAdminOrganization: user.adminOrganization != null,
        organizationId: user.organizationId,
        isAdmin,
        isOrgMember,
        mappedRole
      });

      return {
        name: user.name,
        email: user.email,
        role: mappedRole,
      };
    }

    return null;
  } catch (error: any) {
    console.error("Failed to fetch user data:", error);

    // If unauthorized, clear auth data
    if (error.isUnauthorized) {
      clearAuthData();
    }

    // Fallback to cached data if available
    const cachedUser = authStorage.getUser();
    if (cachedUser) {
      const isAdmin = cachedUser.isAdmin === true;
      const isOrgMember = cachedUser.role === "ORGANIZATION" || cachedUser.organizationId != null;

      let mappedRole: "customer" | "organizer" | "admin" = "customer";
      if (isAdmin) {
        mappedRole = "admin";
      } else if (isOrgMember) {
        mappedRole = "organizer";
      }

      return {
        name: cachedUser.name,
        email: cachedUser.email,
        role: mappedRole,
      };
    }

    return null;
  }
}
