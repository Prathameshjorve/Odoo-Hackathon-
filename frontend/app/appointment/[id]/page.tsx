"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertCircle,
    ArrowLeft,
} from "lucide-react";
import { bookingApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { MultiStepBooking } from "@/components/booking/multi-step-booking";

interface Appointment {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    bookType: "USER" | "RESOURCE";
    assignmentType: "AUTOMATIC" | "BY_VISITOR";
    price: number | null;
    isPaid: boolean;
    allowMultipleSlots: boolean;
    maxSlotsPerBooking: number | null;
    introMessage: string | null;
    confirmationMessage: string | null;
    picture: string | null;
    location: string | null;
    organization: {
        id: string;
        name: string;
        location: string | null;
    };
    allowedUsers?: Array<{ id: string; name: string; email: string }>;
    allowedResources?: Array<{ id: string; name: string; capacity: number }>;
    customQuestions?: Array<{
        id: string;
        question: string;
        type: "TEXT" | "TEXTAREA" | "SELECT" | "RADIO" | "CHECKBOX" | "text" | "textarea" | "select" | "radio" | "checkbox";
        options?: string[];
        required: boolean;
    }>;
}

export default function AppointmentBookingPage() {
    const router = useRouter();
    const params = useParams();
    const appointmentId = params.id as string;

    const [appointment, setAppointment] = React.useState<Appointment | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

    React.useEffect(() => {
        const token = authStorage.getAccessToken();
        if (token) {
            setIsAuthenticated(true);
            fetchAppointmentDetails();
        } else {
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    }, [appointmentId]);

    const fetchAppointmentDetails = async () => {
        try {
            const response = await bookingApi.getAppointmentDetails(appointmentId);
            if (response.success && response.data) {
                setAppointment(response.data as any);
            } else {
                setError("Appointment not found");
            }
        } catch (err: any) {
            console.error("Error fetching appointment:", err);
            setError(err.message || "Failed to load appointment");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated && !isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
                <Card className="max-w-md mx-4 p-8">
                    <div className="text-center space-y-4">
                        <AlertCircle className="w-16 h-16 mx-auto text-primary" />
                        <h2 className="text-2xl font-bold">Authentication Required</h2>
                        <p className="text-muted-foreground">Please sign in to book this appointment</p>
                        <div className="flex flex-col gap-2 pt-4">
                            <Button onClick={() => router.push(`/login?redirect=/appointment/${appointmentId}`)}>Sign In</Button>
                            <Button variant="outline" onClick={() => router.push(`/register?redirect=/appointment/${appointmentId}`)}>Create Account</Button>
                        </div>
                        <Button variant="ghost" onClick={() => router.back()} className="w-full">Go Back</Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
                <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-4"><Skeleton className="h-8 w-32" /></div>
                </header>
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <Skeleton className="h-64 w-full mb-6" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }

    if (error || !appointment) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
                <Card className="max-w-md mx-4 p-8">
                    <div className="text-center space-y-4">
                        <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
                        <h2 className="text-2xl font-bold">Appointment Not Found</h2>
                        <p className="text-muted-foreground">{error || "The appointment you're looking for doesn't exist or is no longer available."}</p>
                        <Button onClick={() => router.push("/search")} className="w-full">Browse Appointments</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                </div>
            </header>
            <div className="container mx-auto px-4 py-8">
                <MultiStepBooking appointment={appointment} onSuccess={() => { }} onCancel={() => router.back()} />
            </div>
        </div>
    );
}