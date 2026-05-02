"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Save, AlertCircle, Loader2 } from "lucide-react";
import { authStorage } from "@/lib/auth";
import { userApi } from "@/lib/api";

export default function UserProfile() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const token = authStorage.getAccessToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await userApi.getMe(token);
      if (response.success && response.data?.user) {
        const user = response.data.user;
        const nameParts = (user.name || "").split(" ");
        setFormData({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: user.email,
          phone: user.phone || "",
        });
      }
    } catch (err: any) {
      console.error("Error fetching user data:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    appointmentReminders: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSaveProfile = async () => {
    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const token = authStorage.getAccessToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const updateData = {
        name: fullName,
        email: formData.email,
        phone: formData.phone,
      };
      
      console.log("Sending update data:", updateData);
      
      const response = await userApi.updateProfile(token, updateData);

      console.log("Update response:", response);

      if (response.success) {
        setSuccessMessage(response.message || "Profile updated successfully!");
        // Update local storage
        const userData = authStorage.getUser();
        if (userData) {
          authStorage.setUser({ ...userData, name: fullName, email: formData.email });
        }
      } else {
        setError(response.message || "Failed to update profile");
      }
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "An error occurred while updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    console.log("Saving notifications:", notificationSettings);
  };

  const handleChangePassword = async () => {
    setError("");
    setSuccessMessage("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsSaving(true);

    try {
      const token = authStorage.getAccessToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await userApi.updateProfile(token, {
        password: passwordData.newPassword,
        currentPassword: passwordData.currentPassword,
      });

      if (response.success) {
        setSuccessMessage("Password updated successfully! Please log in again.");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        // Logout after password change
        setTimeout(() => {
          authStorage.clearAll();
          window.location.href = "/login";
        }, 2000);
      } else {
        setError(response.message || "Failed to update password");
      }
    } catch (err: any) {
      console.error("Error updating password:", err);
      setError(err.message || "An error occurred while updating password");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>

      {/* Profile Card */}
      <Card className="hover:shadow-md transition-all duration-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="text-2xl">
                {getInitials(formData.firstName, formData.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">
                {formData.firstName} {formData.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{formData.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailNotifications: checked,
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Appointment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminders before appointments
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.appointmentReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        appointmentReminders: checked,
                      })
                    }
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
