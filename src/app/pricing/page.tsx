"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { PLANS } from "../../lib/plans";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [processingPlan, setProcessingPlan] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const scriptId = "razorpay-checkout-js";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePlanPurchase = async (planKey: string) => {
    if (!user) return;

    if (planKey === "Free") {
      alert("You are already eligible for the Free plan with Gmail / Google sign-in.");
      return;
    }

    try {
      setProcessingPlan(planKey);

      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planKey }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData?.error || "Failed to create Razorpay order.");
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "VihaStory AI",
        description: `${orderData.planLabel} Plan`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          const verifyResponse = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...response,
              userId: user.uid,
              planKey,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            alert(verifyData?.error || "Payment verification failed.");
            return;
          }

          alert("Payment successful. Plan upgraded.");
          router.push("/dashboard");
        },
        prefill: {
          name: user.displayName || "",
          email: user.email || "",
        },
        theme: {
          color: "#000000",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      alert(error?.message || "Payment initiation failed.");
    } finally {
      setProcessingPlan("");
    }
  };

  if (loading || !user) return null;

  return (
    <main className="page-shell">
      <div className="center-wrap">
        <section
          className="comic-box"
          style={{ maxWidth: "1120px", textAlign: "left" }}
        >
          <div className="comic-badge">Pricing</div>
          <h1 className="title-main" style={{ fontSize: "44px" }}>
            VihaStory AI Plans
          </h1>
          <p className="subtitle" style={{ marginLeft: 0 }}>
            Free plan is limited to Gmail users and Google sign-in access.
          </p>

          <div
            style={{
              marginTop: "26px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "18px",
            }}
          >
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                style={{
                  border: "3px solid #000",
                  borderRadius: "20px",
                  padding: "20px",
                  background: plan.key === "Studio" ? "#fff7d6" : "#f7f7f7",
                  boxShadow: "8px 8px 0 #000",
                }}
              >
                <div className="comic-badge" style={{ marginBottom: "16px" }}>
                  {plan.label}
                </div>

                <div style={{ fontSize: "34px", fontWeight: 900 }}>
                  {plan.price === 0 ? "₹0" : `₹${plan.price}`}
                </div>

                <div style={{ marginTop: "12px", fontWeight: 800, lineHeight: 1.6 }}>
                  {plan.description}
                </div>

                <div style={{ marginTop: "12px", fontWeight: 700 }}>
                  Stories / month:{" "}
                  {plan.storyLimitPerMonth >= 999999
                    ? "Unlimited"
                    : plan.storyLimitPerMonth}
                </div>

                <div style={{ marginTop: "8px", fontWeight: 700 }}>
                  Priority generation: {plan.priority ? "Yes" : "No"}
                </div>

                <button
                  className="comic-btn"
                  style={{ marginTop: "18px", width: "100%" }}
                  onClick={() => handlePlanPurchase(plan.key)}
                  disabled={processingPlan === plan.key}
                >
                  {plan.key === "Free"
                    ? "Free Plan"
                    : processingPlan === plan.key
                    ? "Processing..."
                    : `Choose ${plan.label}`}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "28px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="comic-btn secondary" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}