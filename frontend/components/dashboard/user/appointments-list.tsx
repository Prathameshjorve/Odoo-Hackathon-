
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, MapPin, User } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Dummy user appointments data
const userAppointments = [
  {
    id: "1",
    appointmentType: "General Consultation",
    date: "2025-01-15",
    time: "10:00 AM",
    duration: 30,
    venue: "Main Office - Room 101",
    provider: "Dr. Sarah Johnson",
    status: "confirmed",
    bookingDate: "2024-12-18T10:00:00Z"
  },
  {
    id: "2",
    appointmentType: "Technical Support",
    date: "2025-01-20",
    time: "2:30 PM",
    duration: 45,
    venue: "Support Center - Building B",
    provider: "John Smith",
    status: "pending",
    bookingDate: "2024-12-19T14:00:00Z"
  },
  {
    id: "3",
    appointmentType: "Product Demo",
    date: "2025-01-25",
    time: "11:00 AM",
    duration: 60,
    venue: "Demo Lab - Floor 3",
    provider: "Emily Chen",
    status: "confirmed",
    bookingDate: "2024-12-20T09:00:00Z"
  },
  {
    id: "4",
    appointmentType: "Follow-up Meeting",
    date: "2025-02-05",
    time: "3:00 PM",
    duration: 20,
    venue: "Conference Room A",
    provider: "Dr. Sarah Johnson",
    status: "confirmed",
    bookingDate: "2024-12-15T11:00:00Z"
  },
  {
    id: "5",
    appointmentType: "Training Session",
    date: "2024-12-10",
    time: "9:00 AM",
    duration: 90,
    venue: "Training Center",
    provider: "Mark Wilson",
    status: "completed",
    bookingDate: "2024-11-28T10:00:00Z"
  },
  {
    id: "6",
    appointmentType: "General Consultation",
    date: "2024-11-25",
    time: "1:00 PM",
    duration: 30,
    venue: "Main Office - Room 101",
    provider: "Dr. Sarah Johnson",
    status: "completed",
    bookingDate: "2024-11-20T10:00:00Z"
  },
  {
    id: "7",
    appointmentType: "Strategy Planning",
    date: "2024-11-15",
    time: "4:00 PM",
    duration: 120,
    venue: "Executive Board Room",
    provider: "Jennifer Adams",
    status: "completed",
    bookingDate: "2024-11-10T10:00:00Z"
  },
  {
    id: "8",
    appointmentType: "Technical Support",
    date: "2024-10-30",
    time: "10:30 AM",
    duration: 45,
    venue: "Support Center - Building B",
    provider: "John Smith",
    status: "cancelled",
    bookingDate: "2024-10-25T10:00:00Z"
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-500/10 text-green-700 dark:text-green-400"
    case "pending":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
    case "completed":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    case "cancelled":
      return "bg-red-500/10 text-red-700 dark:text-red-400"
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
  }
}

export default function UserAppointmentsPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingAppointments = userAppointments.filter(
    (apt) => new Date(apt.date) >= today && apt.status !== "cancelled"
  )

  const pastAppointments = userAppointments.filter(
    (apt) => new Date(apt.date) < today || apt.status === "cancelled"
  )

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-500">
      <div className=" mx-auto px-4 py-8 ">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Appointments</h1>
          <p className="text-lg text-muted-foreground">View and manage your scheduled appointments</p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingAppointments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>
                    Your scheduled appointments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Appointment</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-medium">
                            {appointment.appointmentType}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm">{appointment.date}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm">{appointment.time}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{appointment.duration} min</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{appointment.venue}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{appointment.provider}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(appointment.status)} variant="secondary">
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="sm">
                                Reschedule
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Upcoming Appointments</h3>
                  <p className="text-muted-foreground mb-6">
                    You don't have any scheduled appointments.
                  </p>
                  <Button asChild>
                    <Link href="/appointments/book">Book an Appointment</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastAppointments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Past Appointments</CardTitle>
                  <CardDescription>
                    Your appointment history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Appointment</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastAppointments.map((appointment) => (
                        <TableRow key={appointment.id} className="opacity-75">
                          <TableCell className="font-medium">
                            {appointment.appointmentType}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm">{appointment.date}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm">{appointment.time}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{appointment.duration} min</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{appointment.venue}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{appointment.provider}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(appointment.status)} variant="secondary">
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Past Appointments</h3>
                  <p className="text-muted-foreground">
                    You don't have any appointment history yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
