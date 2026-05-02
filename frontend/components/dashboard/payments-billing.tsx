"use client";

import { useState } from "react";
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
import {
  DollarSign,
  Eye,
  Search,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  invoiceNumber: string;
  client: string;
  service: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  date: string;
}

const dummyTransactions: Transaction[] = [
  {
    id: "1",
    invoiceNumber: "INV-2025-001",
    client: "John Doe",
    service: "Medical Consultation",
    amount: 150,
    status: "paid",
    date: "2025-01-20",
  },
  {
    id: "2",
    invoiceNumber: "INV-2025-002",
    client: "Jane Smith",
    service: "Dental Cleaning",
    amount: 120,
    status: "paid",
    date: "2025-01-19",
  },
  {
    id: "3",
    invoiceNumber: "INV-2025-003",
    client: "Bob Wilson",
    service: "Physical Therapy",
    amount: 200,
    status: "pending",
    date: "2025-01-18",
  },
];

export default function PaymentsBilling() {
  const [transactions] = useState<Transaction[]>(dummyTransactions);
  const [searchQuery, setSearchQuery] = useState("");

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">Track your transactions and revenue</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription className="mt-1">
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
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
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {transaction.invoiceNumber}
                    </TableCell>
                    <TableCell>{transaction.client}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {transaction.service}
                    </TableCell>
                    <TableCell>${transaction.amount}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredTransactions.map((transaction) => (
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
                  <p className="text-sm font-medium">${transaction.amount}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(transaction.date), "MMM dd, yyyy")}
                  </p>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
