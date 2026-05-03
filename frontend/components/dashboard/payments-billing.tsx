"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IndianRupee,
  Eye,
  Search,
  Clock,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { authStorage } from "@/lib/auth";
import { bookingApi } from "@/lib/api";
import { AdminRefundDashboard } from "@/components/refunds/AdminRefundDashboard";

interface Transaction {
  id: string;
  invoiceNumber: string;
  client: string;
  service: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  date: string;
}

export default function PaymentsBilling() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = authStorage.getAccessToken();
      if (!token) return;

      const response = await bookingApi.getOrganizationBookings(token);
      if (response.success && response.data) {
        // Transform bookings into transactions
        const mappedTransactions: Transaction[] = response.data.map((booking: any) => ({
          id: booking.id,
          invoiceNumber: `INV-${booking.id.substring(0, 8).toUpperCase()}`,
          client: booking.user?.name || "Unknown User",
          service: booking.appointment?.title || "Booking",
          amount: booking.totalAmount || 0,
          status: booking.paymentStatus === "PAID" ? "paid" : booking.paymentStatus === "FAILED" ? "failed" : "pending",
          date: booking.createdAt,
        }));
        setTransactions(mappedTransactions);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalRevenue: transactions
      .filter((t) => t.status === "paid")
      .reduce((acc, t) => acc + t.amount, 0),
    pending: transactions.filter((t) => t.status === "pending").length,
  };

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track your actual transactions and revenue</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">actual paid transactions</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="refunds">Refund Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          {/* Transactions */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription className="mt-1">
                    {loading ? "Loading transactions..." : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? "s" : ""}`}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p>Fetching real transaction data...</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                {transaction.invoiceNumber}
                              </TableCell>
                              <TableCell>{transaction.client}</TableCell>
                              <TableCell className="max-w-48 truncate">
                                {transaction.service}
                              </TableCell>
                              <TableCell>₹{transaction.amount.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(transaction.status)} variant="secondary">
                                  {transaction.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {filteredTransactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        No transactions found
                      </div>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <div key={transaction.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{transaction.invoiceNumber}</p>
                              <p className="text-sm text-muted-foreground">{transaction.client}</p>
                            </div>
                            <Badge className={getStatusColor(transaction.status)} variant="secondary">
                              {transaction.status}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm">{transaction.service}</p>
                            <p className="text-sm font-medium">₹{transaction.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(transaction.date), "MMM dd, yyyy")}
                            </p>
                          </div>

                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds">
          <AdminRefundDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
