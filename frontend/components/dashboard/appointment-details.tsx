"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  DollarSign,
  FileText,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Edit,
  ArrowLeft,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface Activity {
  id: string;
  type: "created" | "updated" | "confirmed" | "cancelled" | "completed" | "note";
  message: string;
  user: string;
  timestamp: string;
}

export default function AppointmentDetails() {
  const router = useRouter();
  const [newNote, setNewNote] = useState("");

  const appointment = {
    id: "A12345",
    title: "Medical Consultation",
    category: "Health",
    client: {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1 (555) 123-4567",
    },
    provider: {
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@healthcare.com",
      role: "Medical Doctor",
    },
    date: "2025-01-22",
    time: "10:00 AM",
    duration: 30,
    location: "Medical Center, Room 305",
    status: "confirmed" as const,
    price: 150,
    notes: "Patient has mild fever and headache. Follow-up required.",
    createdAt: "2025-01-18T14:30:00",
  };

  const activities: Activity[] = [
    {
      id: "1",
      type: "created",
      message: "Appointment created",
      user: "John Doe",
      timestamp: "2025-01-18T14:30:00",
    },
    {
      id: "2",
      type: "confirmed",
      message: "Appointment confirmed",
      user: "Dr. Sarah Johnson",
      timestamp: "2025-01-18T15:00:00",
    },
    {
      id: "3",
      type: "note",
      message: "Added note: Patient requested morning slot",
      user: "Admin",
      timestamp: "2025-01-19T10:00:00",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "created":
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case "updated":
        return <Edit className="w-4 h-4 text-orange-600" />;
      case "confirmed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case "note":
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{appointment.title}</h1>
              <Badge variant="outline" className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Appointment ID: {appointment.id}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {appointment.status === "confirmed" && (
              <>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Reschedule
                </Button>
                <Button variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(new Date(appointment.date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {appointment.time} ({appointment.duration} min)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{appointment.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium">${appointment.price}</p>
                  </div>
                </div>
              </div>

              {appointment.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Notes</p>
                    <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback>
                    {appointment.client.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{appointment.client.name}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {appointment.client.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {appointment.client.phone}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Information */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback>
                    {appointment.provider.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{appointment.provider.name}</p>
                    <p className="text-sm text-muted-foreground">{appointment.provider.role}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {appointment.provider.email}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader>
              <CardTitle>Add Note</CardTitle>
              <CardDescription>Add internal notes or comments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Textarea
                  placeholder="Type your note here..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button>
                    <Send className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Timeline of all activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="p-1.5 rounded-full bg-background border-2">
                        {getActivityIcon(activity.type)}
                      </div>
                      {index < activities.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {activity.user}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.timestamp), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send SMS
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Generate Invoice
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
