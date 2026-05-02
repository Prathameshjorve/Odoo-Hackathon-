import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function VerifySuccesPage() {
  return (
    <div className="space-y-2 flex flex-col items-center">
      <CheckCircle2 size={30} />
      <h1 className="font-semibold text-2xl text-center">
        You have been verified successfully!
      </h1>
      <Button asChild variant="secondary">
        <Link href="/login">
          Login <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
