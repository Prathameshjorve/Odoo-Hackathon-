"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Clock, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { userApi, organizationApi } from "@/lib/api";
import { BusinessHour } from "@/lib/types";
import { authStorage } from "@/lib/auth";
import { ConnectRazorpayButton } from "@/components/dashboard/organization/connect-razorpay-button";

interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function OrganizationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [razorpayConnected, setRazorpayConnected] = useState(false);
  const [isMember, setIsMember] = useState(false);

  const [orgData, setOrgData] = useState({
    name: "",
    location: "",
    description: "",
  });

  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(
    DAYS.map(day => ({
      day,
      isOpen: false,
      openTime: "09:00",
      closeTime: "17:00",
    }))
  );

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const accessToken = authStorage.getAccessToken();

      if (!accessToken) {
        setError("Not authenticated");
        return;
      }

      const response = await userApi.getMe(accessToken);

      if (response.success && response.data?.user) {
        const user = response.data.user;
        const isAdmin = user.role === "ORGANIZATION" && user.isMember === false;
        setIsOrgAdmin(isAdmin);
        setIsMember(Boolean(user.isMember));
        setRazorpayConnected(Boolean((user as any).razorpayConnected));
        const org = user.adminOrganization || user.organization;

        if (org) {
          setOrgData({
            name: org.name || "",
            location: org.location || "",
            description: org.description || "",
          });

          // Map business hours from API to component state
          if (org.businessHours && org.businessHours.length > 0) {
            const mappedHours = DAYS.map(day => {
              const apiHour = org.businessHours?.find(
                (h: BusinessHour) => h.day.toUpperCase() === day
              );

              if (apiHour) {
                return {
                  day,
                  isOpen: true,
                  openTime: apiHour.from,
                  closeTime: apiHour.to,
                };
              }

              return {
                day,
                isOpen: false,
                openTime: "09:00",
                closeTime: "17:00",
              };
            });

            setBusinessHours(mappedHours);
          }
        }
      } else {
        setError(response.message || "Failed to load organization data");
      }
    } catch (err: any) {
      console.error("Error fetching organization:", err);
      setError(err.message || "Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessHour = (index: number, field: string, value: any) => {
    const updated = [...businessHours];
    updated[index] = { ...updated[index], [field]: value };
    setBusinessHours(updated);
  };

  const handleSaveOrg = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const accessToken = authStorage.getAccessToken();

      if (!accessToken) {
        setError("Not authenticated");
        return;
      }

      const response = await organizationApi.updateOrganization(accessToken, {
        name: orgData.name,
        location: orgData.location,
        description: orgData.description,
      });

      if (response.success) {
        setSuccessMessage("Organization details updated successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || "Failed to update organization");
      }
    } catch (err: any) {
      console.error("Error updating organization:", err);
      setError(err.message || "Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveOrganization = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const accessToken = authStorage.getAccessToken();

      if (!accessToken) {
        setError("Not authenticated");
        return;
      }

      const response = await organizationApi.leaveOrganization(accessToken);

      if (response.success) {
        setSuccessMessage("You have left the organization successfully.");
        setIsMember(false);
        // Optionally, you might want to refresh the page or redirect user
      } else {
        setError(response.message || "Failed to leave organization");
      }
    } catch (err: any) {
      console.error("Error leaving organization:", err);
      setError(err.message || "Failed to leave organization");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHours = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const accessToken = authStorage.getAccessToken();

      if (!accessToken) {
        setError("Not authenticated");
        return;
      }

      // Convert to API format - only include open days
      const apiBusinessHours = businessHours
        .filter(hour => hour.isOpen)
        .map(hour => ({
          day: hour.day,
          from: hour.openTime,
          to: hour.closeTime,
        }));

      const response = await organizationApi.updateOrganization(accessToken, {
        businessHours: apiBusinessHours,
      });

      if (response.success) {
        setSuccessMessage("Business hours updated successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || "Failed to update business hours");
      }
    } catch (err: any) {
      console.error("Error updating business hours:", err);
      setError(err.message || "Failed to update business hours");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !orgData.name) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Settings</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchOrganizationData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization details
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="hours">Business Hours</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="orgName"
                    value={orgData.name}
                    onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                    className="pl-10"
                    placeholder="Enter organization name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgLocation">Location</Label>
                <Input
                  id="orgLocation"
                  value={orgData.location}
                  onChange={(e) => setOrgData({ ...orgData, location: e.target.value })}
                  placeholder="e.g., New York, NY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgDescription">Description</Label>
                <Textarea
                  id="orgDescription"
                  value={orgData.description}
                  onChange={(e) => setOrgData({ ...orgData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe your organization"
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <div className="flex items-center gap-3">
                  {isMember && !isOrgAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleLeaveOrganization}
                      disabled={saving}
                    >
                      Leave Organization
                    </Button>
                  )}
                  <Button onClick={handleSaveOrg} disabled={saving || isMember}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isOrgAdmin && (
            <Card className="mt-6 hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle>Payments (Razorpay)</CardTitle>
                <CardDescription>
                  Connect your organization&apos;s Razorpay account to receive payments for paid appointments directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">
                      OAuth Status: {razorpayConnected ? "Connected" : "Not connected"}
                    </div>
                    <p className="text-muted-foreground max-w-md">
                      Connect via Razorpay OAuth to enable payment processing for your paid appointments. Payments will be received directly in your Razorpay account.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConnectRazorpayButton isConnected={razorpayConnected} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Business Hours Tab */}
        <TabsContent value="hours">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Set your operating hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {businessHours.map((hour, index) => (
                  <div key={hour.day} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <Switch
                        checked={hour.isOpen}
                        onCheckedChange={(checked) =>
                          updateBusinessHour(index, "isOpen", checked)
                        }
                      />
                      <Label className="font-medium capitalize">
                        {hour.day.toLowerCase()}
                      </Label>
                    </div>

                    {hour.isOpen ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={hour.openTime}
                          onChange={(e) =>
                            updateBusinessHour(index, "openTime", e.target.value)
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={hour.closeTime}
                          onChange={(e) =>
                            updateBusinessHour(index, "closeTime", e.target.value)
                          }
                          className="w-32"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveHours} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Hours"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
