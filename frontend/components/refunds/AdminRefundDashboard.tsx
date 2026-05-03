"use client";

import * as React from "react";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Filter, Loader2, Search, RotateCcw, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authStorage } from "@/lib/auth";
import { refundApi } from "@/lib/api";
import { RefundTransaction } from "@/lib/types";

export function AdminRefundDashboard() {
  const [refunds, setRefunds] = React.useState<RefundTransaction[]>([]);
  const [status, setStatus] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [overrideAmounts, setOverrideAmounts] = React.useState<Record<string, string>>({});

  const fetchRefunds = React.useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await refundApi.listRefunds(token, { status: status === "all" ? undefined : status });
      if (response.success && response.data) {
        setRefunds(response.data as RefundTransaction[]);
      } else {
        setError(response.message || "Failed to load refunds");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load refunds");
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchRefunds().catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchRefunds]);

  const filteredRefunds = refunds.filter((refund) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      refund.id.toLowerCase().includes(query) ||
      refund.bookingId.toLowerCase().includes(query) ||
      refund.booking?.user?.email?.toLowerCase().includes(query) ||
      refund.booking?.user?.name?.toLowerCase().includes(query)
    );
  });

  const metrics = React.useMemo(() => {
    const total = refunds.length;
    const pending = refunds.filter((item) => item.status === "PENDING").length;
    const completed = refunds.filter((item) => item.status === "COMPLETED").length;
    const failed = refunds.filter((item) => item.status === "FAILED").length;
    const totalAmount = refunds.reduce((sum, item) => sum + Number(item.refundAmount || item.originalAmount || 0), 0);
    return { total, pending, completed, failed, totalAmount };
  }, [refunds]);

  const handleAction = async (refundId: string, action: "approve" | "reject" | "retry") => {
    const token = authStorage.getAccessToken();
    if (!token) return;

    try {
      setActionLoadingId(refundId);
      if (action === "approve") {
        const overrideAmount = overrideAmounts[refundId];
        await refundApi.approveRefund(token, refundId, {
          note: "Approved from refund panel",
          overrideAmount: overrideAmount ? Number(overrideAmount) : undefined,
        });
      } else if (action === "reject") {
        await refundApi.rejectRefund(token, refundId, { note: "Rejected from refund panel" });
      } else {
        await refundApi.retryRefund(token, refundId);
      }
      await fetchRefunds();
    } catch (err) {
      console.error("Refund action failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Refund Management Panel</h2>
        <p className="text-muted-foreground">Approve, reject, override, and monitor refund execution in real time.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{metrics.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-600">{metrics.pending}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-emerald-600">{metrics.completed}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Failed</p><p className="text-2xl font-bold text-red-600">{metrics.failed}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Refund Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by booking, user, or refund id" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REQUIRES_MANUAL">Requires Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading refunds...
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRefunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-medium">{refund.bookingId}</TableCell>
                      <TableCell>{refund.booking?.user?.name || refund.booking?.user?.email || "-"}</TableCell>
                      <TableCell>₹{Number(refund.refundAmount || refund.originalAmount || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{refund.status}</Badge></TableCell>
                      <TableCell>{refund.requestedAt ? format(new Date(refund.requestedAt), "MMM dd, yyyy h:mm a") : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-2">
                          {refund.status === "PENDING" && (
                            <Input
                              type="number"
                              className="h-8 w-32 text-right"
                              placeholder="Override"
                              value={overrideAmounts[refund.id] || ""}
                              onChange={(e) => setOverrideAmounts((current) => ({ ...current, [refund.id]: e.target.value }))}
                            />
                          )}
                          <div className="flex justify-end gap-2">
                          {refund.status === "PENDING" && (
                            <>
                              <Button size="sm" onClick={() => handleAction(refund.id, "approve")} disabled={actionLoadingId === refund.id}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleAction(refund.id, "reject")} disabled={actionLoadingId === refund.id}>
                                Reject
                              </Button>
                            </>
                          )}
                          {(refund.status === "FAILED" || refund.status === "REQUIRES_MANUAL") && (
                            <Button size="sm" variant="secondary" onClick={() => handleAction(refund.id, "retry")} disabled={actionLoadingId === refund.id}>
                              <RotateCcw className="mr-1 h-4 w-4" />Retry
                            </Button>
                          )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredRefunds.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No refunds match the current filter.</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4" />
          Admin actions are audit-logged and the refund timeline updates automatically as the gateway/webhook status changes.
        </CardContent>
      </Card>
    </div>
  );
}
