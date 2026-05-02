"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Get token and email from URL params
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError("");
    setSuccess(false);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsPending(false);
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsPending(false);
      return;
    }

    // Validate token and email exist
    if (!token || !email) {
      setError("Invalid reset link. Please request a new password reset.");
      setIsPending(false);
      return;
    }

    try {
      const response = await authApi.resetPassword(token, email, newPassword);

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

  // Show error if no token or email in URL
  if (!token || !email) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Invalid Reset Link</h1>
          <p className="text-muted-foreground text-sm text-balance">
            This password reset link is invalid or has expired
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="size-4 shrink-0" />
          <span>Please request a new password reset link</span>
        </div>

        <Button
          onClick={() => router.push("/forgot-password")}
          className="w-full hover:shadow-md transition-all duration-200"
        >
          Request new reset link
        </Button>

        <FieldDescription className="text-center">
          Remember your password?{" "}
          <a href="/login" className="underline underline-offset-4">
            Back to login
          </a>
        </FieldDescription>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-in fade-in duration-500">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your new password below
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

        {/* NEW PASSWORD */}
        <Field>
          <FieldLabel>New Password</FieldLabel>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isPending || success}
              minLength={8}
              placeholder="Enter new password"
              className="transition-all duration-200 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <FieldDescription>
            Must be at least 8 characters long
          </FieldDescription>
        </Field>

        {/* CONFIRM PASSWORD */}
        <Field>
          <FieldLabel>Confirm Password</FieldLabel>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isPending || success}
              minLength={8}
              placeholder="Confirm new password"
              className="transition-all duration-200 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </Field>

        {/* SUBMIT */}
        <Field>
          <Button
            type="submit"
            className="w-full hover:shadow-md transition-all duration-200"
            disabled={isPending || success}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="size-4 animate-spin" />
                Resetting password...
              </span>
            ) : success ? (
              "Redirecting..."
            ) : (
              "Reset password"
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
