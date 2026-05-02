"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
    Plus,
    Search,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Mail,
    FileText,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Filter,
    X,
} from "lucide-react";
import { format } from "date-fns";
import { bookingApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type SortField = "date" | "customer" | "appointment" | "status";
type SortDirection = "asc" | "desc";

interface FilterState {
    bookingStatus: string;
    paymentStatus: string;
    dateFrom: string;
    dateTo: string;
}

interface Booking {
    id: string;
    startTime: string;
    endTime: string;
    numberOfSlots: number;
    totalAmount: number;
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    createdAt: string;
    appointment: {
        id: string;
        title: string;
        durationMinutes: number;
    };
    user: {
        id: string;
        name: string;
        email: string;
    };
    resource?: {
        id: string;
        name: string;
    } | null;
    assignedUser?: {
        id: string;
        name: string;
    } | null;
}

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

export default function OrganizationAppointmentsList() {
    const router = useRouter();
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [error, setError] = React.useState("");
    const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [cancellingBookingId, setCancellingBookingId] = React.useState<string | null>(null);
    
    // Sorting state
    const [sortField, setSortField] = React.useState<SortField>("date");
    const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
    
    // Filtering state
    const [filters, setFilters] = React.useState<FilterState>({
        bookingStatus: "all",
        paymentStatus: "all",
        dateFrom: "",
        dateTo: "",
    });
    const [showFilters, setShowFilters] = React.useState(false);

    React.useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                setError("Authentication required");
                setIsLoading(false);
                return;
            }

            const response = await bookingApi.getOrganizationBookings(token);
            if (response.success && response.data) {
                setBookings(response.data as Booking[]);
            } else {
                setError("Failed to load bookings");
            }
        } catch (err: any) {
            console.error("Failed to fetch bookings:", err);
            setError(err.message || "Failed to load bookings");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredBookings = bookings.filter((booking) =>
        booking.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.appointment.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply filters
    const filteredAndFilteredBookings = filteredBookings.filter((booking) => {
        // Booking status filter
        if (filters.bookingStatus !== "all" && booking.bookingStatus !== filters.bookingStatus) {
            return false;
        }
        
        // Payment status filter
        if (filters.paymentStatus !== "all" && booking.paymentStatus !== filters.paymentStatus) {
            return false;
        }
        
        // Date range filter
        const bookingDate = new Date(booking.startTime);
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            if (bookingDate < fromDate) return false;
        }
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            if (bookingDate > toDate) return false;
        }
        
        return true;
    });

    // Apply sorting
    const sortedBookings = [...filteredAndFilteredBookings].sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
            case "date":
                comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                break;
            case "customer":
                comparison = a.user.name.localeCompare(b.user.name);
                break;
            case "appointment":
                comparison = a.appointment.title.localeCompare(b.appointment.title);
                break;
            case "status":
                comparison = a.bookingStatus.localeCompare(b.bookingStatus);
                break;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
    });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            bookingStatus: "all",
            paymentStatus: "all",
            dateFrom: "",
            dateTo: "",
        });
    };

    const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
        if (key === "bookingStatus" || key === "paymentStatus") {
            return value !== "all";
        }
        return value !== "";
    }).length;

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
        }
        return sortDirection === "asc" ? (
            <ArrowUp className="w-4 h-4 ml-1" />
        ) : (
            <ArrowDown className="w-4 h-4 ml-1" />
        );
    };

    const stats = {
        total: bookings.length,
        pending: bookings.filter((b) => b.bookingStatus === "PENDING").length,
        confirmed: bookings.filter((b) => b.bookingStatus === "CONFIRMED").length,
        completed: bookings.filter((b) => b.bookingStatus === "COMPLETED").length,
        revenue: bookings
            .filter((b) => b.paymentStatus === "PAID")
            .reduce((sum, b) => sum + b.totalAmount, 0),
    };

    const handleRowClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsDialogOpen(true);
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!confirm("Are you sure you want to cancel this booking? This action will cancel immediately without policy checks.")) {
            return;
        }

        try {
            setCancellingBookingId(bookingId);
            const token = authStorage.getAccessToken();
            if (!token) {
                alert("Authentication required");
                return;
            }

            const response = await bookingApi.cancelBookingByOrganization(token, bookingId);
            if (response.success) {
                // Refresh bookings list
                await fetchBookings();
                setIsDialogOpen(false);
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

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Booked Appointments</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and track all customer bookings
                    </p>
                </div>
                <Button
                    size="lg"
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => router.push("/dashboard/org/appointments/create")}
                >
                    <Plus className="w-5 h-5" />
                    Create Appointment
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                        <CardDescription>Total Bookings</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.total}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>All time</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-3">
                        <CardDescription>Pending</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.pending}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="w-4 h-4" />
                            <span>Requires action</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                        <CardDescription>Confirmed</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.confirmed}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Ready to go</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3">
                        <CardDescription>Total Revenue</CardDescription>
                        <CardTitle className="text-3xl font-bold">${stats.revenue.toFixed(2)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>From paid bookings</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardHeader className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search bookings by customer name, email, or appointment..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            onClick={() => setShowFilters(!showFilters)}
                            className="gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                            {activeFiltersCount > 0 && (
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="border-t pt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Booking Status Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Booking Status</label>
                                    <Select
                                        value={filters.bookingStatus}
                                        onValueChange={(value) => handleFilterChange("bookingStatus", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All statuses" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4}>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                            <SelectItem value="COMPLETED">Completed</SelectItem>
                                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Payment Status Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Payment Status</label>
                                    <Select
                                        value={filters.paymentStatus}
                                        onValueChange={(value) => handleFilterChange("paymentStatus", value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All payments" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={4}>
                                            <SelectItem value="all">All Payments</SelectItem>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                            <SelectItem value="PAID">Paid</SelectItem>
                                            <SelectItem value="FAILED">Failed</SelectItem>
                                            <SelectItem value="REFUNDED">Refunded</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Date From Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">From Date</label>
                                    <Input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                                    />
                                </div>

                                {/* Date To Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">To Date</label>
                                    <Input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Clear Filters Button */}
                            {activeFiltersCount > 0 && (
                                <div className="flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Clear Filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardHeader>
            </Card>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                </div>
            )}

            {/* Results Count */}
            {!error && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p>
                        Showing <span className="font-medium text-foreground">{sortedBookings.length}</span> of{" "}
                        <span className="font-medium text-foreground">{bookings.length}</span> bookings
                    </p>
                    {(searchQuery || activeFiltersCount > 0) && (
                        <p className="text-xs">
                            {searchQuery && `Search: "${searchQuery}"`}
                            {searchQuery && activeFiltersCount > 0 && " • "}
                            {activeFiltersCount > 0 && `${activeFiltersCount} filter${activeFiltersCount > 1 ? "s" : ""} active`}
                        </p>
                    )}
                </div>
            )}

            {/* Bookings Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <button
                                            onClick={() => handleSort("customer")}
                                            className="flex items-center hover:text-foreground transition-colors"
                                        >
                                            Customer
                                            <SortIcon field="customer" />
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button
                                            onClick={() => handleSort("appointment")}
                                            className="flex items-center hover:text-foreground transition-colors"
                                        >
                                            Appointment
                                            <SortIcon field="appointment" />
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button
                                            onClick={() => handleSort("date")}
                                            className="flex items-center hover:text-foreground transition-colors"
                                        >
                                            Date & Time
                                            <SortIcon field="date" />
                                        </button>
                                    </TableHead>
                                    <TableHead>Provider/Resource</TableHead>
                                    <TableHead>
                                        <button
                                            onClick={() => handleSort("status")}
                                            className="flex items-center hover:text-foreground transition-colors"
                                        >
                                            Status
                                            <SortIcon field="status" />
                                        </button>
                                    </TableHead>
                                    <TableHead>Payment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedBookings.length > 0 ? (
                                    sortedBookings.map((booking) => (
                                        <TableRow
                                            key={booking.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => handleRowClick(booking)}
                                        >
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{booking.user.name}</span>
                                                    <span className="text-sm text-muted-foreground">{booking.user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{booking.appointment.title}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {booking.appointment.durationMinutes} min × {booking.numberOfSlots}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{format(new Date(booking.startTime), "MMM d, yyyy")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{format(new Date(booking.startTime), "h:mm a")}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    {booking.assignedUser && (
                                                        <>
                                                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <span className="text-sm">{booking.assignedUser.name}</span>
                                                        </>
                                                    )}
                                                    {booking.resource && (
                                                        <>
                                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <span className="text-sm">{booking.resource.name}</span>
                                                        </>
                                                    )}
                                                    {!booking.assignedUser && !booking.resource && (
                                                        <span className="text-sm text-muted-foreground">N/A</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={getStatusColor(booking.bookingStatus)}
                                                    variant="outline"
                                                >
                                                    {booking.bookingStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {booking.paymentStatus === "PAID" && (
                                                        <Badge
                                                            className={getPaymentStatusColor(booking.paymentStatus)}
                                                            variant="secondary"
                                                        >
                                                            FREE
                                                        </Badge>
                                                    )}
                                                    {booking.totalAmount > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            ${booking.totalAmount.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Calendar className="w-12 h-12" />
                                                <p>No bookings found</p>
                                                {searchQuery && (
                                                    <p className="text-sm">Try adjusting your search</p>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Booking Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    {selectedBooking && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-2xl">Booking Details</DialogTitle>
                                <DialogDescription>
                                    Booking ID: {selectedBooking.id}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4 overflow-y-auto flex-1">
                                {/* Customer Information */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        Customer Information
                                    </h3>
                                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                        <div className="flex items-start gap-3">
                                            <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Name</p>
                                                <p className="font-medium">{selectedBooking.user.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Email</p>
                                                <p className="font-medium">{selectedBooking.user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Appointment Information */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        Appointment Details
                                    </h3>
                                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                        <div className="flex items-start gap-3">
                                            <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Service</p>
                                                <p className="font-medium">{selectedBooking.appointment.title}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Duration</p>
                                                <p className="font-medium">
                                                    {selectedBooking.appointment.durationMinutes} minutes × {selectedBooking.numberOfSlots} slot(s)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Date</p>
                                                <p className="font-medium">
                                                    {format(new Date(selectedBooking.startTime), "EEEE, MMMM d, yyyy")}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Time</p>
                                                <p className="font-medium">
                                                    {format(new Date(selectedBooking.startTime), "h:mm a")} - {format(new Date(selectedBooking.endTime), "h:mm a")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Provider/Resource Information */}
                                {(selectedBooking.assignedUser || selectedBooking.resource) && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            {selectedBooking.assignedUser ? <User className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                                            {selectedBooking.assignedUser ? "Assigned Provider" : "Resource"}
                                        </h3>
                                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                            {selectedBooking.assignedUser && (
                                                <div className="flex items-start gap-3">
                                                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Provider</p>
                                                        <p className="font-medium">{selectedBooking.assignedUser.name}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedBooking.resource && (
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Resource</p>
                                                        <p className="font-medium">{selectedBooking.resource.name}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Status and Payment */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Status & Payment
                                    </h3>
                                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Booking Status</span>
                                            <Badge
                                                className={getStatusColor(selectedBooking.bookingStatus)}
                                                variant="outline"
                                            >
                                                {selectedBooking.bookingStatus}
                                            </Badge>
                                        </div>
                                        {selectedBooking.paymentStatus === "PAID" && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Payment Status</span>
                                                <Badge
                                                    className={getPaymentStatusColor(selectedBooking.paymentStatus)}
                                                    variant="secondary"
                                                >
                                                    {selectedBooking.paymentStatus}
                                                </Badge>
                                            </div>
                                        )}
                                        {selectedBooking.totalAmount > 0 && (
                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <span className="font-medium">Total Amount</span>
                                                <span className="text-xl font-bold">
                                                    ${selectedBooking.totalAmount.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Timestamps */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold">Booking Information</h3>
                                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Booked on</span>
                                            <span className="font-medium">
                                                {format(new Date(selectedBooking.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                            </span>
                                        </div>
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
                                            <XCircle className="w-4 h-4 mr-2" />
                                            {cancellingBookingId === selectedBooking.id ? "Cancelling..." : "Cancel Booking"}
                                        </Button>
                                        <p className="text-xs text-center text-muted-foreground mt-2">
                                            Organization cancellations are immediate and bypass policy checks
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
