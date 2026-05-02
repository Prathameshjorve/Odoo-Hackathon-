"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Calendar,
    Clock,
    User,
    MapPin,
    Building2,
    Search,
    DollarSign,
    Mail,
    FileText,
    AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { bookingApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { Booking } from "@/lib/types";

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "confirmed":
            return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
        case "pending":
            return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
        case "completed":
            return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
        case "cancelled":
            return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
        default:
            return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
};

const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "paid":
            return "bg-green-500/10 text-green-700 dark:text-green-400";
        case "pending":
            return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
        case "refunded":
            return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
        case "failed":
            return "bg-red-500/10 text-red-700 dark:text-red-400";
        default:
            return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
};

export default function UserBookingsList() {
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null);
    const [cancellingBookingId, setCancellingBookingId] = React.useState<string | null>(null);

    React.useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            setError(null);
            const accessToken = authStorage.getAccessToken();
            if (!accessToken) {
                throw new Error("No access token found");
            }

            const response = await bookingApi.getUserBookings(accessToken);
            if (response.success && response.data) {
                setBookings(response.data);
            } else {
                throw new Error(response.message || "Failed to fetch bookings");
            }
        } catch (err: any) {
            console.error("Error fetching bookings:", err);
            setError(err.message || "Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (booking: Booking) => {
        setSelectedBooking(booking);
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!confirm("Are you sure you want to cancel this booking?")) {
            return;
        }

        try {
            setCancellingBookingId(bookingId);
            const accessToken = authStorage.getAccessToken();
            if (!accessToken) {
                throw new Error("No access token found");
            }

            const response = await bookingApi.cancelBooking(accessToken, bookingId);
            if (response.success) {
                // Refresh bookings list
                await fetchBookings();
                setSelectedBooking(null);
            } else {
                alert(response.message || "Failed to cancel booking");
            }
        } catch (err: any) {
            console.error("Error cancelling booking:", err);
            alert(err.message || "Failed to cancel booking");
        } finally {
            setCancellingBookingId(null);
        }
    };

    const filteredBookings = React.useMemo(() => {
        if (!searchQuery.trim()) return bookings;

        const query = searchQuery.toLowerCase();
        return bookings.filter(
            (booking) =>
                booking.appointment?.title.toLowerCase().includes(query) ||
                booking.appointment?.organization?.name.toLowerCase().includes(query) ||
                booking.bookingStatus.toLowerCase().includes(query)
        );
    }, [bookings, searchQuery]);

    // Calculate stats
    const stats = React.useMemo(() => {
        const now = new Date();
        const upcoming = filteredBookings.filter(
            (b) => new Date(b.startTime) > now && b.bookingStatus !== "CANCELLED"
        ).length;
        const completed = filteredBookings.filter((b) => b.bookingStatus === "COMPLETED").length;
        const cancelled = filteredBookings.filter((b) => b.bookingStatus === "CANCELLED").length;

        return {
            total: filteredBookings.length,
            upcoming,
            completed,
            cancelled,
        };
    }, [filteredBookings]);

    if (loading) {
        return (
            <div className="w-full space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-20" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="w-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-lg font-semibold mb-2">Error Loading Bookings</p>
                    <p className="text-muted-foreground text-center mb-4">{error}</p>
                    <Button onClick={fetchBookings}>Try Again</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">My Appointments</h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage all your booked appointments
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.upcoming}</div>
                        <p className="text-xs text-muted-foreground">Scheduled</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                        <p className="text-xs text-muted-foreground">Finished</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                        <p className="text-xs text-muted-foreground">Not attended</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filter */}
            <Card>
                <CardHeader>
                    <CardTitle>All Bookings</CardTitle>
                    <CardDescription>
                        Click on any booking to view full details
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by appointment, organization, or status..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {filteredBookings.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-semibold mb-2">No bookings found</p>
                            <p className="text-muted-foreground">
                                {searchQuery ? "Try adjusting your search" : "You haven't made any bookings yet"}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Appointment</TableHead>
                                        <TableHead>Organization</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Provider/Resource</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Payment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBookings.map((booking) => (
                                        <TableRow
                                            key={booking.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => handleRowClick(booking)}
                                        >
                                            <TableCell>
                                                <div className="font-medium">{booking.appointment?.title || "N/A"}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {(booking.appointment?.durationMinutes || 0) * (booking.numberOfSlots || 1)} minutes
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="font-medium">{booking.appointment?.organization?.name || "N/A"}</div>
                                                        {booking.appointment?.organization?.location && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {booking.appointment.organization.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {format(new Date(booking.startTime), "MMM dd, yyyy")}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {format(new Date(booking.startTime), "h:mm a")} -{" "}
                                                            {format(new Date(booking.endTime), "h:mm a")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {booking.assignedUser ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{booking.assignedUser.name}</span>
                                                    </div>
                                                ) : booking.resource ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{booking.resource.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(booking.bookingStatus)} variant="outline">
                                                    {booking.bookingStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {booking.paymentStatus === "PAID" && (
                                                        <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
                                                            {booking.paymentStatus}
                                                        </Badge>
                                                    )}
                                                    {(booking.totalAmount || 0) > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            ${(booking.totalAmount || 0).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Booking Details Dialog */}
            <Dialog open={selectedBooking !== null} onOpenChange={() => setSelectedBooking(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Booking Details</DialogTitle>
                        <DialogDescription>
                            Complete information about your appointment
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="space-y-6">
                            {/* Appointment Info */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">Appointment Information</h3>
                                <div className="grid gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Title</span>
                                        <span className="font-medium">{selectedBooking.appointment?.title || "N/A"}</span>
                                    </div>
                                    {selectedBooking.appointment?.description && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm text-muted-foreground">Description</span>
                                            <p className="text-sm">{selectedBooking.appointment.description}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Duration</span>
                                        <span className="font-medium">
                                            {(selectedBooking.appointment?.durationMinutes || 0) * (selectedBooking.numberOfSlots || 1)} minutes
                                            {(selectedBooking.numberOfSlots || 1) > 1 && ` (${selectedBooking.numberOfSlots} slots)`}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Organization Info */}
                            <div className="space-y-3 border-t pt-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Organization
                                </h3>
                                <div className="grid gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Name</span>
                                        <span className="font-medium">{selectedBooking.appointment?.organization?.name || "N/A"}</span>
                                    </div>
                                    {selectedBooking.appointment?.organization?.location && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Location</span>
                                            <span className="font-medium">{selectedBooking.appointment.organization.location}</span>
                                        </div>
                                    )}
                                    {selectedBooking.appointment?.organization?.description && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm text-muted-foreground">About</span>
                                            <p className="text-sm">{selectedBooking.appointment.organization.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Booking Details */}
                            <div className="space-y-3 border-t pt-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Booking Details
                                </h3>
                                <div className="grid gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Date</span>
                                        <span className="font-medium">
                                            {format(new Date(selectedBooking.startTime), "EEEE, MMMM dd, yyyy")}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Time</span>
                                        <span className="font-medium">
                                            {format(new Date(selectedBooking.startTime), "h:mm a")} -{" "}
                                            {format(new Date(selectedBooking.endTime), "h:mm a")}
                                        </span>
                                    </div>
                                    {selectedBooking.assignedUser && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Provider</span>
                                            <div className="text-right">
                                                <div className="font-medium">{selectedBooking.assignedUser.name}</div>
                                                <div className="text-xs text-muted-foreground">{selectedBooking.assignedUser.email}</div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedBooking.resource && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Resource</span>
                                            <span className="font-medium">{selectedBooking.resource.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status & Payment */}
                            <div className="space-y-3 border-t pt-4">
                                <h3 className="font-semibold text-lg">Status & Payment</h3>
                                <div className="grid gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Booking Status</span>
                                        <Badge className={getStatusColor(selectedBooking.bookingStatus)} variant="outline">
                                            {selectedBooking.bookingStatus}
                                        </Badge>
                                    </div>
                                    {selectedBooking.paymentStatus === "PAID" && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Payment Status</span>
                                            <Badge className={getPaymentStatusColor(selectedBooking.paymentStatus)}>
                                                {selectedBooking.paymentStatus}
                                            </Badge>
                                        </div>
                                    )}
                                    {(selectedBooking.totalAmount || 0) > 0 && (
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <span className="font-medium">Total Amount</span>
                                            <span className="text-xl font-bold">
                                                ${(selectedBooking.totalAmount || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Booking Metadata */}
                            <div className="space-y-3 border-t pt-4">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Booking ID: {selectedBooking.id}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Booked on: {format(new Date(selectedBooking.createdAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                                </div>
                            </div>

                            {/* Cancel Button */}
                            {selectedBooking.bookingStatus !== "CANCELLED" && selectedBooking.bookingStatus !== "COMPLETED" && (
                                <div className="border-t pt-4">
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => handleCancelBooking(selectedBooking.id)}
                                        disabled={cancellingBookingId === selectedBooking.id}
                                    >
                                        {cancellingBookingId === selectedBooking.id ? "Cancelling..." : "Cancel Booking"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
