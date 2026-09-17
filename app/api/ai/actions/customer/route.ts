import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { hasFeature } from "@/lib/plan-permissions";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول لاستخدام هذا الإجراء." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const notes = String(body.notes || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "اسم العميل مطلوب." },
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
      return NextResponse.json(
        { error: "تعذر التحقق من الشركة المرتبطة بحسابك." },
        { status: 500 }
      );
    }

    const membership = memberships?.[0];

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "لا توجد شركة مرتبطة بحسابك." },
        { status: 403 }
      );
    }

    const companyId = membership.company_id;

    const { data: subscriptions, error: subscriptionError } =
      await supabase
        .from("subscriptions")
        .select("plan_id, status, end_date, created_at")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

    if (subscriptionError) {
      return NextResponse.json(
        { error: "تعذر التحقق من الاشتراك." },
        { status: 500 }
      );
    }

    const subscription = subscriptions?.[0];

    if (!subscription) {
      return NextResponse.json(
        { error: "لا يوجد اشتراك نشط يسمح باستخدام المساعد الذكي." },
        { status: 403 }
      );
    }

    if (
      subscription.end_date &&
      new Date(subscription.end_date).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "انتهى الاشتراك." },
        { status: 403 }
      );
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("name")
      .eq("id", subscription.plan_id)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) {
      return NextResponse.json(
        { error: "تعذر التحقق من الخطة الحالية." },
        { status: 500 }
      );
    }

    if (!plan || !hasFeature(plan.name, "ai")) {
      return NextResponse.json(
        { error: "المساعد الذكي غير متاح في خطتك الحالية." },
        { status: 403 }
      );
    }

    if (phone) {
      const { data: existingCustomer, error: duplicateError } =
        await supabase
          .from("customers")
          .select("id, name, phone, email, created_at")
          .eq("company_id", companyId)
          .eq("phone", phone)
          .maybeSingle();

      if (duplicateError) {
        return NextResponse.json(
          { error: "تعذر التحقق من وجود عميل بنفس رقم الهاتف." },
          { status: 500 }
        );
      }

      if (existingCustomer) {
        return NextResponse.json(
          {
            error: "يوجد بالفعل عميل بهذا رقم الهاتف.",
            customer: existingCustomer,
          },
          { status: 409 }
        );
      }
    }

    const { data: customer, error: insertError } = await supabase
      .from("customers")
      .insert({
        company_id: companyId,
        name,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      })
      .select("id, name, phone, email, notes, created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "فشل إنشاء العميل." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنشاء العميل.",
      },
      { status: 500 }
    );
  }
}