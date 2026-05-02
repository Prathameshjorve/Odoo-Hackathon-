"use client";

import { useRouter, useParams } from "next/navigation";
import { EditAppointment } from "@/components/dashboard/organization/edit-appointment";

export default function AppointmentEditPage() {
    const router = useRouter();
    const params = useParams();
    const appointmentId = params.id as string;

    return (
        <EditAppointment
            appointmentId={appointmentId}
            onBack={() => router.push("/dashboard/org/appointments")}
        />
    );
}
