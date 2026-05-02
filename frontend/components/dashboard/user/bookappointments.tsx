"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";

// Types
interface AppointmentType {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  color: string;
  settings: {
    max_bookings_per_slot: number;
    advance_payment_required: boolean;
    manual_confirmation_required: boolean;
  };
}

interface Provider {
  id: string;
  name: string;
  type: "user" | "resource";
  description: string;
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  available_capacity: number;
  total_capacity: number;
}

interface CustomQuestion {
  id: string;
  question_text: string;
  question_type: "text" | "textarea" | "select" | "radio";
  options?: string[];
  is_required: boolean;
}

// Dummy Data
const dummyAppointmentTypes: AppointmentType[] = [
  {
    id: "1",
    name: "General Consultation",
    description: "Schedule a general consultation session with our expert team",
    duration_minutes: 30,
    price: 50,
    color: "#3b82f6",
    settings: {
      max_bookings_per_slot: 1,
      advance_payment_required: false,
      manual_confirmation_required: false,
    },
  },
  {
    id: "2",
    name: "Technical Support",
    description: "Get technical assistance and support for your issues",
    duration_minutes: 45,
    price: 75,
    color: "#10b981",
    settings: {
      max_bookings_per_slot: 2,
      advance_payment_required: true,
      manual_confirmation_required: false,
    },
  },
  {
    id: "3",
    name: "Training Session",
    description: "Comprehensive training on tools and best practices",
    duration_minutes: 90,
    price: 150,
    color: "#f59e0b",
    settings: {
      max_bookings_per_slot: 10,
      advance_payment_required: true,
      manual_confirmation_required: true,
    },
  },
];

const dummyProviders: Provider[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    type: "user",
    description: "Senior Consultant with 10+ years experience",
  },
  {
    id: "2",
    name: "John Smith",
    type: "user",
    description: "Technical Support Specialist",
  },
  {
    id: "3",
    name: "Conference Room A",
    type: "resource",
    description: "Main conference room with video equipment",
  },
];

const dummyTimeSlots: TimeSlot[] = [
  { id: "1", start_time: "09:00", end_time: "09:30", available_capacity: 1, total_capacity: 1 },
  { id: "2", start_time: "10:00", end_time: "10:30", available_capacity: 1, total_capacity: 1 },
  { id: "3", start_time: "11:00", end_time: "11:30", available_capacity: 2, total_capacity: 2 },
  { id: "4", start_time: "14:00", end_time: "14:30", available_capacity: 1, total_capacity: 1 },
  { id: "5", start_time: "15:00", end_time: "15:30", available_capacity: 0, total_capacity: 1 },
  { id: "6", start_time: "16:00", end_time: "16:30", available_capacity: 1, total_capacity: 1 },
];

const dummyCustomQuestions: CustomQuestion[] = [
  {
    id: "1",
    question_text: "What is the reason for your appointment?",
    question_type: "textarea",
    is_required: true,
  },
  {
    id: "2",
    question_text: "How did you hear about us?",
    question_type: "select",
    options: ["Google Search", "Social Media", "Friend Referral", "Advertisement", "Other"],
    is_required: false,
  },
  {
    id: "3",
    question_text: "Preferred communication method",
    question_type: "radio",
    options: ["Email", "Phone", "SMS"],
    is_required: true,
  },
];

