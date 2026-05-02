"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authStorage, clearAuthData } from "@/lib/auth";
import { userApi } from "@/lib/api";

const weekDays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [businessHours, setBusinessHours] = useState(
    weekDays.map((day) => ({
      day,
      enabled: day !== "SATURDAY" && day !== "SUNDAY",
      from: "09:00",
      to: "17:00",
    }))
  );

  const handleTimeChange = (
    index: number,
    field: "from" | "to",
    value: string
  ) => {
    const updated = [...businessHours];
    updated[index][field] = value;
    setBusinessHours(updated);
  };

  const toggleDay = (index: number) => {
    const updated = [...businessHours];
    updated[index].enabled = !updated[index].enabled;
    setBusinessHours(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = e.target as any;
    const name = formData.name.value.trim();
    const location = formData.location.value.trim();
    const description = formData.description.value.trim();

    // Validation
    if (!name) {
      setError("Business name is required");
      setIsSubmitting(false);
      return;
    }

    if (!location) {
      setError("Business location is required");
      setIsSubmitting(false);
      return;
    }

    const enabledBusinessHours = businessHours
      .filter((d) => d.enabled)
      .map(({ day, from, to }) => ({ day, from, to }));

    if (enabledBusinessHours.length === 0) {
      setError("Please select at least one business day");
      setIsSubmitting(false);
      return;
    }

    const business = {
      name,
      location,
      description: description || undefined,
      businessHours: enabledBusinessHours,
    };

    try {
      // Get access token
      const accessToken = authStorage.getAccessToken();

      if (!accessToken) {
        setError("Authentication required. Please login again.");
        setIsSubmitting(false);
        return;
      }

      // Call API to convert user to organization
      const response = await userApi.convertToOrganization(accessToken, business);

      if (response.success) {
        setSuccess(true);

        // Update user data in storage with new role
        if (response.data?.user) {
          const currentUser = authStorage.getUser();
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              role: "ORGANIZATION" as const,
              isMember: false,
              adminOrganization: response.data.organization,
            };
            authStorage.setUser(updatedUser);
          }
        }

        // Show success message briefly, then redirect
        setTimeout(() => {
          router.push("/dashboard/org");
        }, 2000);
      } else {
        setError(response.message || "Failed to convert to organization");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error("Conversion error:", err);

      if (err.isUnauthorized) {
        setError("Your session has expired. Please login again.");
        setTimeout(() => {
          clearAuthData();
          router.push("/login");
        }, 2000);
      } else {
        setError(err.message || "An error occurred during conversion. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 mx-auto w-fit mb-6">
            <CheckCircle2 className="size-16 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-4">
            Conversion Successful!
          </h1>
          <p className="text-base text-muted-foreground mb-6">
            Your account has been successfully converted to an organization account.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Redirecting to organization dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                Set up your organization
              </h1>
            </div>
          </div>
          <p className="text-base text-muted-foreground">
            Tell us a few details about your business to get started. Once converted, you'll have access to organization features.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-900 dark:text-red-100">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-8 rounded-lg border border-border bg-card p-6 shadow-sm">
            {/* Business Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Business Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your business name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Business Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  placeholder="City, State or Address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description about your business"
                  rows={3}
                />
              </div>
            </div>

            {/* Business Hours */}
            <div className="space-y-4 border-t border-border pt-6">
              <h2 className="text-lg font-medium text-foreground">
                Business Hours
              </h2>

              <div className="space-y-3">
                {businessHours.map((day, index) => (
                  <div
                    key={day.day}
                    className="flex items-center gap-4 rounded-md border border-border p-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`w-24 text-left text-sm font-medium ${day.enabled
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                        }`}
                    >
                      {day.day}
                    </button>

                    <Input
                      type="time"
                      value={day.from}
                      disabled={!day.enabled}
                      onChange={(e) =>
                        handleTimeChange(index, "from", e.target.value)
                      }
                    />

                    <span className="text-sm text-muted-foreground">to</span>

                    <Input
                      type="time"
                      value={day.to}
                      disabled={!day.enabled}
                      onChange={(e) =>
                        handleTimeChange(index, "to", e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end border-t border-border pt-6">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Building2 className="size-4 mr-2" />
                    Create Organization
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
