import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getPlanByKey } from "../../../../lib/plans";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planKey = String(body.planKey || "");

    const plan = getPlanByKey(planKey);

    if (!plan || plan.price <= 0) {
      return NextResponse.json(
        { error: "Invalid paid plan selected." },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: plan.price * 100,
      currency: "INR",
      receipt: `receipt_${plan.key}_${Date.now()}`,
      notes: {
        planKey: plan.key,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      planKey: plan.key,
      planLabel: plan.label,
    });
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create order." },
      { status: 500 }
    );
  }
}