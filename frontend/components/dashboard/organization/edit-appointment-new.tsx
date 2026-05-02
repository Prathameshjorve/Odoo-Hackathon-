"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  DollarSign,
  CheckCircle2,
  ArrowLeft,
  Image as ImageIcon,
  Trash2,
  Plus,
  Save,
  Eye,
  Settings,
  AlertCircle,
  Users,
  HelpCircle,
  X,
} from "lucide-react";
import { organizationApi, mediaApi, userApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface TimeSlot {
  id: string;
  day: string;
  from: string;
  to: string;
}

interface Question {
  id: string;
  question: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "select";
  required: boolean;
  options?: string[]; // For radio, checkbox, select
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Resource {
  id: string;
  name: string;
  capacity: number;
}

interface BusinessHour {
  day: string;
  from: string;
  to: string;
}

interface AppointmentTypeFormData {
  title: string;
  duration: string;
  durationUnit: "hours" | "minutes";
  location: string;
  bookingType: "user" | "resource";
  assignmentType: "automatic" | "visitor";
  selectedUsers: string[];
  selectedResources: string[];
  manageCapacity: boolean;
  capacity: number;
  isPaid: boolean;
  price: string;
  cancellationHours: string;
  description: string;
  picture: File | null;
  picturePreview: string | null;
  timeSlots: TimeSlot[];
  questions: Question[];
  introMessage: string;
  confirmationMessage: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function CreateAppointment({ onBack }: { onBack?: () => void }) {
  const [currentTab, setCurrentTab] = useState("schedule");
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [formData, setFormData] = useState<AppointmentTypeFormData>({
    title: "",
    duration: "30",
    durationUnit: "minutes",
    location: "",
    bookingType: "user",
    assignmentType: "automatic",
    selectedUsers: [],
    selectedResources: [],
    manageCapacity: false,
    capacity: 1,
    isPaid: false,
    price: "",
    cancellationHours: "0",
    description: "",
    picture: null,
    picturePreview: null,
    timeSlots: [],
    questions: [],
    introMessage: "",
    confirmationMessage: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch users, resources, and organization on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = authStorage.getAccessToken();
        if (!token) {
          setDataError("Authentication required");
          setIsLoadingData(false);
          return;
        }

        const [membersResponse, resourcesResponse, userResponse] = await Promise.all([
          organizationApi.getMembers(token),
          organizationApi.getResources(token),
          userApi.getMe(token),
        ]);

        if (membersResponse.success && membersResponse.data) {
          const membersData = membersResponse.data as { members: User[] };
          setUsers(membersData.members || []);
        }

        if (resourcesResponse.success && resourcesResponse.data) {
          const resourcesData = resourcesResponse.data as { resources: Resource[] };
          setResources(resourcesData.resources || []);
        }

        // Extract business hours from user's organization
        if (userResponse.success && userResponse.data) {
          const userData = userResponse.data as any;
          // Check both adminOrganization (for org admin) and organization (for members)
          const org = userData.user?.adminOrganization || userData.user?.organization;

          if (org?.businessHours) {
            const orgBusinessHours = org.businessHours as BusinessHour[];
            setBusinessHours(orgBusinessHours);

            // Auto-populate time slots with business hours
            const initialSlots: TimeSlot[] = orgBusinessHours.map((bh, index) => ({
              id: `${index + 1}`,
              day: bh.day.charAt(0).toUpperCase() + bh.day.slice(1).toLowerCase(),
              from: bh.from,
              to: bh.to,
            }));
            setFormData(prev => ({ ...prev, timeSlots: initialSlots }));
          }
        }

        setIsLoadingData(false);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setDataError(error.message || "Failed to load data");
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Appointment title is required";
    }
    if (!formData.duration || parseFloat(formData.duration) <= 0) {
      newErrors.duration = "Valid duration is required";
    }
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }
    if (formData.bookingType === "user" && formData.selectedUsers.length === 0) {
      newErrors.users = "Please select at least one user";
    }
    if (formData.bookingType === "resource" && formData.selectedResources.length === 0) {
      newErrors.resources = "Please select at least one resource";
    }
    if (formData.timeSlots.length === 0) {
      newErrors.timeSlots = "Please add at least one time slot";
    }

    if (formData.isPaid) {
      const priceValue = parseInt(formData.price, 10);
      if (!formData.price || Number.isNaN(priceValue) || priceValue <= 0) {
        newErrors.price = "Valid price is required for paid appointments";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const token = authStorage.getAccessToken();
      if (!token) {
        setErrors({ submit: "Authentication required. Please log in again." });
        setIsLoading(false);
        return;
      }

      // Upload image if present
      let pictureUrl: string | undefined = undefined;
      if (formData.picture) {
        try {
          const uploadResponse = await mediaApi.uploadFile(token, formData.picture, 'appointments');
          if (uploadResponse.success && uploadResponse.data) {
            pictureUrl = uploadResponse.data.url;
          }
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          setErrors({ submit: "Failed to upload image. Please try again." });
          setIsLoading(false);
          return;
        }
      }

      // Convert duration to minutes
      const durationMinutes =
        formData.durationUnit === "hours"
          ? parseFloat(formData.duration) * 60
          : parseFloat(formData.duration);

      // Convert time slots to backend format (uppercase day names)
      const schedule = formData.timeSlots.map((slot) => ({
        day: slot.day.toUpperCase(),
        from: slot.from,
        to: slot.to,
      }));

      // Prepare appointment data
      const parsedPrice = formData.isPaid ? parseInt(formData.price, 10) : NaN;
      const parsedCancellationHours = parseInt(formData.cancellationHours, 10);

      const appointmentData = {
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location,
        durationMinutes: Math.round(durationMinutes),
        bookType: formData.bookingType === "user" ? "USER" as const : "RESOURCE" as const,
        assignmentType:
          formData.assignmentType === "automatic" ? "AUTOMATIC" as const : "BY_VISITOR" as const,
        allowMultipleSlots: formData.manageCapacity,
        isPaid: formData.isPaid,
        price:
          formData.isPaid && !Number.isNaN(parsedPrice) && parsedPrice > 0
            ? parsedPrice
            : undefined,
        cancellationHours:
          formData.isPaid && !Number.isNaN(parsedCancellationHours) && parsedCancellationHours >= 0
            ? parsedCancellationHours
            : 0,
        schedule,
        questions: formData.questions,
        picture: pictureUrl,
        introMessage: formData.introMessage || undefined,
        confirmationMessage: formData.confirmationMessage || undefined,
        allowedUserIds:
          formData.bookingType === "user" ? formData.selectedUsers : undefined,
        allowedResourceIds:
          formData.bookingType === "resource" ? formData.selectedResources : undefined,
      };

      const response = await organizationApi.createAppointment(token, appointmentData);

      if (response.success) {
        setSuccess(true);
        // Reset form after success
        setTimeout(() => {
          setSuccess(false);
          if (onBack) onBack();
        }, 2000);
      } else {
        setErrors({ submit: response.message || "Failed to create appointment" });
      }
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      setErrors({
        submit: error.message || "An error occurred while creating the appointment",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, picture: file, picturePreview: URL.createObjectURL(file) });
    }
  };

  const removePicture = () => {
    setFormData({ ...formData, picture: null, picturePreview: null });
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      day: "Monday",
      from: "09:00",
      to: "17:00",
    };
    setFormData({ ...formData, timeSlots: [...formData.timeSlots, newSlot] });
  };

  const loadBusinessHours = () => {
    if (businessHours.length === 0) {
      setDataError("No business hours configured for your organization");
      return;
    }

    const slots: TimeSlot[] = businessHours.map((bh, index) => ({
      id: `${Date.now()}-${index}`,
      day: bh.day.charAt(0).toUpperCase() + bh.day.slice(1).toLowerCase(),
      from: bh.from,
      to: bh.to,
    }));

    setFormData({ ...formData, timeSlots: slots });
  };

  const removeTimeSlot = (id: string) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.filter((slot) => slot.id !== id),
    });
  };

  const updateTimeSlot = (id: string, field: keyof TimeSlot, value: string) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.map((slot) =>
        slot.id === id ? { ...slot, [field]: value } : slot
      ),
    });
  };

  const toggleUser = (userId: string) => {
    const isSelected = formData.selectedUsers.includes(userId);
    setFormData({
      ...formData,
      selectedUsers: isSelected
        ? formData.selectedUsers.filter((id) => id !== userId)
        : [...formData.selectedUsers, userId],
    });
  };

  const toggleResource = (resourceId: string) => {
    const isSelected = formData.selectedResources.includes(resourceId);
    setFormData({
      ...formData,
      selectedResources: isSelected
        ? formData.selectedResources.filter((id) => id !== resourceId)
        : [...formData.selectedResources, resourceId],
    });
  };

  const addQuestion = (question: Question) => {
    if (editingQuestion) {
      // Update existing question
      setFormData({
        ...formData,
        questions: formData.questions.map((q) =>
          q.id === editingQuestion.id ? question : q
        ),
      });
    } else {
      // Add new question
      setFormData({
        ...formData,
        questions: [...formData.questions, question],
      });
    }
    setIsQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const deleteQuestion = (id: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((q) => q.id !== id),
    });
  };

  const openQuestionModal = (question?: Question) => {
    setEditingQuestion(question || null);
    setIsQuestionModalOpen(true);
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 sm:p-12">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold">Appointment Created!</h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {formData.title} has been successfully created. You can publish it to make it available for public booking.
                </p>
              </div>
              <Button onClick={onBack} className="w-full sm:w-auto" size="lg">
                Back to Appointments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4  mx-auto">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Appointment Form View</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Configure appointment type settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none gap-2" size="sm">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              className="flex-1 sm:flex-none gap-2"
              onClick={handleSubmit}
              disabled={isLoading}
              size="sm"
            >
              <Save className="w-4 h-4" />
              {isLoading ? "Creating..." : "Create Appointment"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Error Messages */}
        {dataError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{dataError}</span>
          </div>
        )}

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{errors.submit}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Picture */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appointment Title</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Dental care"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="text-lg"
                    />
                    {errors.title && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Picture Upload */}
                  <div className="space-y-2">
                    <Label>Picture</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                      {formData.picturePreview ? (
                        <div className="relative">
                          <img
                            src={formData.picturePreview}
                            alt="Preview"
                            className="w-full h-24 object-cover rounded"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={removePicture}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePictureUpload}
                          />
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ImageIcon className="w-8 h-8" />
                            <span className="text-xs">Upload</span>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Duration and Location */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">
                      Duration <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="duration"
                        type="number"
                        placeholder="00:30"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="flex-1"
                      />
                      <select
                        value={formData.durationUnit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            durationUnit: e.target.value as "hours" | "minutes",
                          })
                        }
                        className="px-3 border rounded-md bg-background"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                    {errors.duration && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.duration}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">
                      Location <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="location"
                      placeholder="e.g., Delta's Office"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                    {errors.location && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.location}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Book Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Book</CardTitle>
                <CardDescription>Configure booking settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Booking Type */}
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.bookingType === "user"}
                        onChange={() => setFormData({ ...formData, bookingType: "user" })}
                        className="w-4 h-4"
                      />
                      <User className="w-4 h-4" />
                      <span>User</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.bookingType === "resource"}
                        onChange={() => setFormData({ ...formData, bookingType: "resource" })}
                        className="w-4 h-4"
                      />
                      <MapPin className="w-4 h-4" />
                      <span>Resources</span>
                    </label>
                  </div>
                </div>

                {/* User Selection */}
                {formData.bookingType === "user" && (
                  <div className="space-y-3">
                    <Label>
                      Select Users <span className="text-red-500">*</span>
                    </Label>
                    {isLoadingData ? (
                      <p className="text-sm text-muted-foreground">Loading users...</p>
                    ) : users.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No users available. Add members to your organization first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {users.map((user) => (
                          <Button
                            key={user.id}
                            type="button"
                            variant={
                              formData.selectedUsers.includes(user.id) ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => toggleUser(user.id)}
                            className="justify-start"
                          >
                            {user.name}
                          </Button>
                        ))}
                      </div>
                    )}
                    {errors.users && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.users}
                      </p>
                    )}
                  </div>
                )}

                {/* Resource Selection */}
                {formData.bookingType === "resource" && (
                  <div className="space-y-3">
                    <Label>
                      Select Resources <span className="text-red-500">*</span>
                    </Label>
                    {isLoadingData ? (
                      <p className="text-sm text-muted-foreground">Loading resources...</p>
                    ) : resources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No resources available. Create resources first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resources.map((resource) => (
                          <Button
                            key={resource.id}
                            type="button"
                            variant={
                              formData.selectedResources.includes(resource.id)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => toggleResource(resource.id)}
                            className="justify-start"
                          >
                            {resource.name}
                          </Button>
                        ))}
                      </div>
                    )}
                    {errors.resources && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.resources}
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Assignment Type */}
                <div className="space-y-3">
                  <Label>Assignment</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.assignmentType === "automatic"}
                        onChange={() => setFormData({ ...formData, assignmentType: "automatic" })}
                        className="w-4 h-4"
                      />
                      <span>Automatically</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.assignmentType === "visitor"}
                        onChange={() => setFormData({ ...formData, assignmentType: "visitor" })}
                        className="w-4 h-4"
                      />
                      <span>By visitor</span>
                    </label>
                  </div>
                </div>

                {/* Manage Capacity */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="manageCapacity"
                    checked={formData.manageCapacity}
                    onChange={(e) =>
                      setFormData({ ...formData, manageCapacity: e.target.checked })
                    }
                    className="mt-1 w-4 h-4"
                  />
                  <div className="flex-1">
                    <Label htmlFor="manageCapacity" className="cursor-pointer font-normal">
                      Allow multiple appointments per time slot
                    </Label>
                    {formData.manageCapacity && (
                      <Input
                        type="number"
                        placeholder="Max capacity"
                        value={formData.capacity}
                        onChange={(e) =>
                          setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                        }
                        className="mt-2 max-w-[150px]"
                        min="1"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Card>
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <CardHeader className="pb-3">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                    <TabsTrigger value="schedule" className="text-xs sm:text-sm py-2">
                      Schedule
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="text-xs sm:text-sm py-2">
                      Questions
                    </TabsTrigger>
                    <TabsTrigger value="options" className="text-xs sm:text-sm py-2">
                      Options
                    </TabsTrigger>
                    <TabsTrigger value="misc" className="text-xs sm:text-sm py-2">
                      Misc
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent>
                  <TabsContent value="schedule" className="mt-0 space-y-4">
                    {/* Business Hours Info */}
                    {businessHours.length > 0 && formData.timeSlots.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-800 dark:text-blue-200">
                            <p className="font-medium">Schedule loaded from business hours</p>
                            <p className="text-blue-600 dark:text-blue-300 mt-1">
                              These time slots match your organization's business hours. You can modify them as needed or reload them anytime.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {businessHours.length === 0 && !isLoadingData && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            No business hours configured. Add time slots manually or set up your organization's business hours first.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto -mx-6 px-6">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                              Every
                            </th>
                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                              From
                            </th>
                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                              To
                            </th>
                            <th className="w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.timeSlots.map((slot, index) => (
                            <tr
                              key={slot.id}
                              className={`border-b ${index % 2 === 0 ? "bg-muted/20" : ""}`}
                            >
                              <td className="py-3 px-2">
                                <select
                                  value={slot.day}
                                  onChange={(e) => updateTimeSlot(slot.id, "day", e.target.value)}
                                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                >
                                  {daysOfWeek.map((day) => (
                                    <option key={day} value={day}>
                                      {day}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 px-2">
                                <Input
                                  type="time"
                                  value={slot.from}
                                  onChange={(e) => updateTimeSlot(slot.id, "from", e.target.value)}
                                  className="text-sm"
                                />
                              </td>
                              <td className="py-3 px-2">
                                <Input
                                  type="time"
                                  value={slot.to}
                                  onChange={(e) => updateTimeSlot(slot.id, "to", e.target.value)}
                                  className="text-sm"
                                />
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTimeSlot(slot.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {errors.timeSlots && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.timeSlots}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTimeSlot}
                        className="flex-1 sm:flex-none gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add a Line
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={loadBusinessHours}
                        disabled={businessHours.length === 0}
                        className="flex-1 sm:flex-none gap-2"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        Load Business Hours
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="questions" className="mt-0">
                    <div className="space-y-4">
                      {formData.questions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No questions added yet</p>
                          <Button
                            variant="outline"
                            className="mt-4 gap-2"
                            onClick={() => openQuestionModal()}
                          >
                            <Plus className="w-4 h-4" />
                            Add Question
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {formData.questions.map((question, index) => (
                              <div
                                key={question.id}
                                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {index + 1}. {question.question}
                                      </span>
                                      {question.required && (
                                        <Badge variant="destructive" className="text-xs">
                                          Required
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Badge variant="outline" className="text-xs">
                                        {question.type}
                                      </Badge>
                                      {question.options && question.options.length > 0 && (
                                        <span>• {question.options.length} options</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openQuestionModal(question)}
                                    >
                                      <Settings className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => deleteQuestion(question.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => openQuestionModal()}
                          >
                            <Plus className="w-4 h-4" />
                            Add Another Question
                          </Button>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="options" className="mt-0 space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isPaid"
                        checked={formData.isPaid}
                        onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isPaid" className="cursor-pointer font-normal">
                        This is a paid appointment
                      </Label>
                    </div>

                    {formData.isPaid && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="price">Price</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="price"
                              type="number"
                              placeholder="0.00"
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cancellationPolicy">Cancellation window (for users)</Label>
                          <select
                            id="cancellationPolicy"
                            value={formData.cancellationHours}
                            onChange={(e) => setFormData({ ...formData, cancellationHours: e.target.value })}
                            className="px-3 py-2 border rounded-md bg-background w-full"
                          >
                            <option value="0">Users can cancel anytime before the start</option>
                            <option value="1">Users can cancel up to 1 hour before</option>
                            <option value="6">Users can cancel up to 6 hours before</option>
                            <option value="24">Users can cancel up to 24 hours before</option>
                          </select>
                          <p className="text-xs text-muted-foreground">
                            This policy applies only to paid appointments. Free appointments can always be
                            cancelled anytime by users.
                          </p>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Add additional details about this appointment type..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="misc" className="mt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="introMessage">Introduction Page Message</Label>
                      <Textarea
                        id="introMessage"
                        placeholder="Welcome message shown to visitors before booking..."
                        value={formData.introMessage}
                        onChange={(e) =>
                          setFormData({ ...formData, introMessage: e.target.value })
                        }
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        This message will be displayed on the booking page before the form
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmationMessage">Confirmation Page Message</Label>
                      <Textarea
                        id="confirmationMessage"
                        placeholder="Thank you message shown after successful booking..."
                        value={formData.confirmationMessage}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmationMessage: e.target.value })
                        }
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        This message will be displayed after the appointment is successfully booked
                      </p>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Right Column - Summary Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>How visitors will see this</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.picturePreview && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={formData.picturePreview}
                      alt="Appointment preview"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}

                {formData.title && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Title</p>
                      <p className="font-semibold text-lg">{formData.title}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {formData.duration && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Duration</span>
                    </div>
                    <span className="font-medium">
                      {formData.duration} {formData.durationUnit}
                    </span>
                  </div>
                )}

                {formData.location && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>Location</span>
                    </div>
                    <span className="font-medium truncate ml-2">{formData.location}</span>
                  </div>
                )}

                {formData.price && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>Price</span>
                    </div>
                    <span className="font-semibold text-green-600">${formData.price}</span>
                  </div>
                )}

                {formData.selectedUsers.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Assigned Users</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {formData.selectedUsers.map((userId) => {
                          const user = users.find((u) => u.id === userId);
                          return (
                            <Badge key={userId} variant="secondary" className="text-xs">
                              {user?.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {formData.selectedResources.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>Assigned Resources</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {formData.selectedResources.map((resourceId) => {
                          const resource = resources.find((r) => r.id === resourceId);
                          return (
                            <Badge key={resourceId} variant="secondary" className="text-xs">
                              {resource?.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {formData.timeSlots.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Available Schedule</span>
                      </div>
                      <div className="text-xs space-y-1">
                        {formData.timeSlots.slice(0, 3).map((slot) => (
                          <div key={slot.id} className="flex items-center justify-between py-1">
                            <span className="text-muted-foreground">{slot.day}</span>
                            <span className="font-medium">
                              {slot.from} - {slot.to}
                            </span>
                          </div>
                        ))}
                        {formData.timeSlots.length > 3 && (
                          <p className="text-muted-foreground text-center pt-1">
                            +{formData.timeSlots.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {formData.description && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm line-clamp-4">{formData.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Question Modal */}
      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        onSave={addQuestion}
        editingQuestion={editingQuestion}
      />
    </div>
  );
}

// Question Modal Component
function QuestionModal({
  isOpen,
  onClose,
  onSave,
  editingQuestion,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
  editingQuestion: Question | null;
}) {
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<Question["type"]>("text");
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const resetForm = () => {
    setQuestionText("");
    setQuestionType("text");
    setIsRequired(false);
    setOptions([]);
    setNewOption("");
  };


  useEffect(() => {
    if (editingQuestion) {
      setQuestionText(editingQuestion.question);
      setQuestionType(editingQuestion.type);
      setIsRequired(editingQuestion.required);
      setOptions(editingQuestion.options || []);
    } else {
      resetForm();
    }
  }, [editingQuestion, isOpen]);

  const handleSave = () => {
    if (!questionText.trim()) return;

    const question: Question = {
      id: editingQuestion?.id || Date.now().toString(),
      question: questionText.trim(),
      type: questionType,
      required: isRequired,
      options: ["radio", "checkbox", "select"].includes(questionType) ? options : undefined,
    };

    onSave(question);
    resetForm();
  };

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const needsOptions = ["radio", "checkbox", "select"].includes(questionType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[100vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            {editingQuestion ? "Edit Question" : "Add Question"}
          </DialogTitle>
          <DialogDescription>
            Create a custom question for visitors to answer when booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="questionText">
              Question <span className="text-red-500">*</span>
            </Label>
            <Input
              id="questionText"
              placeholder="e.g., What is your concern?"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="questionType">Field Type</Label>
            <select
              id="questionType"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as Question["type"])}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="text">Short Text</option>
              <option value="textarea">Long Text</option>
              <option value="radio">Radio Buttons</option>
              <option value="checkbox">Checkboxes</option>
              <option value="select">Dropdown</option>
            </select>
          </div>

          {needsOptions && (
            <div className="space-y-3">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={option} disabled className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an option"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addOption}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {options.length === 0 && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Please add at least one option
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isRequired" className="cursor-pointer font-normal">
              Make this question required
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!questionText.trim() || (needsOptions && options.length === 0)}
          >
            {editingQuestion ? "Update Question" : "Add Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
