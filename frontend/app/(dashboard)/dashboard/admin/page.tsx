"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Building2,
  Calendar,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { authStorage } from "@/lib/auth";
import { adminApi } from "@/lib/api";

interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalAppointments: number;
  totalBookings: number;
  activeUsers: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  revenueThisMonth: number;
}

interface ActivityItem {
  type: string;
  icon: string;
  text: string;
  time: string;
  color: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        setError("Not authenticated");
        return;
      }

      // Fetch stats and activity in parallel
      const [statsResponse, activityResponse] = await Promise.all([
        adminApi.getStats(accessToken),
        adminApi.getRecentActivity(accessToken, 10),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        setError(statsResponse.message || "Failed to load statistics");
      }

      if (activityResponse.success && activityResponse.data) {
        setActivities(activityResponse.data.activities);
      }
    } catch (err: any) {
      console.error("Fetch admin data error:", err);
      setError(err.message || "Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return Users;
      case 'Calendar': return Calendar;
      case 'Building2': return Building2;
      case 'CheckCircle2': return CheckCircle2;
      default: return Activity;
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 xl:px-6 py-6 space-y-6 animate-in fade-in duration-300">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 animate-pulse" />
          <Skeleton className="h-4 w-96 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24 animate-pulse" />
                <Skeleton className="h-4 w-4 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2 animate-pulse" />
                <Skeleton className="h-3 w-32 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="overflow-hidden">
          <CardHeader>
            <Skeleton className="h-6 w-48 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 pb-4">
                  <Skeleton className="h-10 w-10 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full animate-pulse" />
                    <Skeleton className="h-3 w-24 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="px-4 xl:px-6 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Statistics</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchAdminData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 xl:px-6 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          System-level monitoring and control
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All registered users
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Users (30d)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.activeUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Joined last 30 days
            </p>
          </CardContent>
        </Card>

        {/* Total Organizations */}
        <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Service providers
            </p>
          </CardContent>
        </Card>

        {/* Total Bookings */}
        <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalBookings.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All bookings
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.pendingAppointments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.completedAppointments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully finished
            </p>
          </CardContent>
        </Card>

        {/* Revenue This Month */}
        <Card className="md:col-span-2 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₹{stats?.revenueThisMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total earnings this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, i) => {
                const IconComponent = getActivityIcon(activity.icon);
                return (
                  <div key={i} className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0 hover:bg-accent/50 -mx-2 px-2 py-2 rounded-lg transition-colors duration-200 cursor-pointer">
                    <div className="p-2 rounded-lg bg-muted">
                      <IconComponent className={`h-4 w-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.text}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
