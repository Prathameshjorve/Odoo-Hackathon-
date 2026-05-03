"use client";

import OrganizationSettings from "@/components/dashboard/organization/settings";
import { RefundPolicyForm } from "@/components/refunds/RefundPolicyForm";

export default function SettingsPage() {
  return (
    <div className="w-full py-6 space-y-6">
      <OrganizationSettings />
      <RefundPolicyForm />
    </div>
  );
}
