"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface TodayAppointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  status: "confirmed" | "pending" | "completed";
}

const dummyTodayAppointments: TodayAppointment[] = [
  {
    id: "1",
    clientName: "John Doe",
    service: "Consultation",
    time: "9:00 AM",
    status: "completed",
  },
  {
    id: "2",
    clientName: "Jane Smith",
    service: "Follow-up",
    time: "10:30 AM",
    status: "confirmed",
  },
  {
    id: "3",
    clientName: "Bob Wilson",
    service: "Checkup",
    time: "2:00 PM",
    status: "pending",
  },
];

export default function OrgDashboardHome() {
  const router = useRouter();
  const [todayAppointments] = useState<TodayAppointment[]>(dummyTodayAppointments);

  const stats = {
    today: todayAppointments.length,
    revenue: 12450,
    clients: 156,
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/org/all-appointments")}>
          <Calendar className="w-4 h-4 mr-2" />
          View Calendar
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground mt-1">scheduled today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-muted-foreground mt-1">active clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <CardDescription>Appointments for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/appointments/${appointment.id}`)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center min-w-15">
                    <Clock className="w-4 h-4 text-muted-foreground mr-2" />
                    <span className="text-sm font-medium">{appointment.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
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
        </CardContent>
      </Card>
    </div>
  );
}
