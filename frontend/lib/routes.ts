/**
 * Route Configuration
 * Centralized route definitions for authentication and authorization
 */

export const ROUTES = {
    // Public routes (accessible to everyone)
    PUBLIC: [
        '/',
        '/login',
        '/register',
        '/verify',
        '/forgot-password',
        '/reset-password',
    ],

    // Routes accessible to all authenticated users
    AUTHENTICATED: [
        '/dashboard',
        '/profile',
        '/settings',
    ],

    // Routes specific to USER role
    USER: [
        '/dashboard/appointments',
        '/dashboard/book',
    ],

    // Routes specific to ORGANIZATION role
    ORGANIZATION: [
        '/dashboard/organization',
        '/dashboard/members',
        '/dashboard/resources',
        '/dashboard/manage-appointments',
    ],

    // Auth redirect routes (redirect to dashboard if already logged in)
    AUTH_REDIRECT: [
        '/login',
        '/register',
    ],
} as const;

/**
 * Check if a path matches any route in the given array
 */
export function matchesRoute(path: string, routes: readonly string[]): boolean {
    return routes.some(route => {
        // Exact match
        if (route === path) return true;

        // Wildcard match
        if (route.endsWith('/*')) {
            const baseRoute = route.slice(0, -2);
            return path.startsWith(baseRoute);
        }

        // Prefix match for nested routes
        return path.startsWith(route);
    });
}

/**
 * Get the appropriate redirect URL based on user role
 */
export function getRedirectUrl(userRole?: 'USER' | 'ORGANIZATION'): string {
    if (!userRole) return '/dashboard';

    // Organization users go to organization dashboard
    if (userRole === 'ORGANIZATION') {
        return '/dashboard/org';
    }

    // Regular users go to user dashboard
    if (userRole === 'USER') {
        return '/dashboard/user';
    }

    return '/dashboard';
}

/**
 * Check if user has access to a specific route
 */
export function hasRouteAccess(
    path: string,
    userRole?: 'USER' | 'ORGANIZATION',
    isAuthenticated: boolean = false
): boolean {
    // Public routes are accessible to everyone
    if (matchesRoute(path, ROUTES.PUBLIC)) {
        return true;
    }

    // All other routes require authentication
    if (!isAuthenticated) {
        return false;
    }

    // Check role-specific routes
    if (matchesRoute(path, ROUTES.USER)) {
        return userRole === 'USER';
    }

    if (matchesRoute(path, ROUTES.ORGANIZATION)) {
        return userRole === 'ORGANIZATION';
    }

    // Authenticated routes are accessible to all authenticated users
    if (matchesRoute(path, ROUTES.AUTHENTICATED)) {
        return true;
    }

    // Default: allow access
    return true;
}
