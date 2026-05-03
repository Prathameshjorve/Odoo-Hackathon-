"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader, AlertCircle, CheckCircle, Mail, Eye, EyeOff, Send, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api";
import { saveAuthData } from "@/lib/auth";
import { getRedirectUrl } from "@/lib/routes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loginMethod, setLoginMethod] = useState<"PASSWORD" | "OTP">("PASSWORD");
  const [otpRequested, setOtpRequested] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  async function handleSendOtp() {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsSendingOtp(true);
    setError("");
    setSuccess("");

    try {
      // Step 1 of OTP login: Send OTP (usually requires password too for security, or just email)
      // According to backend otpAuthController.js, step 1 requires password if otpCode not present
      // Wait, let's check backend logic again.
      // line 58: if (!password) return res.status(400).json({ success: false, message: 'Password required' });
      // So OTP login still requires password in the current backend implementation.
      // It's a "Two-Factor" style login.
      
      if (loginMethod === "OTP" && !password) {
        setError("Password is required to request an OTP");
        setIsSendingOtp(false);
        return;
      }

      const response = await authApi.loginOtp({ email, password });
      
      if (response.success && response.data?.requiresOtp) {
        setOtpRequested(true);
        setSuccess("OTP sent to your email!");
        setTimer(60);
      } else if (response.success) {
        // If it somehow completed without OTP (shouldn't happen with loginOtp)
        handleAuthSuccess(response.data);
      } else {
        setError(response.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  }

  function handleAuthSuccess(data: any) {
    saveAuthData({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });

    const redirectParam = searchParams.get('redirect');
    let defaultRedirect: string;
    if (data.user.isAdmin === true) {
      defaultRedirect = '/dashboard/admin';
    } else {
      defaultRedirect = getRedirectUrl(data.user.role);
    }
    
    router.push(redirectParam || defaultRedirect);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (loginMethod === "OTP" && !otpRequested) {
      handleSendOtp();
      return;
    }

    setIsPending(true);

    try {
      let response;
      if (loginMethod === "OTP") {
        response = await authApi.loginOtp({ email, password, otpCode });
      } else {
        response = await authApi.login({ email, password });
      }

      if (response.success && response.data?.user) {
        handleAuthSuccess(response.data);
      } else {
        setError(response.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 p-2 overflow-hidden mb-2">
            <img src="/logo.png" alt="BookFastX Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Choose your preferred login method
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-md">
            <CheckCircle className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <Tabs value={loginMethod} onValueChange={(v) => {
          setLoginMethod(v as any);
          setOtpRequested(false);
          setError("");
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PASSWORD">Password</TabsTrigger>
            <TabsTrigger value="OTP">OTP (2FA)</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* EMAIL */}
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="m@example.com"
            required
            disabled={isPending || (otpRequested && loginMethod === "OTP")}
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50"
          />
        </Field>

        {/* PASSWORD */}
        <Field>
          <div className="flex items-center">
            <FieldLabel>Password</FieldLabel>
            {loginMethod === "PASSWORD" && (
              <a
                href="/forgot-password"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                Forgot?
              </a>
            )}
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending || (otpRequested && loginMethod === "OTP")}
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {/* OTP Field - shown for OTP method after request */}
        {loginMethod === "OTP" && otpRequested && (
          <Field className="animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <FieldLabel>Verification Code</FieldLabel>
              <button 
                type="button" 
                onClick={handleSendOtp}
                disabled={timer > 0 || isSendingOtp}
                className="text-xs text-primary hover:underline disabled:text-muted-foreground"
              >
                {timer > 0 ? `Resend in ${timer}s` : "Resend"}
              </button>
            </div>
            <Input
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
              maxLength={6}
              disabled={isPending}
              className="text-center text-lg tracking-widest font-mono"
            />
          </Field>
        )}

        {/* SUBMIT */}
        <Field>
          {loginMethod === "OTP" && !otpRequested ? (
            <Button 
              type="button" 
              onClick={handleSendOtp} 
              disabled={isSendingOtp || !email || !password} 
              className="w-full"
            >
              {isSendingOtp ? (
                <><Loader className="size-4 animate-spin mr-2" /> Sending OTP...</>
              ) : (
                <><Send className="size-4 mr-2" /> Send OTP</>
              )}
            </Button>
          ) : (
            <Button 
              type="submit" 
              className="w-full hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300" 
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader className="size-4 animate-spin" />
                  {loginMethod === "OTP" ? "Verifying..." : "Logging in..."}
                </span>
              ) : (
                loginMethod === "OTP" ? "Verify & Login" : "Login"
              )}
            </Button>
          )}
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
