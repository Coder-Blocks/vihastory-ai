import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { getPlanByKey } from "../../../../lib/plans";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      planKey,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !userId ||
      !planKey
    ) {
      return NextResponse.json(
        { error: "Missing payment verification fields." },
        { status: 400 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature." },
        { status: 400 }
      );
    }

    const plan = getPlanByKey(planKey);

    await updateDoc(doc(db, "users", userId), {
      plan: plan.key,
      storyLimitPerMonth: plan.storyLimitPerMonth,
      storiesUsedThisMonth: 0,
      usageMonthKey: new Date().toISOString().slice(0, 7),
      paymentStatus: "paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      upgradedAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return NextResponse.json(
      { error: error?.message || "Payment verification failed." },
      { status: 500 }
    );
  }
}