"use client";

import * as React from "react";
import { CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authStorage } from "@/lib/auth";
import { refundApi } from "@/lib/api";
import { Booking, RefundEligibilityResult, RefundTransaction } from "@/lib/types";

export function RefundModal({
  booking,
  open,
  onOpenChange,
  onSubmitted,
}: {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: (refund: RefundTransaction) => void;
}) {
  const [eligibility, setEligibility] = React.useState<RefundEligibilityResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const [reason, setReason] = React.useState("CUSTOMER_REQUEST");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [showPolicy, setShowPolicy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const token = authStorage.getAccessToken();
    if (!token) {
      setError("Please sign in to check refund eligibility.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setSuccess("");
    setConfirmed(false);

    refundApi.getEligibility(token, booking.id)
      .then((response) => {
        if (!cancelled && response.success && response.data) {
          setEligibility(response.data);
        } else if (!cancelled) {
          setError(response.message || "Failed to load refund eligibility");
        }
      })
      .catch((err) => !cancelled && setError(err.message || "Failed to load refund eligibility"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [booking.id, open]);

  const handleSubmit = async () => {
    const token = authStorage.getAccessToken();
    if (!token) {
      setError("Please sign in to request a refund.");
      return;
    }

    if (!confirmed) {
      setError("Please confirm that you understand the refund policy.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await refundApi.requestRefund(token, booking.id, {
        reason,
        reasonDetails: "Requested from booking details modal",
        metadata: { source: "booking-refund-modal" },
      });

      if (response.success && response.data) {
        setSuccess("Refund request submitted successfully.");
        onSubmitted?.(response.data);
        onOpenChange(false);
      } else {
        setError(response.message || "Failed to submit refund request");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit refund request");
    } finally {
      setSubmitting(false);
    }
  };

  const amount = eligibility?.refundAmount ?? 0;
  const original = eligibility?.originalAmount ?? booking.totalAmount ?? 0;
  const processingFee = eligibility?.breakdown?.processingFee ?? 0;
  const finalAmount = eligibility?.breakdown?.finalAmount ?? amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            Review your refund eligibility, confirm the policy, and submit the request.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Checking eligibility...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20">
            {error}
          </div>
        ) : (
          <div className="space-y-5">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated refund</p>
                    <div className="text-3xl font-bold">₹{Number(amount).toLocaleString()}</div>
                  </div>
                   <Badge 
                    variant="outline" 
                    className="gap-1 cursor-help hover:bg-accent transition-colors"
                    onClick={() => setShowPolicy(!showPolicy)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {eligibility?.ruleApplied || "VIEW POLICY"}
                  </Badge>
                </div>

                <div className="rounded-lg bg-background p-4 text-sm">
                  <p className="font-medium text-foreground">{eligibility?.message || eligibility?.reason || "Refund evaluation complete."}</p>
                  <p className="mt-1 text-muted-foreground">
                    ₹{Number(original).toLocaleString()} original amount {processingFee > 0 ? `• ₹${processingFee} fee` : ""} {finalAmount !== amount ? `• final ₹${Number(finalAmount).toLocaleString()}` : ""}
                  </p>
                </div>

                {showPolicy && eligibility?.policy && (
                  <div className="animate-in slide-in-from-top-2 duration-300 rounded-lg border bg-accent/30 p-4 text-xs space-y-2 mt-2">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3" />
                      Current Refund Policy:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Full refund available if cancelled <strong>{eligibility.policy.fullRefundHours} hours</strong> before start.</li>
                      {eligibility.policy.partialRefundHours && (
                        <li><strong>{eligibility.policy.partialRefundPercent}% refund</strong> available if cancelled {eligibility.policy.partialRefundHours} hours before start.</li>
                      )}
                      {Number(eligibility.policy.processingFee || eligibility.policy.globalProcessingFee) > 0 && (
                        <li>A processing fee of <strong>₹{eligibility.policy.processingFee || eligibility.policy.globalProcessingFee}</strong> will be deducted.</li>
                      )}
                      <li>Requires manual approval: <strong>{eligibility.policy.requiresApproval ? "Yes" : "No"}</strong></li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Original</p>
                <p className="text-lg font-semibold">₹{Number(original).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Processing fee</p>
                <p className="text-lg font-semibold">₹{Number(processingFee).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Refund</p>
                <p className="text-lg font-semibold text-emerald-600">₹{Number(finalAmount).toLocaleString()}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Refund reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="CUSTOMER_REQUEST" />
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(Boolean(checked))} />
              <div className="space-y-1">
                <p className="font-medium">I understand the refund policy</p>
                <p className="text-sm text-muted-foreground">
                  Refunds are processed according to the organization policy and may take some time to reflect.
                </p>
              </div>
            </div>

            {eligibility?.message?.toLowerCase().includes("instead of cancelling") && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20">
                Instead of cancelling, consider rescheduling if that works better for you.
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !confirmed || !eligibility?.eligible}>
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Submitting...</span>
                ) : (
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Confirm Refund Request</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
