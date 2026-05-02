"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface Appointment {
  id: string;
  title: string;
  provider: string;
  date: string;
  time: string;
  location: string;
  status: "confirmed" | "pending" | "cancelled";
}

const dummyAppointments: Appointment[] = [
  {
    id: "1",
    title: "Medical Consultation",
    provider: "Dr. Sarah Johnson",
    date: "2025-01-22",
    time: "10:00 AM",
    location: "Medical Center",
    status: "confirmed",
  },
  {
    id: "2",
    title: "Dental Checkup",
    provider: "Dr. Michael Chen",
    date: "2025-01-25",
    time: "2:30 PM",
    location: "Dental Clinic",
    status: "confirmed",
  },
];

export default function UserDashboardHome() {
  const router = useRouter();
  const [appointments] = useState<Appointment[]>(dummyAppointments);

  const upcomingCount = appointments.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
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
            Your appointments overview
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/user/appointments/book")}>
          <Plus className="w-4 h-4 mr-2" />
          Book Appointment
        </Button>
      </div>

      {/* Stats Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground">appointments scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">total appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription className="mt-1">
                Your scheduled appointments
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/user/appointments")}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/appointments/${appointment.id}`)}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{appointment.title}</h3>
                    <Badge className={getStatusColor(appointment.status)} variant="secondary">
                      {appointment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{appointment.provider}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(appointment.date), "MMM dd, yyyy")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {appointment.time}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {appointment.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
