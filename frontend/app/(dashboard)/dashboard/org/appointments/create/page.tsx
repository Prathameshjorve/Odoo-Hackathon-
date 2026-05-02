"use client";

import { useRouter } from "next/navigation";
import { CreateAppointment } from "@/components/dashboard/organization/create-appointment";

export default function AppointmentCreatePage() {
  const router = useRouter();

  return (
    <CreateAppointment
      onBack={() => router.push("/dashboard/org/appointments")}
    />
  );
}
