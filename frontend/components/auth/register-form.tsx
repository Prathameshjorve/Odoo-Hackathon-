"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader, AlertCircle, Building2, User as UserIcon, Eye, EyeOff, Send, CheckCircle2, ShieldCheck, ShieldAlert, Check, X } from "lucide-react";
import { authApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveAuthData } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [role, setRole] = useState<"USER" | "ORGANIZATION">("USER");
  const [isPending, setIsPending] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(0);

  // Password strength logic
  const passwordRequirements = useMemo(() => [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
    { label: "At least one number", met: /[0-9]/.test(password) },
    { label: "At least one special character", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    return passwordRequirements.filter(req => req.met).length;
  }, [password, passwordRequirements]);

  const isPasswordStrong = passwordStrength === 4;

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
    if (!email || !name) {
      setError("Please enter your name and email first");
      return;
    }

    setIsSendingOtp(true);
    setError("");
    setSuccess("");

    try {
      const payload: any = { name, email, role };
      const response = await authApi.registerOtp(payload);
      
      if (response.success) {
        setOtpRequested(true);
        setSuccess("OTP sent to your email successfully!");
        setTimer(60); // 1 minute cooldown
      } else {
        setError(response.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please check your connection.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!otpRequested) {
      handleSendOtp();
      return;
    }

    if (!isPasswordStrong) {
      setError("Please create a stronger password meeting all requirements");
      return;
    }

    setIsPending(true);
    setError("");

    try {
      // Step 2: verify and create account
      const payload: any = { name, email, password, role, otpCode };

      if (role === "ORGANIZATION") {
        if (!orgName || !orgLocation) {
          setError("Organization Name and Location are required");
          setIsPending(false);
          return;
        }
        payload.business = {
          name: orgName,
          location: orgLocation,
          businessHours: [
            { day: "Monday", open: "09:00", close: "17:00" },
            { day: "Tuesday", open: "09:00", close: "17:00" },
            { day: "Wednesday", open: "09:00", close: "17:00" },
            { day: "Thursday", open: "09:00", close: "17:00" },
            { day: "Friday", open: "09:00", close: "17:00" },
          ]
        };
      }

      const response = await authApi.registerOtp(payload);

      if (response.success && response.data?.accessToken) {
        // Save auth data to log the user in immediately
        saveAuthData({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
        });
        
        router.push("/");
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 p-2 overflow-hidden mb-2">
            <img src="/logo.png" alt="BookFastX Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your details below to create your account
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-md animate-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Role Selection Tabs */}
        <Tabs value={role} onValueChange={(v) => setRole(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="USER" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Customer
            </TabsTrigger>
            <TabsTrigger value="ORGANIZATION" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ORGANIZATION" className="mt-4 flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
            <Field>
              <FieldLabel>Organization Name</FieldLabel>
              <Input
                placeholder="BookFastX Inc."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required={role === "ORGANIZATION"}
                disabled={isPending || otpRequested}
                className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50"
              />
            </Field>

            <Field>
              <FieldLabel>Location</FieldLabel>
              <Input
                placeholder="City, State"
                value={orgLocation}
                onChange={(e) => setOrgLocation(e.target.value)}
                required={role === "ORGANIZATION"}
                disabled={isPending || otpRequested}
                className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50"
              />
            </Field>
          </TabsContent>
        </Tabs>

        {/* Full Name */}
        <Field>
          <FieldLabel>{role === "ORGANIZATION" ? "Admin Full Name" : "Full Name"}</FieldLabel>
          <Input
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isPending || otpRequested}
            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50"
          />
        </Field>

        {/* Email with Send OTP Button */}
        <Field>
          <FieldLabel>Email</FieldLabel>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending || otpRequested}
              className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 flex-1"
            />
            {!otpRequested && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSendOtp} 
                disabled={isSendingOtp || !email || !name || timer > 0}
                className="shrink-0"
              >
                {isSendingOtp ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {timer > 0 ? `Resend in ${timer}s` : "Send OTP"}
              </Button>
            )}
          </div>
        </Field>

        {/* OTP and Password - shown after OTP requested */}
        {otpRequested && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel>OTP</FieldLabel>
                <button 
                  type="button" 
                  onClick={handleSendOtp}
                  disabled={timer > 0 || isSendingOtp}
                  className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
                </button>
              </div>
              <Input
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                disabled={isPending}
                maxLength={6}
                className="transition-all duration-200 focus:ring-2 text-center text-lg tracking-widest font-mono"
              />
            </Field>

            <Field>
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                  className={cn(
                    "transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 pr-10",
                    password && (isPasswordStrong ? "border-green-500 focus:border-green-500 focus:ring-green-500/20" : "border-red-300 focus:border-red-500 focus:ring-red-500/20")
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
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
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", getStrengthColor())} 
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    />
                  </div>
                  
                  <ul className="grid grid-cols-2 gap-1 mt-2">
                    {passwordRequirements.map((req, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[10px] sm:text-xs">
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
          </div>
        )}

        {/* SUBMIT */}
        <Field>
          <Button 
            type="submit" 
            className={cn(
              "w-full hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300",
              !otpRequested || !isPasswordStrong ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-primary"
            )} 
            disabled={isPending || !otpRequested || (!isPasswordStrong && password.length > 0)}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="size-4 animate-spin" />
                Verifying & Creating...
              </span>
            ) : (
              otpRequested ? "Verify & Create Account" : "Please send OTP first"
            )}
          </Button>
        </Field>

        <Field>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <a href="/login" className="underline underline-offset-4">
              Sign in
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
