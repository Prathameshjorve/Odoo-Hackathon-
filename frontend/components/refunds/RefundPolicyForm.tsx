"use client";

import * as React from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { authStorage } from "@/lib/auth";
import { refundApi } from "@/lib/api";
import { RefundPolicy } from "@/lib/types";

const DEFAULT_POLICY: RefundPolicy = {
  rules: [],
  globalProcessingFee: 0,
  requiresApproval: true,
  autoProcessAbove: null,
  allowAutoApproval: true,
  maxRefundRequestsPerBooking: 3,
  maxRefundRequestsPerUserPerMonth: 10,
  allowWalletCredits: false,
  fullRefundHours: 48,
  partialRefundHours: 24,
  partialRefundPercent: 50,
  processingFee: 0,
  version: 1,
};

export function RefundPolicyForm() {
  const [policy, setPolicy] = React.useState<RefundPolicy>(DEFAULT_POLICY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const load = async () => {
      try {
        const token = authStorage.getAccessToken();
        if (!token) {
          setError("Authentication required");
          return;
        }
        const response = await refundApi.getPolicy(token);
        if (response.success && response.data) {
          setPolicy((current) => ({ ...current, ...response.data }));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load refund policy");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const updateField = (field: keyof RefundPolicy, value: any) => {
    setPolicy((current) => ({ ...current, [field]: value }));
  };

  const previewHours = Number(policy.partialRefundHours || 0);
  const previewPercent = Number(policy.partialRefundPercent || 0);
  const previewAmount = Math.max(0, Math.round((5000 * previewPercent) / 100) - Number(policy.processingFee || 0));

  const handleSave = async () => {
    const token = authStorage.getAccessToken();
    if (!token) {
      setError("Authentication required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await refundApi.updatePolicy(token, policy);
      if (response.success) {
        setMessage("Refund policy updated successfully");
      } else {
        setError(response.message || "Failed to update policy");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update policy");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
          Loading refund policy...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" />Refund Settings</CardTitle>
        <CardDescription>Control refund windows, fees, automation, and wallet credit options.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full refund hours</Label>
            <Input type="number" value={policy.fullRefundHours ?? 48} onChange={(e) => updateField("fullRefundHours", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Partial refund hours</Label>
            <Input type="number" value={policy.partialRefundHours ?? 24} onChange={(e) => updateField("partialRefundHours", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Partial refund percent</Label>
            <Input type="number" value={policy.partialRefundPercent ?? 50} onChange={(e) => updateField("partialRefundPercent", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Processing fee</Label>
            <Input type="number" value={policy.processingFee ?? 0} onChange={(e) => updateField("processingFee", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Auto process above amount</Label>
            <Input type="number" value={policy.autoProcessAbove ?? 0} onChange={(e) => updateField("autoProcessAbove", e.target.value === "" ? null : Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Max refunds per booking</Label>
            <Input type="number" value={policy.maxRefundRequestsPerBooking ?? 3} onChange={(e) => updateField("maxRefundRequestsPerBooking", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Max refunds per user / month</Label>
            <Input type="number" value={policy.maxRefundRequestsPerUserPerMonth ?? 10} onChange={(e) => updateField("maxRefundRequestsPerUserPerMonth", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Policy version</Label>
            <Input type="number" value={policy.version ?? 1} onChange={(e) => updateField("version", Number(e.target.value))} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Allow auto approval</p>
              <p className="text-xs text-muted-foreground">Auto-approve eligible refunds</p>
            </div>
            <Switch checked={Boolean(policy.allowAutoApproval)} onCheckedChange={(checked) => updateField("allowAutoApproval", checked)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Requires approval</p>
              <p className="text-xs text-muted-foreground">Manual review before processing</p>
            </div>
            <Switch checked={Boolean(policy.requiresApproval)} onCheckedChange={(checked) => updateField("requiresApproval", checked)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Allow wallet credits</p>
              <p className="text-xs text-muted-foreground">Offer credits instead of cash</p>
            </div>
            <Switch checked={Boolean(policy.allowWalletCredits)} onCheckedChange={(checked) => updateField("allowWalletCredits", checked)} />
          </div>
        </div>

        <Separator />

        <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Live preview
          </div>
          <p className="mt-2 text-lg font-semibold">
            If user cancels 30 hours before → ₹{previewAmount.toLocaleString()} refund
          </p>
          <p className="text-sm text-muted-foreground">
            {previewHours >= 30 ? `Partial refund policy: ${previewPercent}% with ₹${Number(policy.processingFee || 0)} fee` : "Use the refund window to preview policy-driven outcomes."}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Refund Policy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
