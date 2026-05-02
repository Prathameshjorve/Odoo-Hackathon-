"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Calendar,
    MapPin,
    Clock,
    ArrowLeft,
    DollarSign,
    Users,
    AlertCircle,
    Building2,
} from "lucide-react";
import { publicApi } from "@/lib/api";
import { Organization as OrgType } from "@/lib/types";
import { socket, socketHelpers } from "@/lib/socket";

interface Appointment {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    bookType: "USER" | "RESOURCE";
    price: number | null;
    isPaid: boolean;
    allowMultipleSlots: boolean;
    maxSlotsPerBooking: number | null;
    isPublished: boolean;
    bookingsCount: number;
    introMessage: string | null;
    createdAt: string;
}

interface Organization extends OrgType {
    appointments: Appointment[];
}

export default function OrganizationPage() {
    const router = useRouter();
    const params = useParams();
    const organizationId = params.id as string;

    const [organization, setOrganization] = React.useState<Organization | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        fetchOrganization();
    }, [organizationId]);

    // Separate useEffect for socket connection and room joining
    React.useEffect(() => {
        // Connect socket
        socketHelpers.connect();

        // Only join rooms after socket is connected
        const handleConnect = () => {
            socketHelpers.joinPublic();
            socketHelpers.joinOrganization(organizationId);
        };
        socket.on('connect', handleConnect);

        // Cleanup on unmount
        return () => {
            socketHelpers.leaveOrganization(organizationId);
            socket.off('connect', handleConnect);
        };
    }, [organizationId]);

    // Separate useEffect for socket event listeners
    React.useEffect(() => {
        // Listen for new appointments
        const handleAppointmentCreated = (newAppointment: Appointment) => {
            console.log('📢 Appointment created:', newAppointment);
            if (newAppointment.isPublished) {
                setOrganization((prev) => {
                    if (!prev) return prev;
                    // Check if already exists to prevent duplicates
                    const exists = prev.appointments.some((apt) => apt.id === newAppointment.id);
                    if (exists) return prev;
                    return {
                        ...prev,
                        appointments: [newAppointment, ...prev.appointments],
                    };
                });
            }
        };

        // Listen for appointment updates
        const handleAppointmentUpdated = (updatedAppointment: Appointment) => {
            console.log('📢 Appointment updated:', updatedAppointment);
            setOrganization((prev) => {
                if (!prev) return prev;
                // Only update if this appointment belongs to this organization
                const exists = prev.appointments.some((apt) => apt.id === updatedAppointment.id);
                if (!exists && !updatedAppointment.isPublished) return prev;

                // If published, update or add it
                if (updatedAppointment.isPublished) {
                    if (exists) {
                        return {
                            ...prev,
                            appointments: prev.appointments.map((apt) =>
                                apt.id === updatedAppointment.id ? updatedAppointment : apt
                            ),
                        };
                    } else {
                        return {
                            ...prev,
                            appointments: [updatedAppointment, ...prev.appointments],
                        };
                    }
                } else {
                    // If unpublished, remove it
                    return {
                        ...prev,
                        appointments: prev.appointments.filter((apt) => apt.id !== updatedAppointment.id),
                    };
                }
            });
        };

        // Listen for appointment published
        const handleAppointmentPublished = (publishedAppointment: Appointment) => {
            console.log('🎉 Appointment published (real-time):', publishedAppointment.title);
            setOrganization((prev) => {
                if (!prev) return prev;
                // Check if appointment already exists, if not add it
                const exists = prev.appointments.some((apt) => apt.id === publishedAppointment.id);
                if (exists) {
                    // Update existing appointment
                    return {
                        ...prev,
                        appointments: prev.appointments.map((apt) =>
                            apt.id === publishedAppointment.id ? publishedAppointment : apt
                        ),
                    };
                } else {
                    // Add new published appointment to the list
                    console.log('✨ Adding newly published appointment to list');
                    return {
                        ...prev,
                        appointments: [publishedAppointment, ...prev.appointments],
                    };
                }
            });
        };

        // Listen for appointment unpublished
        const handleAppointmentUnpublished = ({ id }: { id: string }) => {
            console.log('🚫 Appointment unpublished (real-time):', id);
            setOrganization((prev) => {
                if (!prev) return prev;
                const removedAppointment = prev.appointments.find((apt) => apt.id === id);
                if (removedAppointment) {
                    console.log('❌ Removing unpublished appointment:', removedAppointment.title);
                }
                return {
                    ...prev,
                    appointments: prev.appointments.filter((apt) => apt.id !== id),
                };
            });
        };

        socket.on('appointment:created', handleAppointmentCreated);
        socket.on('appointment:updated', handleAppointmentUpdated);
        socket.on('appointment:published', handleAppointmentPublished);
        socket.on('appointment:unpublished', handleAppointmentUnpublished);

        // Cleanup on unmount
        return () => {
            socket.off('appointment:created', handleAppointmentCreated);
            socket.off('appointment:updated', handleAppointmentUpdated);
            socket.off('appointment:published', handleAppointmentPublished);
            socket.off('appointment:unpublished', handleAppointmentUnpublished);
        };
    }, []); // Empty dependency array since we use functional setState

    const fetchOrganization = async () => {
        try {
            const response = await publicApi.getOrganizationById(organizationId);

            if (response.success && response.data) {
                setOrganization(response.data.organization as Organization);
            } else {
                setError("Organization not found");
            }
        } catch (err: any) {
            console.error("Error fetching organization:", err);
            setError(err.message || "Failed to load organization");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} Min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const formatBusinessHours = (businessHours: any) => {
        if (!businessHours || !Array.isArray(businessHours) || businessHours.length === 0) {
            return "Hours not specified";
        }

        return businessHours.map((hours: any) => (
            `${hours.day}: ${hours.from} - ${hours.to}`
        )).join(", ");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
                <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-4">
                        <Skeleton className="h-6 w-32" />
                    </div>
                </header>
                <div className="container mx-auto px-4 py-8 space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-64" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
                <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-4">
                        <Button variant="ghost" onClick={() => router.push("/search")} className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Search
                        </Button>
                    </div>
                </header>
                <div className="container mx-auto px-4 py-20">
                    <Card className="max-w-md mx-auto p-8">
                        <div className="text-center space-y-4">
                            <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
                            <h2 className="text-2xl font-bold">Organization Not Found</h2>
                            <p className="text-muted-foreground">
                                {error || "The organization you're looking for doesn't exist or is no longer available."}
                            </p>
                            <Button onClick={() => router.push("/search")} className="mt-4">
                                Browse Organizations
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.push("/search")} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Search
                    </Button>
                    {/* <div className="flex items-center gap-3">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/register">Get Started</Link>
                        </Button>
                    </div> */}
                </div>
            </header>

            {/* Organization Header */}
            <section className="border-b bg-card">
                <div className="container mx-auto px-4 py-8 md:py-12">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    <Building2 className="w-8 h-8 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-3xl md:text-4xl font-bold">{organization.name}</h1>
                                    {organization.location && (
                                        <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                                            <MapPin className="w-4 h-4" />
                                            <span>{organization.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {organization.description && (
                                <p className="text-lg text-muted-foreground">{organization.description}</p>
                            )}

                            {organization.businessHours && Array.isArray(organization.businessHours) && organization.businessHours.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    <Clock className="w-5 h-5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Business Hours</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatBusinessHours(organization.businessHours)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Badge variant="secondary" className="text-base px-4 py-2">
                                {organization.appointments.length} Appointment{organization.appointments.length !== 1 ? "s" : ""}
                            </Badge>
                        </div>
                    </div>
                </div>
            </section>

            {/* Appointments Section */}
            <section className="py-12">
                <div className="container mx-auto px-4">
                    <div className="mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold mb-2">Available Appointments</h2>
                        <p className="text-muted-foreground">
                            Choose an appointment type and book your slot
                        </p>
                    </div>

                    {organization.appointments.length === 0 ? (
                        <Card className="p-12">
                            <div className="text-center space-y-3">
                                <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50" />
                                <h3 className="text-xl font-semibold">No Appointments Available</h3>
                                <p className="text-muted-foreground">
                                    This organization hasn't published any appointments yet
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {organization.appointments.map((appointment) => (
                                <Card
                                    key={appointment.id}
                                    className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                                    onClick={() => router.push(`/appointment/${appointment.id}`)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                                                {appointment.title}
                                            </CardTitle>
                                            {appointment.isPaid && appointment.price !== null && appointment.price > 0 ? (
                                                <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    ${appointment.price}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                                    Free
                                                </Badge>
                                            )}
                                        </div>
                                        {appointment.description && (
                                            <CardDescription className="line-clamp-2">
                                                {appointment.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock className="w-4 h-4" />
                                                <span>{formatDuration(appointment.durationMinutes)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Users className="w-4 h-4" />
                                                <span>{appointment.bookType === "USER" ? "User" : "Resource"}</span>
                                            </div>
                                        </div>

                                        {appointment.introMessage && (
                                            <p className="text-sm text-muted-foreground italic line-clamp-2 border-l-2 border-primary pl-3">
                                                {appointment.introMessage}
                                            </p>
                                        )}

                                        {appointment.allowMultipleSlots && appointment.maxSlotsPerBooking && (
                                            <Badge variant="outline" className="w-fit">
                                                Up to {appointment.maxSlotsPerBooking} slots
                                            </Badge>
                                        )}

                                        <div className="pt-3 border-t">
                                            <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                BookNow
                                            </Button>
                                        </div>

                                        <p className="text-xs text-center text-muted-foreground">
                                            {appointment.bookingsCount} booking{appointment.bookingsCount !== 1 ? "s" : ""} so far
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-muted/30 py-8 mt-12">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} BookNow. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
