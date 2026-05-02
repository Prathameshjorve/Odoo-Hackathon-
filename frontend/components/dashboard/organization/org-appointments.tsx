"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  Share2,
  Pencil,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  MoreVertical,
  ExternalLink
} from "lucide-react";
import { useState, useEffect } from "react";
import { organizationApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Appointment {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  bookType: "USER" | "RESOURCE";
  isPaid: boolean;
  isPublished: boolean;
  price?: number;
  bookingsCount: number;
  allowedUsers?: Array<{ id: string; name: string; email: string }>;
  allowedResources?: Array<{ id: string; name: string; capacity: number }>;
  createdAt: string;
}

function ShareModal({ appointment }: { appointment: Appointment }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/appointment/${appointment.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Share Appointment</DialogTitle>
        <DialogDescription>
          Share this link with others to allow them to book this appointment.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input readOnly value={shareUrl} className="flex-1 bg-muted" />
          <Button size="sm" onClick={handleCopy} className="shrink-0">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy
              </>
            )}
          </Button>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => window.open(shareUrl, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Open in New Tab
        </Button>
      </div>
    </DialogContent>
  );
}

export default function OrgAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) {
        setError("Authentication required");
        setIsLoading(false);
        return;
      }

      const response = await organizationApi.getAppointments(token);
      if (response.success && response.data) {
        const data = response.data as { appointments: Appointment[] };
        setAppointments(data.appointments || []);
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error fetching appointments:", err);
      setError(err.message || "Failed to load appointments");
      setIsLoading(false);
    }
  };

  const handlePublish = async (appointmentId: string, currentlyPublished: boolean) => {
    try {
      setPublishingId(appointmentId);
      const token = authStorage.getAccessToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = currentlyPublished
        ? await organizationApi.unpublishAppointment(token, appointmentId)
        : await organizationApi.publishAppointment(token, appointmentId);

      if (response.success) {
        // Update local state
        setAppointments(prev => prev.map(apt =>
          apt.id === appointmentId
            ? { ...apt, isPublished: !currentlyPublished }
            : apt
        ));
      } else {
        setError(response.message || "Failed to update appointment status");
      }
    } catch (err: any) {
      console.error("Error updating appointment:", err);
      setError(err.message || "Failed to update appointment");
    } finally {
      setPublishingId(null);
    }
  };

  const filteredAppointments = appointments.filter((apt) =>
    apt.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen ">
      {/* Header */}

      {/* Main Content */}
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        {/* Page Title Section */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Appointments
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and configure your appointment types
            </p>
          </div>
          <Link href={'/dashboard/org/appointments/create'} >
            <Button className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
              New Appointment
            </Button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            type="search"
            placeholder="Search appointments"
            className="w-full bg-background sm:max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? "No appointments found matching your search" : "No appointments yet. Create your first appointment!"}
            </p>
          </div>
        ) : (
          /* Appointments List */
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-col gap-4 rounded-lg border bg-card px-4 py-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5"
              >
                {/* Appointment Details */}
                <div className="flex-1">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <h3 className="text-base font-semibold text-card-foreground">
                      {appointment.title}
                    </h3>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(appointment.durationMinutes)}
                    </span>
                    {appointment.isPaid && (
                      <Badge variant="default" className="w-fit bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border border-green-500/20">
                        💰 Paid${appointment.price ? ` - $${appointment.price}` : ''}
                      </Badge>
                    )}
                  </div>
                  {appointment.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {appointment.description}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    {/* Resources/Users */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {appointment.bookType === "RESOURCE" && appointment.allowedResources?.map((resource) => (
                        <Badge
                          key={resource.id}
                          variant="secondary"
                          className="h-6 px-2.5 text-xs font-medium"
                        >
                          {resource.name}
                        </Badge>
                      ))}
                      {appointment.bookType === "USER" && appointment.allowedUsers?.map((user) => (
                        <Badge
                          key={user.id}
                          variant="secondary"
                          className="h-6 px-2.5 text-xs font-medium"
                        >
                          {user.name}
                        </Badge>
                      ))}
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {appointment.bookingsCount} booking{appointment.bookingsCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  {/* Status Badge */}
                  <Badge
                    variant={appointment.isPublished ? "default" : "secondary"}
                    className={appointment.isPublished
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 w-fit"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-950 dark:text-gray-400 w-fit"}
                  >
                    {appointment.isPublished ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Unpublished
                      </>
                    )}
                  </Badge>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 sm:flex-none"
                          disabled={!appointment.isPublished}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share
                        </Button>
                      </DialogTrigger>
                      <ShareModal appointment={appointment} />
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="bottom" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/org/appointments/${appointment.id}/edit`)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handlePublish(appointment.id, appointment.isPublished)}
                          disabled={publishingId === appointment.id}
                        >
                          {publishingId === appointment.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : appointment.isPublished ? (
                            <EyeOff className="h-4 w-4 mr-2" />
                          ) : (
                            <Eye className="h-4 w-4 mr-2" />
                          )}
                          {appointment.isPublished ? 'Unpublish' : 'Publish'}
                        </DropdownMenuItem>
                        {appointment.isPublished && (
                          <DropdownMenuItem onClick={() => window.open(`/appointment/${appointment.id}`, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Public Page
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
