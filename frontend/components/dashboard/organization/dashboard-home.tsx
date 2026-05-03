"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, IndianRupee, Clock, Loader2 } from "lucide-react";
import { format, isToday } from "date-fns";
import { useRouter } from "next/navigation";
import { authStorage } from "@/lib/auth";
import { bookingApi } from "@/lib/api";

interface TodayAppointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  status: "confirmed" | "pending" | "completed";
}

export default function OrgDashboardHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [stats, setStats] = useState({
    today: 0,
    revenue: 0,
    clients: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = authStorage.getAccessToken();
      if (!token) return;

      const response = await bookingApi.getOrganizationBookings(token);
      if (response.success && response.data) {
        const bookings = response.data;
        
        // Filter for today
        const todayBookings = bookings.filter((b: any) => isToday(new Date(b.startTime)));
        
        // Calculate revenue
        const totalRevenue = bookings
          .filter((b: any) => b.paymentStatus === "PAID")
          .reduce((acc: number, b: any) => acc + (b.totalAmount || 0), 0);
          
        // Count unique clients
        const uniqueClients = new Set(bookings.map((b: any) => b.userId)).size;

        setStats({
          today: todayBookings.length,
          revenue: totalRevenue,
          clients: uniqueClients,
        });

        // Map today's appointments
        const mappedToday: TodayAppointment[] = todayBookings.map((b: any) => ({
          id: b.id,
          clientName: b.user?.name || "Unknown User",
          service: b.appointment?.title || "Booking",
          time: format(new Date(b.startTime), "h:mm a"),
          status: b.bookingStatus.toLowerCase() as any,
        }));
        
        setTodayAppointments(mappedToday);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
          <Button onClick={() => router.push("/dashboard/org/all-appointments")}>
            <Calendar className="w-4 h-4 mr-2" />
            View Calendar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.today}</div>
                <p className="text-xs text-muted-foreground mt-1">scheduled today</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">₹{stats.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">actual earnings</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">{stats.clients}</div>
                <p className="text-xs text-muted-foreground mt-1">unique customers</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <CardDescription>Appointments for today</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/dashboard/appointments/${appointment.id}`)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center min-w-15 p-2 rounded-md bg-muted group-hover:bg-background transition-colors">
                      <Clock className="w-4 h-4 text-primary mr-2" />
                      <span className="text-sm font-medium">{appointment.time}</span>
                    </div>
                    <div className="flex-1 min-w-0 ml-2">
                      <p className="font-medium truncate">{appointment.clientName}</p>
                      <p className="text-sm text-muted-foreground truncate">{appointment.service}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(appointment.status)} variant="secondary">
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
