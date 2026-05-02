"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCheck,
  Calendar,
  User,
  AlertCircle,
  Info,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { notificationApi, userApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { Notification, User as UserType } from "@/lib/types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserType | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUserAndNotifications();
  }, []);

  const fetchUserAndNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const token = authStorage.getAccessToken();
      if (!token) {
        setError("Please login to view notifications");
        return;
      }

      // Fetch user data
      const userResponse = await userApi.getMe(token);
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data.user);
      }

      // Fetch notifications
      const response = await notificationApi.getNotifications(token, {
        page: 1,
        limit: 100,
      });

      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      setError(error.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.read;
    
    // Filter by notification type category
    if (activeTab === "appointment") {
      return notification.type.includes("APPOINTMENT");
    }
    if (activeTab === "booking") {
      return notification.type.includes("BOOKING");
    }
    if (activeTab === "organization") {
      return notification.type.includes("MEMBER") || 
             notification.type.includes("RESOURCE") || 
             notification.type.includes("ORGANIZATION");
    }
    if (activeTab === "account") {
      return notification.type.includes("EMAIL") || 
             notification.type.includes("PASSWORD");
    }
    
    return false;
  });

  const markAsRead = async (id: string) => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) return;

      await notificationApi.markAsRead(token, id);
      
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) return;

      await notificationApi.markAllAsRead(token);
      
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) return;

      await notificationApi.deleteNotification(token, id);
      
      const notification = notifications.find((n) => n.id === id);
      setNotifications(notifications.filter((n) => n.id !== id));
      if (notification && !notification.read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const deleteAllRead = async () => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) return;

      await notificationApi.deleteAllRead(token);
      
      setNotifications(notifications.filter((n) => !n.read));
    } catch (error) {
      console.error("Failed to delete read notifications:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("APPOINTMENT") || type.includes("BOOKING")) {
      return <Calendar className="w-5 h-5 text-blue-600" />;
    }
    if (type.includes("MEMBER") || type.includes("USER")) {
      return <User className="w-5 h-5 text-green-600" />;
    }
    if (type.includes("RESOURCE") || type.includes("ORGANIZATION")) {
      return <Info className="w-5 h-5 text-purple-600" />;
    }
    if (type.includes("EMAIL") || type.includes("PASSWORD")) {
      return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
    return <Bell className="w-5 h-5 text-gray-600" />;
  };

  const getNotificationBg = (type: string) => {
    if (type.includes("APPOINTMENT") || type.includes("BOOKING")) {
      return "bg-blue-50 dark:bg-blue-950";
    }
    if (type.includes("MEMBER") || type.includes("USER")) {
      return "bg-green-50 dark:bg-green-950";
    }
    if (type.includes("RESOURCE") || type.includes("ORGANIZATION")) {
      return "bg-purple-50 dark:bg-purple-950";
    }
    if (type.includes("EMAIL") || type.includes("PASSWORD")) {
      return "bg-orange-50 dark:bg-orange-950";
    }
    return "bg-gray-50 dark:bg-gray-950";
  };

  // Determine if user is an organizer
  const isOrganizer = user?.role === "ORGANIZATION" || user?.isAdmin;

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-8 h-8" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isOrganizer 
              ? "Stay updated with your organization activities" 
              : "Stay updated with your bookings and activities"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" onClick={deleteAllRead}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Read
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{notifications.length}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
              <p className="text-sm text-muted-foreground">Unread</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {notifications.filter((n) => n.type.includes("APPOINTMENT") || n.type.includes("BOOKING")).length}
              </div>
              <p className="text-sm text-muted-foreground">
                {isOrganizer ? "Appointments" : "Bookings"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {notifications.filter((n) => 
                  n.type.includes("MEMBER") || 
                  n.type.includes("RESOURCE") || 
                  n.type.includes("ORGANIZATION")
                ).length}
              </div>
              <p className="text-sm text-muted-foreground">
                {isOrganizer ? "Organization" : "Updates"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value={isOrganizer ? "appointment" : "booking"}>
            {isOrganizer ? "Appointments" : "Bookings"}
          </TabsTrigger>
          <TabsTrigger value="organization">
            {isOrganizer ? "Organization" : "Updates"}
          </TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You're all caught up!
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-md ${
                  !notification.read
                    ? "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg ${getNotificationBg(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{notification.title}</h3>
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCheck className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
