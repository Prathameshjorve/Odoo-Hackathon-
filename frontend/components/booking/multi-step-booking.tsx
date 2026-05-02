"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Calendar as CalendarIcon,
    Clock,
    DollarSign,
    Loader2,
    CheckCircle2,
    Info,
    User,
    Users,
    CreditCard,
    Check,
} from "lucide-react";
import { bookingApi, paymentsApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { format } from "date-fns";
import { socket, socketHelpers } from "@/lib/socket";

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

interface TimeSlot {
    startTime: string;
    endTime: string;
    availableCount?: number;
}

interface MultiStepBookingProps {
    appointment: Appointment;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function MultiStepBooking({ appointment, onSuccess, onCancel }: MultiStepBookingProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = React.useState(1);
    const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
    const [isBooking, setIsBooking] = React.useState(false);
    const [error, setError] = React.useState("");

    // Booking state
    const [selectedResource, setSelectedResource] = React.useState("");
    const [selectedUser, setSelectedUser] = React.useState("");
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const [selectedSlot, setSelectedSlot] = React.useState("");
    const [selectedSlots, setSelectedSlots] = React.useState<string[]>([]);
    const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([]);
    const [numberOfSlots, setNumberOfSlots] = React.useState(1);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStartSlot, setDragStartSlot] = React.useState<string | null>(null);
    const [customAnswers, setCustomAnswers] = React.useState<Record<string, string | string[]>>({});
    // For paid appointments we always use online payment (Razorpay)
    const [paymentMethod] = React.useState("online");
    const [bookingNotes, setBookingNotes] = React.useState("");

    // Show provider/resource selection only if:
    // - Resource booking OR
    // - User booking with BY_VISITOR assignment type
    const showProviderSelection = appointment.bookType === "RESOURCE" ||
        (appointment.bookType === "USER" && appointment.assignmentType === "BY_VISITOR" &&
            appointment.allowedUsers && appointment.allowedUsers.length > 0);

    const totalSteps =
        1 + // Appointment details confirmation
        (showProviderSelection ? 1 : 0) + // Provider/Resource selection
        1 + // Date selection
        1 + // Time selection
        (appointment.customQuestions && appointment.customQuestions.length > 0 ? 1 : 0) + // Custom questions
        (appointment.isPaid ? 1 : 0) + // Payment
        1; // Confirmation

    React.useEffect(() => {
        if (selectedDate) {
            fetchAvailableSlots();
        }
    }, [selectedDate, selectedResource, selectedUser]);

    // Global mouse up handler for drag selection
    React.useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            setDragStartSlot(null);
        };

        if (isDragging) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
            return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
        }
    }, [isDragging]);

    // Socket integration for real-time slot updates
    React.useEffect(() => {
        // Connect socket and join appointment room
        socketHelpers.connect();
        socketHelpers.joinAppointment(appointment.id);

        // Listen for booking created - refresh slots
        socket.on('booking:created', (data: any) => {
            if (data._refreshSlots && selectedDate) {
                console.log('Booking created, refreshing slots...');
                fetchAvailableSlots();
            }
        });

        // Listen for booking cancelled - refresh slots
        socket.on('booking:cancelled', (data: any) => {
            if (data._refreshSlots && selectedDate) {
                console.log('Booking cancelled, refreshing slots...');
                fetchAvailableSlots();
            }
        });

        // Cleanup on unmount
        return () => {
            socket.off('booking:created');
            socket.off('booking:cancelled');
            socketHelpers.leaveAppointment(appointment.id);
        };
    }, [appointment.id, selectedDate]);

    const fetchAvailableSlots = async () => {
        if (!selectedDate) return;

        try {
            setIsLoadingSlots(true);
            setError("");
            const dateString = format(selectedDate, "yyyy-MM-dd");

            const response = await bookingApi.getAvailableSlots(
                appointment.id,
                dateString,
                selectedUser || undefined,
                selectedResource || undefined
            );

            if (response.success && response.data) {
                // Backend returns: { data: { slots: [...], date, dayOfWeek } }
                const slotsData = response.data as any;
                const slots = slotsData.slots || [];

                // Slots already have startTime and endTime in ISO format
                const transformedSlots: TimeSlot[] = slots.map((slot: any) => ({
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    availableCount: slot.availableCount || 1,
                }));

                setTimeSlots(transformedSlots);

                // Clear error if we got slots
                if (transformedSlots.length === 0) {
                    setError(slotsData.message || "No available slots for this date");
                }
            } else {
                setTimeSlots([]);
                setError(response.message || "No available slots for this date");
            }
        } catch (err: any) {
            console.error("Error fetching slots:", err);
            setError(err.message || "Failed to load available slots");
            setTimeSlots([]);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const loadRazorpayScript = () => {
        return new Promise<void>((resolve, reject) => {
            if (typeof window === "undefined") return reject(new Error("Window is not available"));
            if ((window as any).Razorpay) return resolve();

            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
            document.body.appendChild(script);
        });
    };

    const handleBooking = async () => {
        try {
            setIsBooking(true);
            setError("");
            const token = authStorage.getAccessToken();

            if (!token) {
                router.push(`/login?redirect=/appointment/${appointment.id}`);
                return;
            }

            const bookingData: any = {
                startTime: selectedSlot,
                numberOfSlots,
                userResponses: {
                    ...customAnswers,
                    ...(bookingNotes && { notes: bookingNotes }),
                    ...(paymentMethod && { paymentMethod }),
                },
            };

            if (appointment.bookType === "RESOURCE" && selectedResource) {
                bookingData.resourceId = selectedResource;
            }

            if (appointment.bookType === "USER" && selectedUser) {
                bookingData.assignedUserId = selectedUser;
            }

            const response = await bookingApi.createBooking(token, appointment.id, bookingData);

            if (!response.success || !response.data) {
                setError(response.message || "Failed to create booking");
                return;
            }

            const createdBooking: any = response.data;

            // If appointment is paid, create Razorpay order and open Checkout
            if (appointment.isPaid) {
                try {
                    await loadRazorpayScript();

                    const orderResponse = await paymentsApi.createOrder(token, createdBooking.id);

                    if (!orderResponse.success || !orderResponse.data) {
                        setError(orderResponse.message || "Failed to initiate payment");
                        // Cancel the booking since payment couldn't be initiated
                        try {
                            await bookingApi.cancelBooking(token, createdBooking.id);
                        } catch (cancelErr) {
                            console.error("Error cancelling booking:", cancelErr);
                        }
                        return;
                    }

                    const { orderId, amount, currency, merchantKeyId } = orderResponse.data as any;

                    if (!merchantKeyId) {
                        setError("Payment configuration is incomplete for this organization");
                        // Cancel the booking since payment can't proceed
                        try {
                            await bookingApi.cancelBooking(token, createdBooking.id);
                        } catch (cancelErr) {
                            console.error("Error cancelling booking:", cancelErr);
                        }
                        return;
                    }

                    const options: any = {
                        key: merchantKeyId,
                        amount,
                        currency,
                        order_id: orderId,
                        name: appointment.organization.name,
                        description: appointment.title,
                        notes: {
                            bookingId: createdBooking.id,
                        },
                        handler: function () {
                            // Final success UI – webhook will update booking/payment status
                            setCurrentStep(totalSteps);
                            onSuccess?.();
                        },
                        modal: {
                            ondismiss: async function () {
                                setError("Payment was cancelled. The booking has been cancelled.");
                                // Cancel the booking since payment was dismissed
                                try {
                                    await bookingApi.cancelBooking(token, createdBooking.id);
                                } catch (cancelErr) {
                                    console.error("Error cancelling booking:", cancelErr);
                                }
                            },
                        },
                    };

                    const razorpay = new (window as any).Razorpay(options);
                    razorpay.open();
                } catch (err: any) {
                    console.error("Error during payment:", err);
                    setError(err.message || "Payment initialization failed");
                    // Cancel the booking since payment failed to initialize
                    try {
                        await bookingApi.cancelBooking(token, createdBooking.id);
                    } catch (cancelErr) {
                        console.error("Error cancelling booking:", cancelErr);
                    }
                }
            } else {
                // Free appointment – just show confirmation
                setCurrentStep(totalSteps);
                onSuccess?.();
            }
        } catch (err: any) {
            console.error("Error creating booking:", err);
            setError(err.message || "Failed to create booking");
        } finally {
            setIsBooking(false);
        }
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} Min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const canProceed = () => {
        let stepCount = 1;

        // Step 1: Appointment details
        if (currentStep === stepCount) return true;
        stepCount++;

        // Step 2: Provider/Resource selection
        if (showProviderSelection) {
            if (currentStep === stepCount) {
                if (appointment.bookType === "RESOURCE") {
                    return !!selectedResource;
                }
                if (appointment.bookType === "USER" && appointment.assignmentType === "BY_VISITOR") {
                    return true; // User selection is optional
                }
            }
            stepCount++;
        }

        // Step 3: Date selection
        if (currentStep === stepCount) return !!selectedDate;
        stepCount++;

        // Step 4: Time selection
        if (currentStep === stepCount) return selectedSlots.length > 0;
        stepCount++;

        // Step 5: Custom questions
        if (appointment.customQuestions && appointment.customQuestions.length > 0) {
            if (currentStep === stepCount) {
                return appointment.customQuestions.every(q => {
                    if (!q.required) return true;
                    const answer = customAnswers[q.id];
                    // For checkbox (array answers), check if array has at least one item
                    if (Array.isArray(answer)) {
                        return answer.length > 0;
                    }
                    // For other types, check if answer exists and is not empty
                    return answer && answer.toString().trim() !== '';
                });
            }
            stepCount++;
        }

        // Step 6: Payment
        if (appointment.isPaid) {
            if (currentStep === stepCount) return true;
            stepCount++;
        }

        return true;
    };

    const handleNext = () => {
        if (currentStep === totalSteps - 1) {
            // Last step before confirmation, create booking
            handleBooking();
        } else if (canProceed()) {
            setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
            setError("");
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        setError("");
    };

    const renderStepIndicator = () => {
        return (
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                        <React.Fragment key={step}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${step === currentStep
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : step < currentStep
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-muted-foreground/30 bg-background text-muted-foreground"
                                        }`}
                                >
                                    {step < currentStep ? <Check className="h-5 w-5" /> : step}
                                </div>
                                <span className="mt-2 text-xs text-muted-foreground hidden sm:block">
                                    Step {step}
                                </span>
                            </div>
                            {step < totalSteps && (
                                <div
                                    className={`flex-1 h-0.5 mx-2 ${step < currentStep ? "bg-primary" : "bg-muted-foreground/30"
                                        }`}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };

    // Step 1: Appointment Details
    const renderStep1 = () => {
        let stepNumber = 1;

        return (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Review Appointment Details</h2>
                    <p className="text-muted-foreground">
                        Please review the details of your appointment
                    </p>
                </div>

                {/* Appointment Image */}
                {appointment.picture && (
                    <div className="w-full overflow-hidden rounded-lg border-2">
                        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                            <img
                                src={appointment.picture}
                                alt={appointment.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                )}

                <Card className="border-2">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle className="text-xl">{appointment.title}</CardTitle>
                                <CardDescription className="mt-2">
                                    {appointment.organization.name}
                                    {(appointment.location || appointment.organization.location) && ` • ${appointment.location || appointment.organization.location}`}
                                </CardDescription>
                            </div>
                            {appointment.isPaid && appointment.price !== null && (
                                <Badge variant="secondary" className="text-lg px-4 py-2">
                                    <DollarSign className="w-4 h-4 mr-1" />
                                    {appointment.price}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {appointment.description && (
                            <p className="text-muted-foreground">{appointment.description}</p>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>Duration: {formatDuration(appointment.durationMinutes)}</span>
                        </div>

                        {appointment.introMessage && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex gap-2">
                                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-800 dark:text-blue-200">{appointment.introMessage}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Step 2: Provider/Resource Selection
    const renderStep2 = () => {
        return (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">
                        {appointment.bookType === "RESOURCE" ? "Select Resource" : "Select Provider"}
                    </h2>
                    <p className="text-muted-foreground">
                        {appointment.bookType === "RESOURCE"
                            ? "Choose the resource you want to book"
                            : "Choose a provider or let us auto-assign"}
                    </p>
                </div>

                {appointment.bookType === "RESOURCE" && appointment.allowedResources && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {appointment.allowedResources.map((resource) => (
                            <Card
                                key={resource.id}
                                className={`cursor-pointer transition-all ${selectedResource === resource.id
                                    ? "border-primary border-2 shadow-md"
                                    : "hover:border-primary/50"
                                    }`}
                                onClick={() => setSelectedResource(resource.id)}
                            >
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        {resource.name}
                                    </CardTitle>
                                    <CardDescription>Capacity: {resource.capacity}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}

                {appointment.bookType === "USER" && appointment.allowedUsers && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card
                            className={`cursor-pointer transition-all ${!selectedUser
                                ? "border-primary border-2 shadow-md"
                                : "hover:border-primary/50"
                                }`}
                            onClick={() => setSelectedUser("")}
                        >
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Auto-Assign
                                </CardTitle>
                                <CardDescription>Let us choose the best available provider</CardDescription>
                            </CardHeader>
                        </Card>
                        {appointment.allowedUsers.map((user) => (
                            <Card
                                key={user.id}
                                className={`cursor-pointer transition-all ${selectedUser === user.id
                                    ? "border-primary border-2 shadow-md"
                                    : "hover:border-primary/50"
                                    }`}
                                onClick={() => setSelectedUser(user.id)}
                            >
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        {user.name}
                                    </CardTitle>
                                    <CardDescription>{user.email}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Step 3: Date Selection
    const renderStep3 = () => {
        return (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Select Date</h2>
                    <p className="text-muted-foreground">Choose your preferred appointment date</p>
                </div>

                <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-md border"
                    />
                </div>

                {selectedDate && (
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium">
                            Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // Step 4: Time Slot Selection
    const renderStep4 = () => {
        const handleSlotMouseDown = (slotTime: string) => {
            if (!appointment.allowMultipleSlots) {
                setSelectedSlot(slotTime);
                setSelectedSlots([slotTime]);
                setNumberOfSlots(1);
                return;
            }

            setIsDragging(true);
            setDragStartSlot(slotTime);
            setSelectedSlots([slotTime]);
            setSelectedSlot(slotTime);
        };

        const handleSlotMouseEnter = (slotTime: string) => {
            if (!isDragging || !dragStartSlot || !appointment.allowMultipleSlots) return;

            const startIndex = timeSlots.findIndex(s => s.startTime === dragStartSlot);
            const currentIndex = timeSlots.findIndex(s => s.startTime === slotTime);

            if (startIndex === -1 || currentIndex === -1) return;

            const start = Math.min(startIndex, currentIndex);
            const end = Math.max(startIndex, currentIndex);
            const range = end - start + 1;

            // Limit to maxSlotsPerBooking
            const maxSlots = appointment.maxSlotsPerBooking || 1;
            if (range > maxSlots) return;

            // Get consecutive slots
            const slots = timeSlots.slice(start, end + 1).map(s => s.startTime);
            setSelectedSlots(slots);
            setNumberOfSlots(slots.length);
        };

        const handleSlotMouseUp = () => {
            setIsDragging(false);
            setDragStartSlot(null);
        };

        const totalPrice = appointment.isPaid && appointment.price
            ? appointment.price * numberOfSlots
            : 0;

        return (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Select Time Slot{appointment.allowMultipleSlots ? 's' : ''}</h2>
                    <p className="text-muted-foreground">
                        {appointment.allowMultipleSlots
                            ? `Drag to select up to ${appointment.maxSlotsPerBooking} consecutive slots`
                            : 'Choose your preferred time'}
                    </p>
                    {selectedDate && (
                        <p className="text-sm font-medium">
                            {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </p>
                    )}
                </div>

                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    {appointment.allowMultipleSlots ? 'You can select up to' : 'You can book'}
                                </span>
                            </div>
                            <Badge variant="default" className="text-lg px-4 py-1 bg-blue-600">
                                {appointment.allowMultipleSlots
                                    ? `${appointment.maxSlotsPerBooking == null ? 1 : appointment.maxSlotsPerBooking} slot${(appointment.maxSlotsPerBooking || 1) > 1 ? 's' : ''}`
                                    : '1 slot'
                                }
                            </Badge>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            {appointment.allowMultipleSlots
                                ? `Total duration: up to ${formatDuration((appointment.durationMinutes || 0) * (appointment.maxSlotsPerBooking || 1))}`
                                : `Duration: ${formatDuration(appointment.durationMinutes || 0)}`
                            }
                        </p>
                    </CardContent>
                </Card>

                {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : timeSlots.length === 0 ? (
                    <Card className="p-8">
                        <div className="text-center space-y-3">
                            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/50" />
                            <p className="text-muted-foreground">No available slots for this date</p>
                            <Button variant="outline" onClick={handleBack}>
                                Choose Another Date
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <>
                        <div
                            className="grid grid-cols-2 sm:grid-cols-3 gap-3 select-none"
                            onMouseLeave={handleSlotMouseUp}
                        >
                            {timeSlots.map((slot) => {
                                const isSelected = selectedSlots.includes(slot.startTime);
                                return (
                                    <Button
                                        key={slot.startTime}
                                        variant={isSelected ? "default" : "outline"}
                                        className={`h-auto py-4 flex-col gap-1 cursor-pointer transition-all ${isSelected ? 'scale-105 shadow-md' : ''
                                            }`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSlotMouseDown(slot.startTime);
                                        }}
                                        onMouseEnter={() => handleSlotMouseEnter(slot.startTime)}
                                        onMouseUp={handleSlotMouseUp}
                                    >
                                        <span className="text-base font-semibold">
                                            {format(new Date(slot.startTime), "h:mm a")}
                                        </span>
                                        {slot.availableCount !== undefined && (
                                            <span className="text-xs opacity-70">
                                                {slot.availableCount} available
                                            </span>
                                        )}
                                    </Button>
                                );
                            })}
                        </div>

                        {appointment.allowMultipleSlots && selectedSlots.length > 0 && (
                            <Card className="border-2 border-primary/20 bg-primary/5">
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Selected Slots:</span>
                                            <Badge variant="secondary" className="text-base px-3 py-1">
                                                {numberOfSlots} slot{numberOfSlots > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Total Duration:</span>
                                            <span className="text-sm">{formatDuration(appointment.durationMinutes * numberOfSlots)}</span>
                                        </div>
                                        {appointment.isPaid && appointment.price && (
                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <span className="text-sm font-semibold">Total Price:</span>
                                                <Badge variant="default" className="text-lg px-4 py-1">
                                                    ₹{totalPrice}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        );
    };

    // Step 5: Custom Questions
    const renderStep5 = () => {
        if (!appointment.customQuestions || appointment.customQuestions.length === 0) {
            return null;
        }

        return (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Additional Information</h2>
                    <p className="text-muted-foreground">Please provide the following details</p>
                </div>

                <div className="space-y-4">
                    {appointment.customQuestions.map((question) => {
                        const questionType = question.type.toUpperCase();
                        return (
                            <div key={question.id} className="space-y-2">
                                <Label>
                                    {question.question}
                                    {question.required && <span className="text-destructive ml-1">*</span>}
                                </Label>

                                {questionType === "TEXT" && (
                                    <Input
                                        value={customAnswers[question.id] || ""}
                                        onChange={(e) =>
                                            setCustomAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                                        }
                                        placeholder="Enter your answer"
                                    />
                                )}

                                {questionType === "TEXTAREA" && (
                                    <Textarea
                                        value={customAnswers[question.id] || ""}
                                        onChange={(e) =>
                                            setCustomAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                                        }
                                        placeholder="Enter your answer"
                                        rows={4}
                                    />
                                )}

                                {questionType === "SELECT" && question.options && (
                                    <Select
                                        value={typeof customAnswers[question.id] === 'string' ? (customAnswers[question.id] as string) : ""}
                                        onValueChange={(value) =>
                                            setCustomAnswers((prev) => ({ ...prev, [question.id]: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {question.options.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {questionType === "RADIO" && question.options && (
                                    <RadioGroup
                                        value={typeof customAnswers[question.id] === 'string' ? (customAnswers[question.id] as string) : ""}
                                        onValueChange={(value) =>
                                            setCustomAnswers((prev) => ({ ...prev, [question.id]: value }))
                                        }
                                    >
                                        {question.options.map((option) => (
                                            <div key={option} className="flex items-center space-x-2">
                                                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                                                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                )}

                                {questionType === "CHECKBOX" && question.options && (
                                    <div className="space-y-3">
                                        {question.options.map((option) => {
                                            const currentAnswers = Array.isArray(customAnswers[question.id])
                                                ? (customAnswers[question.id] as string[])
                                                : [];
                                            const isChecked = currentAnswers.includes(option);

                                            return (
                                                <div key={option} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`${question.id}-${option}`}
                                                        checked={isChecked}
                                                        onCheckedChange={(checked: boolean) => {
                                                            setCustomAnswers((prev) => {
                                                                const currentAnswers = Array.isArray(prev[question.id])
                                                                    ? (prev[question.id] as string[])
                                                                    : [];

                                                                if (checked) {
                                                                    return {
                                                                        ...prev,
                                                                        [question.id]: [...currentAnswers, option]
                                                                    };
                                                                } else {
                                                                    return {
                                                                        ...prev,
                                                                        [question.id]: currentAnswers.filter((v: string) => v !== option)
                                                                    };
                                                                }
                                                            });
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor={`${question.id}-${option}`}
                                                        className="font-normal cursor-pointer"
                                                    >
                                                        {option}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <Separator />

                    <div className="space-y-2">
                        <Label>Additional Notes (Optional)</Label>
                        <Textarea
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                            placeholder="Any special requests or information..."
                            rows={3}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Step 6: Payment
    const renderStep6 = () => {
        if (!appointment.isPaid) return null;

        const totalAmount = (appointment.price || 0) * numberOfSlots;

        return (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Payment</h2>
                    <p className="text-muted-foreground">
                        Review the total amount and click Pay Now to complete your booking.
                    </p>
                </div>

                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center justify-between">
                            <span>Total Amount</span>
                            <Badge variant="secondary" className="text-2xl px-4 py-2">
                                ₹{totalAmount}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            {numberOfSlots} slot{numberOfSlots > 1 ? "s" : ""} × ₹{appointment.price}
                        </CardDescription>
                    </CardHeader>
                </Card>

                <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                        <Info className="w-4 h-4 inline mr-1" />
                        Payment is processed securely via Razorpay. Funds will be transferred directly to {appointment.organization.name}&apos;s connected Razorpay account.
                    </p>
                </div>
            </div>
        );
    };

    // Final Step: Confirmation
    const renderFinalStep = () => {
        return (
            <div className="space-y-6">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold">Booking Confirmed!</h2>
                    <p className="text-lg text-muted-foreground">
                        Your appointment has been successfully booked
                    </p>
                </div>

                <Card className="border-2">
                    <CardHeader>
                        <CardTitle>{appointment.title}</CardTitle>
                        <CardDescription>{appointment.organization.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                            <span>{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            <span>{selectedSlot && format(new Date(selectedSlot), "h:mm a")}</span>
                        </div>
                        {appointment.isPaid && (
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-muted-foreground" />
                                <span>${(appointment.price || 0) * numberOfSlots}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {appointment.confirmationMessage && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            {appointment.confirmationMessage}
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <Button size="lg" onClick={() => router.push("/dashboard/user/appointments")}>
                        View My Bookings
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => router.push("/search")}>
                        Browse More Appointments
                    </Button>
                </div>
            </div>
        );
    };

    const renderCurrentStep = () => {
        let stepCount = 1;

        // Step 1: Always show appointment details
        if (currentStep === stepCount) return renderStep1();
        stepCount++;

        // Step 2: Provider/Resource selection (only if showProviderSelection is true)
        if (showProviderSelection) {
            if (currentStep === stepCount) return renderStep2();
            stepCount++;
        }

        // Step 3: Date selection
        if (currentStep === stepCount) return renderStep3();
        stepCount++;

        // Step 4: Time selection
        if (currentStep === stepCount) return renderStep4();
        stepCount++;

        // Step 5: Custom questions
        if (appointment.customQuestions && appointment.customQuestions.length > 0) {
            if (currentStep === stepCount) return renderStep5();
            stepCount++;
        }

        // Step 6: Payment
        if (appointment.isPaid) {
            if (currentStep === stepCount) return renderStep6();
            stepCount++;
        }

        // Final step: Confirmation
        return renderFinalStep();
    };

    return (
        <div className="max-w-3xl mx-auto">
            {renderStepIndicator()}

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                </div>
            )}

            <Card className="border-2">
                <CardContent className="pt-6">{renderCurrentStep()}</CardContent>
            </Card>

            {/* Navigation Buttons */}
            {currentStep < totalSteps && (
                <div className="flex gap-3 mt-6">
                    {currentStep > 1 && (
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleBack}
                            disabled={isBooking}
                            className="flex-1"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    )}
                    <Button
                        size="lg"
                        onClick={handleNext}
                        disabled={!canProceed() || isBooking || isLoadingSlots}
                        className="flex-1"
                    >
                        {isBooking ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Booking...
                            </>
                        ) : currentStep === totalSteps - 1 ? (
                            appointment.isPaid ? "Pay Now" : "Confirm Booking"
                        ) : (
                            <>
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            )}

            {currentStep === 1 && onCancel && (
                <div className="mt-4 text-center">
                    <Button variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
