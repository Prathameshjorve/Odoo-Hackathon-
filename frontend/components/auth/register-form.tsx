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
import { Loader, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api";

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError("");

    try {
      const response = await authApi.register({
        name,
        email,
        password,
        role: "USER", // Default role as USER
      });

      if (response.success) {
        // Redirect to verification page
        router.push("/verify");
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

        {/* Full Name */}
        <Field>
          <FieldLabel>Full Name</FieldLabel>
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
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            placeholder="Create a password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
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
