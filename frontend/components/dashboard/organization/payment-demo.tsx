"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { authStorage } from "@/lib/auth";

export default function PaymentDemo() {
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string | null;
  }>({ type: null, message: null });

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    setStatus({ type: null, message: null });

    try {
      // 1. Load Script
      const res = await loadRazorpayScript();
      if (!res) {
        throw new Error("Razorpay SDK failed to load. Check your internet connection.");
      }

      // 2. Create Order on Backend
      const token = authStorage.getAccessToken();
      const response = await fetch("http://localhost:4000/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ amount: Number(amount) }),
      });

      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.message || "Failed to create order");
      }

      // 3. Configure Razorpay Options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_YOUR_KEY_ID", // Replace with your test key id if env not loaded
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Odoo Hackathon Project",
        description: "Test Transaction",
        order_id: orderData.id,
        handler: async function (response: any) {
          // 4. Verify Payment on Backend
          try {
            const verifyRes = await fetch("http://localhost:4000/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setStatus({ type: "success", message: "Payment Successful! Your transaction has been verified." });
            } else {
              setStatus({ type: "error", message: "Payment Verification Failed: " + verifyData.message });
            }
          } catch (err: any) {
            setStatus({ type: "error", message: "Error verifying payment: " + err.message });
          }
        },
        prefill: {
          name: "Test User",
          email: "test@example.com",
          contact: "9999999999",
        },
        notes: {
          address: "Razorpay Corporate Office",
        },
        theme: {
          color: "#3b82f6",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

      paymentObject.on("payment.failed", function (response: any) {
        setStatus({ type: "error", message: "Payment Failed: " + response.error.description });
      });

    } catch (err: any) {
      console.error("Payment Error:", err);
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Razorpay Payment Integration
        </CardTitle>
        <CardDescription>
          Enter an amount and click "Pay Now" to test the integration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (INR)</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        <Button 
          onClick={handlePayment} 
          className="w-full" 
          disabled={loading || !amount}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Pay Now"
          )}
        </Button>

        {status.type === "success" && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 text-green-800">
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">{status.message}</p>
          </div>
        )}

        {status.type === "error" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">{status.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
