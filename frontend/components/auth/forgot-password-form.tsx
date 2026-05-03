"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader, AlertCircle, CheckCircle, Mail, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function requestOtp() {
    setIsPending(true);
    setError("");
    setSuccess(false);

    try {
      const response = await authApi.forgotPasswordOtp({ email });

      if (response.success) {
        setOtpRequested(true);
        setOtpVerified(false);
      } else {
        setError(response.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function verifyOtp() {
    setIsPending(true);
    setError("");
    setSuccess(false);

    try {
      const response = await authApi.verifyForgotPasswordOtp({ email, otpCode });

      if (response.success) {
        setOtpVerified(true);
      } else {
        setError(response.message || "Invalid OTP");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError("");
    setSuccess(false);

    try {
      if (!otpRequested) {
        await requestOtp();
        return;
      }

      if (!otpVerified) {
        setError("Please verify the OTP before creating a new password.");
        return;
      }

      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters long");
        setIsPending(false);
        return;
      }

      const response = await authApi.completeForgotPasswordReset({ email, newPassword });

      if (response.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(response.message || "Failed to reset password");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-in fade-in duration-500">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {otpRequested
              ? otpVerified
                ? "OTP verified. Create your new password below."
                : "Enter the OTP sent to your email and verify it before setting a new password"
              : "Enter your email address and we'll send you an OTP to verify your identity"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-start gap-2 p-3 text-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-md animate-in slide-in-from-top-2 duration-300">
            <CheckCircle className="size-4 shrink-0 mt-0.5 text-green-600" />
            <div className="flex-1">
              <p className="text-green-900 font-medium mb-1">
                Password reset successful!
              </p>
              <p className="text-green-700">
                Your password has been changed. Redirecting to login...
              </p>
            </div>
          </div>
        )}

        {/* EMAIL */}
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isPending || otpRequested}
            className="transition-all duration-200 focus:ring-2"
          />
          <FieldDescription>
            {otpRequested
              ? "Email used to send OTP"
              : "We'll send an OTP to this email address"}
          </FieldDescription>
        </Field>

        {/* OTP and New Password - Only show after OTP is requested */}
        {otpRequested && (
          <>
            <Field>
              <FieldLabel>OTP</FieldLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  disabled={isPending || otpVerified}
                  className="transition-all duration-200 focus:ring-2"
                />
                <Button
                  type="button"
                  onClick={verifyOtp}
                  disabled={isPending || otpVerified || !otpCode}
                  className="whitespace-nowrap"
                >
                  {otpVerified ? "Verified" : "Verify"}
                </Button>
              </div>
              <FieldDescription>
                Check your email for the OTP (valid for 10 minutes)
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>New Password</FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a new password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isPending || !otpVerified}
                  className="transition-all duration-200 focus:ring-2 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={!otpVerified}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FieldDescription>
                {otpVerified
                  ? "Your new password will override the old password for this email"
                  : "Verify the OTP first to enable password creation"}
              </FieldDescription>
            </Field>
          </>
        )}

        {/* SUBMIT */}
        <Field>
          <Button
            type="submit"
            className="w-full hover:shadow-md transition-all duration-200"
            disabled={isPending || (otpRequested && !otpVerified)}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="size-4 animate-spin" />
                {otpRequested ? (otpVerified ? "Resetting password..." : "Verify OTP first") : "Sending OTP..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mail className="size-4" />
                {otpRequested ? (otpVerified ? "Reset Password" : "Verify OTP first") : "Send OTP"}
              </span>
            )}
          </Button>
        </Field>

        <Field>
          <FieldDescription className="text-center">
            Remember your password?{" "}
            <a href="/login" className="underline underline-offset-4">
              Back to login
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
