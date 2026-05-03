"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck, ShieldAlert, Check, X } from "lucide-react";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";

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

  // Password strength logic
  const passwordRequirements = useMemo(() => [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "At least one uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "At least one number", met: /[0-9]/.test(newPassword) },
    { label: "At least one special character", met: /[^A-Za-z0-9]/.test(newPassword) },
  ], [newPassword]);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    return passwordRequirements.filter(req => req.met).length;
  }, [newPassword, passwordRequirements]);

  const isPasswordStrong = passwordStrength === 4;

  // Get token and email from URL params
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!isPasswordStrong) {
      setError("Please create a stronger password meeting all requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsPending(true);
    setError("");
    setSuccess(false);

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

  const getStrengthColor = () => {
    if (passwordStrength === 0) return "bg-muted";
    if (passwordStrength <= 2) return "bg-red-500";
    if (passwordStrength === 3) return "bg-amber-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength === 3) return "Moderate";
    return "Strong";
  };

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
              placeholder="Enter new strong password"
              className={cn(
                "transition-all duration-200 focus:ring-2",
                newPassword && (isPasswordStrong ? "border-green-500" : "border-red-300")
              )}
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
          
          {/* Password Strength Indicator */}
          {newPassword && !success && (
            <div className="mt-2 space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  {isPasswordStrong ? (
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                  ) : (
                    <ShieldAlert className="h-3 w-3 text-amber-500" />
                  )}
                  Strength: <span className="font-bold">{getStrengthLabel()}</span>
                </span>
                <span>{passwordStrength}/4 requirements met</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", getStrengthColor())} 
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
              </div>
              
              <ul className="grid grid-cols-2 gap-1 mt-2">
                {passwordRequirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-1 text-[10px]">
                    {req.met ? (
                      <Check className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className={req.met ? "text-foreground" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              placeholder="Confirm new password"
              className={cn(
                "transition-all duration-200 focus:ring-2",
                confirmPassword && newPassword === confirmPassword ? "border-green-500" : (confirmPassword ? "border-red-300" : "")
              )}
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
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </Field>

        {/* SUBMIT */}
        <Field>
          <Button
            type="submit"
            className={cn(
              "w-full hover:shadow-md transition-all duration-200",
              !isPasswordStrong || newPassword !== confirmPassword ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-primary"
            )}
            disabled={isPending || success || !isPasswordStrong || newPassword !== confirmPassword}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="size-4 animate-spin" />
                Resetting password...
              </span>
            ) : success ? (
              "Redirecting to login..."
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
