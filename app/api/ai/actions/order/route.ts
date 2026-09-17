import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ORDER_STATUSES = [
  "جديد",
  "قيد المتابعة",
  "مكتمل",
  "ملغي",
] as const;

function isValidOrderStatus(value: string) {
  return ORDER_STATUSES.includes(
    value as (typeof ORDER_STATUSES)[number]
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const customerId = body.customer_id
      ? String(body.customer_id).trim()
      : null;

    const customerName = String(
      body.customer_name || ""
    ).trim();

    const service = String(
      body.service || ""
    ).trim();

    const total = Number(body.total ?? 0);

    const status = String(
      body.status || "جديد"
    ).trim();

    const notes = String(
      body.notes || ""
    ).trim();

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required." },
        { status: 400 }
      );
    }

    if (!service) {
      return NextResponse.json(
        { error: "Order service is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(total) || total < 0) {
      return NextResponse.json(
        { error: "Order total is invalid." },
        { status: 400 }
      );
    }

    if (!isValidOrderStatus(status)) {
      return NextResponse.json(
        { error: "Invalid order status." },
        { status: 400 }
      );
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

    if (membershipError) {
      throw membershipError;
    }

    const membership = memberships?.[0];

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Company not found." },
        { status: 403 }
      );
    }

    const companyId = membership.company_id;

    const { data: customer, error: customerError } =
      await supabase
        .from("customers")
        .select("id, name")
        .eq("id", customerId)
        .eq("company_id", companyId)
        .maybeSingle();

    if (customerError) {
      throw customerError;
    }

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found in this company." },
        { status: 403 }
      );
    }

    const { data: subscription, error: subscriptionError } =
      await supabase
        .from("subscriptions")
        .select("status, plan_id")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    if (!subscription) {
      return NextResponse.json(
        { error: "Active subscription required." },
        { status: 403 }
      );
    }

    const { data: plan, error: planError } =
      await supabase
        .from("plans")
        .select("*")
        .eq("id", subscription.plan_id)
        .maybeSingle();

    if (planError) {
      throw planError;
    }

    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan not found." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        company_id: companyId,
        customer_id: customer.id,
        customer_name: customer.name || customerName || null,
        service,
        total,
        status,
        notes: notes || null,
      })
      .select(
        "id, company_id, customer_id, customer_name, service, total, status, notes, created_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error("AI order action error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create order.",
      },
      { status: 500 }
    );
  }
}
