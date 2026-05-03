"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  TrendingUp,
  Users,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  Trophy,
} from "lucide-react";
import { organizationApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function OrganizationReportsPage() {
  const [days, setDays] = React.useState("30");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    fetchReports();
  }, [days]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError("");
      const token = authStorage.getAccessToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await organizationApi.getReports(token, parseInt(days));
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || "Failed to fetch reports");
      }
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Generating your reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="bg-destructive/10 p-4 rounded-full">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <button 
          onClick={fetchReports}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { stats, chartData, topAppointments } = data || { stats: {}, chartData: [], topAppointments: [] };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your performance, revenue, and customer engagement.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-lg p-1.5 shadow-sm">
          <div className="flex items-center gap-2 px-3 text-sm font-medium text-muted-foreground border-r mr-1">
            <Calendar className="w-4 h-4" />
            <span>Timeframe</span>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 h-8">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
              <SelectItem value="365">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Bookings", value: stats.total, sub: `Last ${days} days`, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { title: "Confirmed", value: stats.confirmed, sub: `${stats.total ? Math.round((stats.confirmed / stats.total) * 100) : 0}% success rate`, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
          { title: "Cancelled", value: stats.cancelled, sub: `${stats.total ? Math.round((stats.cancelled / stats.total) * 100) : 0}% cancellation`, icon: XCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
          { title: "Revenue", value: `₹${stats.revenue?.toLocaleString()}`, sub: "Total paid bookings", icon: CreditCard, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-muted/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Booking Volume</CardTitle>
                <CardDescription>Number of appointments booked over time.</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  interval={days === "30" ? 4 : 0}
                />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBookings)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>Income generated from paid appointments.</CardDescription>
              </div>
              <ArrowUpRight className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  interval={days === "30" ? 4 : 0}
                />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-500">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Top Appointments</CardTitle>
              <CardDescription>Most booked services by your customers.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {topAppointments.length > 0 ? (
              <div className="space-y-6">
                {topAppointments.map((app: any, i: number) => (
                  <div key={app.title} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{app.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{app.count} bookings</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-medium text-amber-600">₹{app.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(app.count / topAppointments[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground italic text-sm">No appointment data available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Efficiency Metrics</CardTitle>
              <CardDescription>Engagement and conversion rates.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8 mt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Completion Rate</span>
                  <span className="font-bold">{stats.total ? Math.round((stats.confirmed / stats.total) * 100) : 0}%</span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-1000" 
                    style={{ width: `${stats.total ? (stats.confirmed / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Percentage of bookings that were confirmed</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Churn Rate (Cancellations)</span>
                  <span className="font-bold text-rose-500">{stats.total ? Math.round((stats.cancelled / stats.total) * 100) : 0}%</span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all duration-1000" 
                    style={{ width: `${stats.total ? (stats.cancelled / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Percentage of bookings that were cancelled</p>
              </div>
              
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">Quick Insight</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Your peak booking volume was recorded in the last {days} days. 
                  {stats.revenue > 10000 ? " High-revenue appointments are driving growth." : " Focus on increasing confirmed bookings to boost revenue."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
