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
import { Loader, AlertCircle, Building2, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError("");

    try {
      // If OTP has not been requested yet, request it first (step 1)
      if (!otpRequested) {
        const payload: any = { name, email, role };
        const response = await authApi.registerOtp(payload);
        if (response.success) {
          setOtpRequested(true);
        } else {
          setError(response.message || "Failed to request OTP");
        }
        return;
      }

      // OTP requested -> proceed to verify and create account (step 2)
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

      if (response.success) {
        // Success - user created and tokens returned -> redirect to dashboard
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 animate-in fade-in duration-500">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your details below to create your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
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

          <TabsContent value="ORGANIZATION" className="mt-4 flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Organization Name */}
            <Field>
              <FieldLabel>Organization Name</FieldLabel>
              <Input
                placeholder="BookFastX Inc."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required={role === "ORGANIZATION"}
                disabled={isPending}
                className="transition-all duration-200 focus:ring-2"
              />
            </Field>

            {/* Organization Location */}
            <Field>
              <FieldLabel>Location</FieldLabel>
              <Input
                placeholder="City, State"
                value={orgLocation}
                onChange={(e) => setOrgLocation(e.target.value)}
                required={role === "ORGANIZATION"}
                disabled={isPending}
                className="transition-all duration-200 focus:ring-2"
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
            disabled={isPending}
            className="transition-all duration-200 focus:ring-2"
          />
        </Field>

        {/* Email */}
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

        {/* Password */}
        <Field>
          {/* Show password and OTP fields only after OTP is requested */}
          {otpRequested && (
            <>
              <Field>
                <FieldLabel>OTP</FieldLabel>
                <Input
                  placeholder="Enter OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  disabled={isPending}
                  className="transition-all duration-200 focus:ring-2"
                />
              </Field>

              <Field>
                <FieldLabel>Password</FieldLabel>
                <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isPending}
                  className="transition-all duration-200 focus:ring-2 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                </div>
              </Field>
            </>
          )}
        </Field>

        {/* SUBMIT */}
        <Field>
          <Button type="submit" className="w-full hover:shadow-md transition-all duration-200" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader className="size-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Account"
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
