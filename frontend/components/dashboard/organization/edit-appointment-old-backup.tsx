"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    DollarSign,
    Plus,
    Trash2,
    MapPin,
    Calendar as CalendarIcon,
    Settings,
    HelpCircle,
    Eye,
    X,
} from "lucide-react";
import { organizationApi } from "@/lib/api";
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
    options?: string[];
}

interface EditAppointmentProps {
    appointmentId: string;
    onBack?: () => void;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function EditAppointment({ appointmentId, onBack }: EditAppointmentProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [currentTab, setCurrentTab] = useState("schedule");
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        duration: "30",
        durationUnit: "minutes" as "hours" | "minutes",
        location: "",
        isPaid: false,
        price: "",
        timeSlots: [] as TimeSlot[],
        questions: [] as Question[],
        introMessage: "",
        confirmationMessage: "",
        pictureUrl: "",
    });

    useEffect(() => {
        fetchAppointment();
    }, [appointmentId]);

    const fetchAppointment = async () => {
        try {
            setIsLoading(true);
            const token = authStorage.getAccessToken();

            if (!token) {
                setError("Authentication required");
                return;
            }

            const response = await organizationApi.getAppointment(token, appointmentId);

            if (response.success && response.data) {
                const appointment = response.data.appointment;

                // Convert schedule from backend format to timeSlots
                const timeSlots = Array.isArray(appointment.schedule)
                    ? appointment.schedule.map((slot: any, index: number) => ({
                        id: `slot-${index}`,
                        day: slot.day.charAt(0) + slot.day.slice(1).toLowerCase(),
                        from: slot.from,
                        to: slot.to,
                    }))
                    : [];

                // Convert questions from backend format
                const questions = Array.isArray(appointment.questions)
                    ? appointment.questions.map((q: any, index: number) => ({
                        id: q.id || `q-${index}`,
                        question: q.question,
                        type: q.type.toLowerCase() as Question["type"],
                        required: q.required || false,
                        options: q.options || [],
                    }))
                    : [];

                // Convert durationMinutes to duration and unit
                const durationMinutes = appointment.durationMinutes || 30;
                const duration = durationMinutes >= 60 && durationMinutes % 60 === 0
                    ? (durationMinutes / 60).toString()
                    : durationMinutes.toString();
                const durationUnit = durationMinutes >= 60 && durationMinutes % 60 === 0 ? "hours" : "minutes";

                setFormData({
                    title: appointment.title || "",
                    description: appointment.description || "",
                    duration,
                    durationUnit: durationUnit as "hours" | "minutes",
                    location: appointment.location || "",
                    isPaid: appointment.isPaid || false,
                    price: appointment.price ? appointment.price.toString() : "",
                    timeSlots,
                    questions,
                    introMessage: appointment.introMessage || "",
                    confirmationMessage: appointment.confirmationMessage || "",
                    pictureUrl: appointment.picture || "",
                });
            } else {
                setError("Failed to load appointment");
            }
        } catch (err: any) {
            console.error("Error fetching appointment:", err);
            setError(err.message || "Failed to load appointment");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        setError("");

        try {
            const token = authStorage.getAccessToken();

            if (!token) {
                setError("Authentication required");
                setIsSaving(false);
                return;
            }

            // Validate price when marked as paid
            const parsedPrice = formData.isPaid ? parseInt(formData.price, 10) : NaN;
            if (formData.isPaid && (Number.isNaN(parsedPrice) || parsedPrice <= 0)) {
                setError("Valid price is required for paid appointments");
                setIsSaving(false);
                return;
            }

            // Convert duration to minutes
            const durationMinutes =
                formData.durationUnit === "hours"
                    ? parseFloat(formData.duration) * 60
                    : parseFloat(formData.duration);

            // Convert schedule to backend format (uppercase days)
            const schedule = formData.timeSlots.map((slot) => ({
                day: slot.day.toUpperCase(),
                from: slot.from,
                to: slot.to,
            }));

            // Convert questions to backend format
            const questions = formData.questions.map((q) => ({
                id: q.id,
                question: q.question,
                type: q.type.toUpperCase(),
                required: q.required,
                options: q.options || [],
            }));

            const updateData = {
                title: formData.title,
                description: formData.description || null,
                durationMinutes: Math.round(durationMinutes),
                location: formData.location || null,
                isPaid: formData.isPaid,
                price: formData.isPaid ? parsedPrice : null,
                schedule,
                questions,
                introMessage: formData.introMessage || null,
                confirmationMessage: formData.confirmationMessage || null,
            };

            const response = await organizationApi.updateAppointment(token, appointmentId, updateData);

            if (response.success) {
                setSuccess(true);
                setTimeout(() => {
                    if (onBack) onBack();
                    else router.push("/dashboard/org/appointments");
                }, 2000);
            } else {
                setError(response.message || "Failed to update appointment");
            }
        } catch (err: any) {
            console.error("Error updating appointment:", err);
            setError(err.message || "Failed to update appointment");
        } finally {
            setIsSaving(false);
        }
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

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Loading appointment...</p>
                </div>
            </div>
        );
    }

    // Success state
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
                                <h2 className="text-2xl sm:text-3xl font-bold">Appointment Updated!</h2>
                                <p className="text-muted-foreground text-sm sm:text-base">
                                    {formData.title} has been successfully updated.
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 mx-auto">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Edit Appointment</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Update appointment settings
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
                            disabled={isSaving}
                            size="sm"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8">
                {/* Error Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Title Section */}
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
                                    </div>

                                    {/* Picture Display (Read-only) */}
                                    <div className="space-y-2">
                                        <Label>Picture</Label>
                                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                                            {formData.pictureUrl ? (
                                                <div className="relative">
                                                    <img
                                                        src={formData.pictureUrl}
                                                        alt="Appointment"
                                                        className="w-full h-24 object-cover rounded"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
                                                        <span className="text-xs text-white font-medium">Read Only</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <span className="text-xs">No image</span>
                                                </div>
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
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tabs Section */}
                        <Card>
                            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                                <CardHeader className="pb-3">
                                    <TabsList className="grid w-full grid-cols-3 h-auto">
                                        <TabsTrigger value="schedule" className="text-xs sm:text-sm py-2">
                                            Schedule
                                        </TabsTrigger>
                                        <TabsTrigger value="questions" className="text-xs sm:text-sm py-2">
                                            Questions
                                        </TabsTrigger>
                                        <TabsTrigger value="misc" className="text-xs sm:text-sm py-2">
                                            Options & Misc
                                        </TabsTrigger>
                                    </TabsList>
                                </CardHeader>

                                <CardContent>
                                    <TabsContent value="schedule" className="mt-0 space-y-4">
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

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addTimeSlot}
                                            className="w-full gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add a Line
                                        </Button>
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

                                    <TabsContent value="misc" className="mt-0 space-y-4">
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

                                        <Separator />

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
                                {formData.pictureUrl && (
                                    <div className="rounded-lg overflow-hidden border">
                                        <img
                                            src={formData.pictureUrl}
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

// Question Modal Component (same as in create-appointment.tsx)
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
