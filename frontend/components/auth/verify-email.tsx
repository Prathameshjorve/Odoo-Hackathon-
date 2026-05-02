"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
        <Loader className="size-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>
        <p className="text-muted-foreground text-lg max-w-[400px]">
          We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[400px]">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push("/login")}
        >
          Back to Login
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-8">
        Didn't receive an email? Check your spam folder or contact support.
      </p>
    </div>
  );
}
