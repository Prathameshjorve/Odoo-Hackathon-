"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  Building2,
  Activity,
  RefreshCw,
  Download,
  FileText,
} from "lucide-react";
import { authStorage } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReportsData {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  averageBookingValue: number;
  peakHours: Array<{ hour: string; count: number }>;
  providerUtilization: Array<{ name: string; percentage: number; bookings: number }>;
  monthlyTrends: Array<{ month: string; appointments: number }>;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => {
    fetchReports();
  }, [timeRange]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);

      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        return;
      }

      const response = await adminApi.getReports(accessToken, parseInt(timeRange));

      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (err: any) {
      console.error("Fetch reports error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reports) return;

    // Create summary section
    const summaryHeaders = ["Metric", "Value"];
    const summaryData = [
      ["Report Period", `Last ${timeRange} days`],
      ["Export Date", new Date().toLocaleDateString()],
      ["Total Bookings", reports.totalAppointments.toString()],
      ["Completed Bookings", reports.completedAppointments.toString()],
      ["Cancelled Bookings", reports.cancelledAppointments.toString()],
      ["Completion Rate", `${reports.totalAppointments > 0 ? ((reports.completedAppointments / reports.totalAppointments) * 100).toFixed(1) : 0}%`],
      ["Cancellation Rate", `${reports.totalAppointments > 0 ? ((reports.cancelledAppointments / reports.totalAppointments) * 100).toFixed(1) : 0}%`],
      ["Total Revenue", `₹${reports.totalRevenue.toLocaleString()}`],
      ["Average Booking Value", `₹${reports.averageBookingValue.toFixed(2)}`],
    ];

    // Create peak hours section
    const peakHoursHeaders = ["Hour", "Bookings"];
    const peakHoursData = reports.peakHours.map(item => [item.hour, item.count.toString()]);

    // Create monthly trends section
    const monthlyHeaders = ["Month", "Bookings"];
    const monthlyData = reports.monthlyTrends.map(item => [item.month, item.appointments.toString()]);

    // Create organization section
    const orgHeaders = ["Organization", "Bookings", "Percentage"];
    const orgData = reports.providerUtilization.map(item => [
      item.name,
      item.bookings.toString(),
      `${item.percentage}%`
    ]);

    // Combine all sections
    const csvContent = [
      "ANALYTICS REPORT",
      "",
      "=== SUMMARY ===",
      summaryHeaders.join(","),
      ...summaryData.map(row => row.map(cell => `"${cell}"`).join(",")),
      "",
      "=== PEAK BOOKING HOURS ===",
      peakHoursHeaders.join(","),
      ...peakHoursData.map(row => row.map(cell => `"${cell}"`).join(",")),
      "",
      "=== MONTHLY TRENDS ===",
      monthlyHeaders.join(","),
      ...monthlyData.map(row => row.map(cell => `"${cell}"`).join(",")),
      "",
      "=== TOP ORGANIZATIONS ===",
      orgHeaders.join(","),
      ...orgData.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics_report_${timeRange}days_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (!reports) return;

    // Dynamically import jspdf and jspdf-autotable
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(225, 29, 72); // Rose-600 color
    doc.text("Analytics Report", pageWidth / 2, yPos, { align: "center" });
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Last ${timeRange} days | Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Summary", 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Value"]],
      body: [
        ["Total Bookings", reports.totalAppointments.toString()],
        ["Completed Bookings", reports.completedAppointments.toString()],
        ["Cancelled Bookings", reports.cancelledAppointments.toString()],
        ["Completion Rate", `${reports.totalAppointments > 0 ? ((reports.completedAppointments / reports.totalAppointments) * 100).toFixed(1) : 0}%`],
        ["Cancellation Rate", `${reports.totalAppointments > 0 ? ((reports.cancelledAppointments / reports.totalAppointments) * 100).toFixed(1) : 0}%`],
        ["Total Revenue", `₹${reports.totalRevenue.toLocaleString()}`],
        ["Average Booking Value", `₹${reports.averageBookingValue.toFixed(2)}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [225, 29, 72] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Peak Hours Section
    if (reports.peakHours.length > 0) {
      doc.setFontSize(14);
      doc.text("Peak Booking Hours", 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [["Hour", "Bookings"]],
        body: reports.peakHours.map(item => [item.hour, item.count.toString()]),
        theme: "striped",
        headStyles: { fillColor: [225, 29, 72] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Monthly Trends Section
    if (reports.monthlyTrends.length > 0) {
      doc.setFontSize(14);
      doc.text("Monthly Booking Trends", 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [["Month", "Bookings"]],
        body: reports.monthlyTrends.map(item => [item.month, item.appointments.toString()]),
        theme: "striped",
        headStyles: { fillColor: [225, 29, 72] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Top Organizations Section
    if (reports.providerUtilization.length > 0) {
      doc.setFontSize(14);
      doc.text("Top Organizations by Bookings", 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [["Organization", "Bookings", "Percentage"]],
        body: reports.providerUtilization.map(item => [
          item.name,
          item.bookings.toString(),
          `${item.percentage}%`
        ]),
        theme: "striped",
        headStyles: { fillColor: [225, 29, 72] },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    doc.save(`analytics_report_${timeRange}days_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="px-4 xl:px-6 py-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64 animate-pulse" />
            <Skeleton className="h-4 w-96 animate-pulse" />
          </div>
          <Skeleton className="h-10 w-32 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-32 animate-pulse" />
                <Skeleton className="h-4 w-4 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2 animate-pulse" />
                <Skeleton className="h-3 w-28 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-48 animate-pulse" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 xl:px-6 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Reports & Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!reports}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={fetchReports} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.totalAppointments.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All bookings in period
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reports?.completedAppointments.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {reports && reports.totalAppointments > 0
                ? ((reports.completedAppointments / reports.totalAppointments) * 100).toFixed(1)
                : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₹{reports?.totalRevenue.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Generated in period
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Booking Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{reports?.averageBookingValue.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per booking
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled
            </CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {reports?.cancelledAppointments || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {reports && reports.totalAppointments > 0
                ? ((reports.cancelledAppointments / reports.totalAppointments) * 100).toFixed(1)
                : 0}% cancellation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Peak Booking Hours Chart */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Peak Booking Hours
            </CardTitle>
            <CardDescription>Busiest times for appointments</CardDescription>
          </CardHeader>
          <CardContent>
            {reports?.peakHours && reports.peakHours.length > 0 ? (
              <ChartContainer
                config={{
                  count: {
                    label: "Bookings",
                    color: "#e11d48",
                  },
                }}
                className="h-[300px]"
              >
                <BarChart data={reports.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="#e11d48"
                    radius={[8, 8, 0, 0]}
                    className="transition-all duration-300"
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No booking data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends Chart */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Booking Trends
            </CardTitle>
            <CardDescription>Booking volumes over time</CardDescription>
          </CardHeader>
          <CardContent>
            {reports?.monthlyTrends && reports.monthlyTrends.length > 0 ? (
              <ChartContainer
                config={{
                  appointments: {
                    label: "Bookings",
                    color: "#e11d48",
                  },
                }}
                className="h-[300px]"
              >
                <LineChart data={reports.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    stroke="#e11d48"
                    strokeWidth={3}
                    dot={{ fill: "#e11d48", r: 4 }}
                    activeDot={{ r: 6, fill: "#be123c" }}
                    className="transition-all duration-300"
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No trend data available for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider Utilization */}
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Top Organizations by Bookings
          </CardTitle>
          <CardDescription>Performance metrics by organization</CardDescription>
        </CardHeader>
        <CardContent>
          {reports?.providerUtilization && reports.providerUtilization.length > 0 ? (
            <div className="space-y-4">
              {reports.providerUtilization.map((provider, i) => (
                <div key={i} className="space-y-2 group">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{provider.name}</span>
                    <span className="text-muted-foreground font-mono">
                      {provider.bookings} bookings ({provider.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500 ease-out group-hover:scale-x-105 origin-left bg-rose-600"
                      style={{ 
                        width: `${provider.percentage}%`,
                        opacity: 0.7 + (provider.percentage / 100) * 0.3
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No organization data available for this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
