import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-md">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
