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
import { Loader, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { authApi } from "@/lib/api";
import { saveAuthData } from "@/lib/auth";
import { getRedirectUrl } from "@/lib/routes";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError("");
    setShowResendVerification(false);
    setResendSuccess("");

    try {
      const response = await authApi.login({ email, password });

      // Explicitly type response.data to avoid type errors
      type LoginResponseData = {
        user?: any;
        accessToken?: string;
        refreshToken?: string;
      };
      const data = response.data as LoginResponseData;

      if (
        response.success &&
        data?.user &&
        data?.accessToken &&
        data?.refreshToken
      ) {
        // Save complete auth data to cookies (includes role, organizationId, organization/adminOrganization)
        saveAuthData({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });

        // Get redirect URL from query params or use default based on role
        const redirectParam = searchParams.get('redirect');
        // Type assertion to fix 'response.data' is of type 'unknown'
        const user = (response.data as LoginResponseData).user;
        
        // Check if user is admin first, then fall back to role-based redirect
        let defaultRedirect: string;
        if (user.isAdmin === true) {
          defaultRedirect = '/dashboard/admin';
        } else {
          defaultRedirect = getRedirectUrl(user.role);
        }
        
        const redirectUrl = redirectParam || defaultRedirect;

        // Redirect to appropriate page
        router.push(redirectUrl);
      } else {
        setError(response.message || "Login failed");
        // Check if error is about email verification
        if (response.message?.toLowerCase().includes("verify your email")) {
          setShowResendVerification(true);
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred during login";
      setError(errorMessage);
      // Check if error is about email verification
      if (errorMessage.toLowerCase().includes("verify your email")) {
        setShowResendVerification(true);
      }
    } finally {
      setIsPending(false);
    }
  }

  async function handleResendVerification() {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsResending(true);
    setResendSuccess("");
    setError("");

    try {
      const response = await authApi.resendVerification(email);

      if (response.success) {
        setResendSuccess("Verification email sent! Please check your inbox.");
        setShowResendVerification(false);
      } else {
        setError(response.message || "Failed to resend verification email");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while resending verification email");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-in fade-in duration-500">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
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
        {resendSuccess && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-md animate-in slide-in-from-top-2 duration-300">
            <CheckCircle className="size-4 shrink-0" />
            <span>{resendSuccess}</span>
          </div>
        )}

        {/* Resend Verification Button */}
        {showResendVerification && (
          <div className="flex items-start gap-2 p-3 text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-md animate-in slide-in-from-top-2 duration-300">
            <Mail className="size-4 shrink-0 mt-0.5 text-blue-600" />
            <div className="flex-1">
              <p className="text-blue-900 font-medium mb-2">
                Email verification required
              </p>
              <p className="text-blue-700 mb-3">
                Your email address needs to be verified before you can log in.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                {isResending ? (
                  <>
                    <Loader className="size-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="size-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>
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
        </Field>

        {/* PASSWORD */}
        <Field>
          <div className="flex items-center">
            <FieldLabel>Password</FieldLabel>
            <a
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline transition-colors duration-200"
            >
              Forgot your password?
            </a>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            className="transition-all duration-200 focus:ring-2"
          />
        </Field>

        {/* SUBMIT */}
        <Field>
          <Button type="submit" className="w-full hover:shadow-md transition-all duration-200" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="size-4 animate-spin" />
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </Button>
        </Field>

        <Field>
          <FieldDescription className="text-center">
            Don't have an account?{" "}
            <a href="/register" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
