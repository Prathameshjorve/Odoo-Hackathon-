"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader } from "lucide-react";
import { authApi } from "@/lib/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      // No token or email in URL, this is just the "check your email" page
      return;
    }

    // If we have token and email, verify the email
    const verifyEmail = async () => {
      setIsVerifying(true);
      try {
        const response = await authApi.verifyEmail(token, email);

        if (response.success) {
          // Redirect to success page
          router.push("/verify/success");
        } else {
          // Redirect to error page
          router.push("/verify/error");
        }
      } catch (error) {
        // Redirect to error page
        router.push("/verify/error");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  // If we're verifying (have token and email in URL)
  if (isVerifying || (searchParams.get("token") && searchParams.get("email"))) {
    return (
      <div className="space-y-4 flex flex-col items-center animate-in fade-in duration-500">
        <Loader className="size-8 animate-spin text-primary" />
        <h1 className="font-semibold text-2xl text-center">{message}</h1>
        <p className="text-muted-foreground text-sm font-medium text-center">
          Please wait while we verify your account...
        </p>
      </div>
    );
  }

  // Default page - showing "check your email" message
  return null;
}
