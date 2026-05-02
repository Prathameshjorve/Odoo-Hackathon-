"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Search,
    Building2,
    MapPin,
    Calendar,
    ArrowRight,
    Clock,
    AlertCircle,
} from "lucide-react";
import { publicApi } from "@/lib/api";
import { socket, socketHelpers } from "@/lib/socket";

interface Organization {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    businessHours: any;
    createdAt: string;
    publishedAppointmentsCount: number;
}

export default function SearchPage() {
    const router = useRouter();
    const [organizations, setOrganizations] = React.useState<Organization[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [error, setError] = React.useState("");
    const [isSearching, setIsSearching] = React.useState(false);

    React.useEffect(() => {
        fetchOrganizations();

        // Connect socket and join public room for real-time updates
        socketHelpers.connect();
        socketHelpers.joinPublic();

        // Listen for new organizations
        socket.on('organization:created', (newOrg: Organization) => {
            setOrganizations((prev) => [newOrg, ...prev]);
        });

        // Listen for organization updates
        socket.on('organization:updated', (updatedOrg: Organization) => {
            setOrganizations((prev) =>
                prev.map((org) => (org.id === updatedOrg.id ? updatedOrg : org))
            );
        });

        // Cleanup on unmount
        return () => {
            socket.off('organization:created');
            socket.off('organization:updated');
            socketHelpers.disconnect();
        };
    }, []);

    const fetchOrganizations = async (search?: string) => {
        try {
            setIsSearching(true);
            const response = await publicApi.getAllOrganizations(search);

            if (response.success && response.data) {
                setOrganizations(response.data.organizations);
            } else {
                setError("Failed to load organizations");
            }
        } catch (err: any) {
            console.error("Error fetching organizations:", err);
            setError(err.message || "Failed to load organizations");
        } finally {
            setIsLoading(false);
            setIsSearching(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchOrganizations(searchQuery);
    };

    const formatBusinessHours = (businessHours: any) => {
        if (!businessHours || !Array.isArray(businessHours) || businessHours.length === 0) {
            return "Hours not specified";
        }
        return `${businessHours[0].from} - ${businessHours[0].to}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-primary" />
                        <span className="text-xl font-bold">BookNow</span>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-12 md:py-20">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto space-y-6">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                            Find and Book <span className="text-primary">Appointments</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground">
                            Search from hundreds of organizations and book your appointments instantly
                        </p>

                        {/* Search Form */}
                        <form onSubmit={handleSearch} className="mt-8">
                            <div className="flex gap-2 max-w-2xl mx-auto">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search organizations by name, description, or location..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 h-12 text-base"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="px-8"
                                    disabled={isSearching}
                                >
                                    {isSearching ? "Searching..." : "Search"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            {/* Organizations List */}
            <section className="pb-20">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold">
                            {searchQuery ? "Search Results" : "All Organizations"}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {organizations.length} organization{organizations.length !== 1 ? "s" : ""} found
                        </span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card key={i} className="overflow-hidden">
                                    <CardHeader>
                                        <Skeleton className="h-6 w-3/4 mb-2" />
                                        <Skeleton className="h-4 w-full" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-20 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : organizations.length === 0 ? (
                        <Card className="p-12">
                            <div className="text-center space-y-3">
                                <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50" />
                                <h3 className="text-xl font-semibold">No organizations found</h3>
                                <p className="text-muted-foreground">
                                    {searchQuery
                                        ? "Try adjusting your search terms"
                                        : "Be the first to create an organization"}
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href="/register">Get Started</Link>
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {organizations.map((org) => (
                                <Card
                                    key={org.id}
                                    className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                                    onClick={() => router.push(`/org/${org.id}`)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                                                    {org.name}
                                                </CardTitle>
                                                {org.location && (
                                                    <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                                        <span className="truncate">{org.location}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="flex-shrink-0">
                                                {org.publishedAppointmentsCount} appointment
                                                {org.publishedAppointmentsCount !== 1 ? "s" : ""}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {org.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {org.description}
                                            </p>
                                        )}

                                        {org.businessHours && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">
                                                    {formatBusinessHours(org.businessHours)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="pt-3 border-t flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                {org.publishedAppointmentsCount > 0
                                                    ? "View appointments"
                                                    : "No appointments yet"}
                                            </span>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-muted/30 py-8">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} BookNow. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
