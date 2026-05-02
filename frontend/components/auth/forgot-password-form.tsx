"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { authApi } from "@/lib/api";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError("");
    setSuccess(false);

    try {
      const response = await authApi.requestPasswordReset(email);

      if (response.success) {
        setSuccess(true);
        setEmail(""); // Clear email field
      } else {
        setError(response.message || "Failed to send reset email");
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
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email address and we'll send you a link to reset your password
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
                Email sent successfully!
              </p>
              <p className="text-green-700">
                If an account exists with that email, you'll receive a password reset link shortly. Please check your inbox and spam folder.
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
            disabled={isPending}
            className="transition-all duration-200 focus:ring-2"
          />
          <FieldDescription>
            We'll send a password reset link to this email address
          </FieldDescription>
        </Field>

        {/* SUBMIT */}
        <Field>
          <Button type="submit" className="w-full hover:shadow-md transition-all duration-200" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="size-4 animate-spin" />
                Sending reset link...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mail className="size-4" />
                Send reset link
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