// Main Component
export default function UserBookAppointment() {
  const [step, setStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Form State
  const [selectedAppointmentType, setSelectedAppointmentType] = React.useState<AppointmentType | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<Provider | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState<TimeSlot | null>(null);
  const [capacity, setCapacity] = React.useState(1);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = React.useState("card");

  // Simulate API calls with loading
  const simulateLoading = async (duration: number = 1000) => {
    setIsLoading(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, duration));
    setIsLoading(false);
  };

  const handleSelectAppointmentType = async (appointmentType: AppointmentType) => {
    setSelectedAppointmentType(appointmentType);
    await simulateLoading(500);
    setStep(2);
  };

  const handleSelectProvider = async (provider: Provider) => {
    setSelectedProvider(provider);
    await simulateLoading(500);
    setStep(3);
  };

  const handleSelectDate = async (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      await simulateLoading(800);
      setStep(4);
    }
  };

  const handleSelectTimeSlot = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    setStep(5);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleQuestionsSubmit = async () => {
    // Validate required questions
    const requiredQuestions = dummyCustomQuestions.filter((q) => q.is_required);
    const missingAnswers = requiredQuestions.filter((q) => !answers[q.id]);

    if (missingAnswers.length > 0) {
      setError("Please answer all required questions");
      return;
    }

    await simulateLoading(500);
    setError(null);
    setStep(6);
  };

  const handlePaymentSubmit = async () => {
    setError(null);
    await simulateLoading(2000);

    // Simulate random success/failure
    const success = Math.random() > 0.2;

    if (success) {
      setStep(7);
    } else {
      setError("Payment failed. Please try again.");
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedAppointmentType(null);
    setSelectedProvider(null);
    setSelectedDate(undefined);
    setSelectedTimeSlot(null);
    setCapacity(1);
    setAnswers({});
    setPaymentMethod("card");
    setError(null);
  };

  // Step Components
  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {[
          "Appointment Type",
          "Provider",
          "Date",
          "Time Slot",
          "Details",
          "Payment",
          "Confirmation",
        ].map((label, index) => {
          const stepNumber = index + 1;
          const isActive = step === stepNumber;
          const isCompleted = step > stepNumber;

          return (
            <div key={stepNumber} className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stepNumber}
              </div>
              <span className="text-xs mt-2 text-center hidden sm:block">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <h2 className="text-3xl font-bold mb-2">Select Appointment Type</h2>
      <p className="text-muted-foreground mb-6">Choose the type of appointment you need</p>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dummyAppointmentTypes.map((type) => (
            <Card
              key={type.id}
              className="hover:shadow-lg transition-all cursor-pointer hover:border-primary"
              onClick={() => handleSelectAppointmentType(type)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{type.name}</CardTitle>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                </div>
                <CardDescription className="line-clamp-2">{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{type.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span>${type.price}</span>
                  </div>
                </div>
                <Button className="w-full">Select</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-3xl font-bold mb-2">Select Provider</h2>
      <p className="text-muted-foreground mb-6">
        Choose who you'd like to book with for {selectedAppointmentType?.name}
      </p>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {dummyProviders.map((provider) => (
            <Card
              key={provider.id}
              className="hover:shadow-lg transition-all cursor-pointer hover:border-primary"
              onClick={() => handleSelectProvider(provider)}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {provider.type === "user" ? "Provider" : "Resource"}
                    </Badge>
                    <CardDescription className="mt-2">{provider.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-2">Select Date</h2>
      <p className="text-muted-foreground mb-6">Choose your preferred appointment date</p>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDate}
              disabled={(date) => date < new Date() || date > new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
              className="rounded-md border mx-auto"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-2">Select Time Slot</h2>
      <p className="text-muted-foreground mb-6">
        Available slots for {selectedDate && format(selectedDate, "MMMM d, yyyy")}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {dummyTimeSlots.map((slot) => {
            const isAvailable = slot.available_capacity > 0;

            return (
              <Card
                key={slot.id}
                className={`cursor-pointer transition-all ${
                  isAvailable
                    ? "hover:border-primary hover:shadow-md"
                    : "opacity-50 cursor-not-allowed"
                } ${selectedTimeSlot?.id === slot.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => isAvailable && handleSelectTimeSlot(slot)}
              >
                <CardContent className="pt-6 pb-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{slot.start_time}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isAvailable ? (
                      <>
                        {slot.available_capacity}/{slot.total_capacity} available
                      </>
                    ) : (
                      <span className="text-red-500">Fully Booked</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(selectedAppointmentType?.settings?.max_bookings_per_slot ?? 0) > 1 && selectedTimeSlot && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Capacity</CardTitle>
            <CardDescription>How many slots would you like to book?</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={capacity.toString()} onValueChange={(v) => setCapacity(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: Math.min(selectedTimeSlot.available_capacity, 5) },
                  (_, i) => i + 1
                ).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? "slot" : "slots"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedTimeSlot && (
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setStep(5)}>
            Continue
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-2">Additional Details</h2>
      <p className="text-muted-foreground mb-6">Please answer a few questions</p>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {dummyCustomQuestions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label className="text-base">
                {question.question_text}
                {question.is_required && <span className="text-red-500 ml-1">*</span>}
              </Label>

              {question.question_type === "text" && (
                <Input
                  value={answers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Your answer"
                />
              )}

              {question.question_type === "textarea" && (
                <Textarea
                  value={answers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Your answer"
                  rows={4}
                />
              )}

              {question.question_type === "select" && (
                <Select
                  value={answers[question.id] || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {question.question_type === "radio" && (
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  {question.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                      <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleQuestionsSubmit} disabled={isLoading}>
          {isLoading ? "Processing..." : "Continue to Payment"}
          <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep6 = () => {
    const requiresPayment = selectedAppointmentType?.settings.advance_payment_required;
    const totalAmount = (selectedAppointmentType?.price || 0) * capacity;

    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Review & Payment</h2>
        <p className="text-muted-foreground mb-6">Review your booking details</p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Appointment Type:</span>
              <span className="font-semibold">{selectedAppointmentType?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-semibold">{selectedProvider?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-semibold">
                {selectedDate && format(selectedDate, "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-semibold">{selectedTimeSlot?.start_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-semibold">{selectedAppointmentType?.duration_minutes} min</span>
            </div>
            {capacity > 1 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-semibold">{capacity} slots</span>
              </div>
            )}
            <div className="border-t pt-4 flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span>${totalAmount}</span>
            </div>
          </CardContent>
        </Card>

        {requiresPayment ? (
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>This appointment requires advance payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Credit/Debit Card</span>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" placeholder="123" type="password" />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                <CheckCircle2 className="w-5 h-5" />
                <span>No payment required. Your appointment will be confirmed.</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={handlePaymentSubmit} disabled={isLoading} size="lg">
            {isLoading ? "Processing..." : requiresPayment ? "Pay & Confirm Booking" : "Confirm Booking"}
          </Button>
        </div>
      </div>
    );
  };

  const renderStep7 = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Booking Confirmed!</h2>
        <p className="text-muted-foreground">
          {selectedAppointmentType?.settings.manual_confirmation_required
            ? "Your appointment request has been submitted and is pending confirmation from the organizer."
            : "Your appointment has been successfully booked."}
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="text-left space-y-3">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold">
                {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
              </div>
              <div className="text-sm text-muted-foreground">{selectedTimeSlot?.start_time}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold">{selectedProvider?.name}</div>
              <div className="text-sm text-muted-foreground">{selectedAppointmentType?.name}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold">{selectedAppointmentType?.duration_minutes} minutes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground mb-6">
        A confirmation email has been sent to your registered email address with all the details.
      </p>

      <div className="flex gap-4 justify-center">
        <Button onClick={resetBooking}>Book Another Appointment</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard/appointments")}>
          View My Appointments
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto px-4 ">
        {step < 7 && renderStepIndicator()}

        {step > 1 && step < 7 && (
          <div className="mb-6">
            <Button variant="ghost" onClick={handleBack}>
              <ChevronLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
        {step === 7 && renderStep7()}
      </div>
    </div>
  );
}
