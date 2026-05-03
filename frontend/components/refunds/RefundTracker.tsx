"use client";

import * as React from "react";
import { CheckCircle2, Clock3, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefundTransaction, RefundTimelineStep } from "@/lib/types";

const STEP_ORDER: RefundTimelineStep["step"][] = ["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED", "FAILED"];

function getStepIndex(step?: string) {
  const index = STEP_ORDER.indexOf(step as RefundTimelineStep["step"]);
  return index === -1 ? 0 : index;
}

export function RefundTracker({ refund }: { refund?: RefundTransaction | null }) {
  const timeline = refund?.timeline && refund.timeline.length > 0
    ? refund.timeline
    : refund
      ? [
          { step: "REQUESTED" as const, time: refund.requestedAt || refund.createdAt || new Date().toISOString() },
          refund.approvedAt ? { step: "APPROVED" as const, time: refund.approvedAt } : null,
          refund.processedAt ? { step: "PROCESSING" as const, time: refund.processedAt } : null,
          refund.completedAt ? { step: "COMPLETED" as const, time: refund.completedAt } : null,
          refund.failedAt ? { step: "FAILED" as const, time: refund.failedAt } : null,
        ].filter(Boolean) as RefundTimelineStep[]
      : [];

  const currentIndex = getStepIndex(refund?.status || undefined);

  if (!refund) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No refund has been requested yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Refund Status</CardTitle>
          <Badge variant="outline" className="uppercase tracking-wide">
            {refund.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {timeline.map((step, index) => {
            const completed = index <= currentIndex && refund.status !== "FAILED";
            const isFailed = step.step === "FAILED" || refund.status === "FAILED";
            return (
              <div key={`${step.step}-${index}`} className="flex items-start gap-3 rounded-lg border p-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${isFailed ? "bg-red-500/10 text-red-600" : completed ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {isFailed ? <AlertTriangle className="h-4 w-4" /> : completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{step.step}</p>
                  <p className="text-xs text-muted-foreground">
                    {step.time ? format(new Date(step.time), "MMM dd, yyyy • h:mm a") : "Pending"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {refund.lastError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="font-medium">Last error</p>
                <p>{refund.lastError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Requested: {refund.requestedAt ? format(new Date(refund.requestedAt), "MMM dd, yyyy h:mm a") : "-"}</span>
          {refund.approvedAt && <span>Approved: {format(new Date(refund.approvedAt), "MMM dd, yyyy h:mm a")}</span>}
          {refund.processedAt && <span>Processed: {format(new Date(refund.processedAt), "MMM dd, yyyy h:mm a")}</span>}
          {refund.completedAt && <span>Completed: {format(new Date(refund.completedAt), "MMM dd, yyyy h:mm a")}</span>}
          {refund.failedAt && <span>Failed: {format(new Date(refund.failedAt), "MMM dd, yyyy h:mm a")}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
