"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { User } from "@/lib/types";

interface UserContextType {
    user: User | null;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
    children,
    user,
    isLoading,
}: {
    children: ReactNode;
    user: User | null;
    isLoading: boolean;
}) {
    return (
        <UserContext.Provider value={{ user, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
