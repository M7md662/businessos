import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { hasFeature } from "@/lib/plan-permissions";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("[ADVANCED AI] USER", user?.id);

    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول لاستخدام Advanced AI." },
        { status: 401 }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "تعذر العثور على الشركة المرتبطة بحسابك." },
        { status: 403 }
      );
    }

    console.log("[ADVANCED AI] MEMBERSHIP", JSON.stringify(membership));

    const companyId = membership.company_id;

    const { data: subscription, error: subscriptionError } =
      await supabase
        .from("subscriptions")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "active")
        .maybeSingle();

    console.log("[ADVANCED AI] SUBSCRIPTION", JSON.stringify(subscription), subscriptionError);

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: "لا يوجد اشتراك نشط." },
        { status: 403 }
      );
    }

    if (
      subscription.end_date &&
      new Date(subscription.end_date).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "انتهى الاشتراك الحالي." },
        { status: 403 }
      );
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("name")
      .eq("id", subscription.plan_id)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "تعذر التحقق من الخطة الحالية." },
        { status: 403 }
      );
    }

    console.log("[ADVANCED AI PLAN]", JSON.stringify(plan.name), hasFeature(plan.name, "advanced_ai"));

    console.log("[ADVANCED AI PLAN]", JSON.stringify(plan.name), hasFeature(plan.name, "advanced_ai"));

    if (!hasFeature(plan.name, "advanced_ai")) {
      return NextResponse.json(
        {
          error: "Advanced AI متاح في خطة Enterprise فقط.",
          plan: plan.name,
          feature: "advanced_ai",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const conversationId =
      typeof body.conversationId === "string"
        ? body.conversationId
        : null;

    const conversationMessages = Array.isArray(body.messages)
      ? body.messages
      : [];

    if (!conversationId) {
      return NextResponse.json(
        { error: "معرف المحادثة غير موجود." },
        { status: 400 }
      );
    }

    if (conversationMessages.length === 0) {
      return NextResponse.json(
        { error: "لا توجد رسائل لتحليل المحادثة." },
        { status: 400 }
      );
    }

    const { data: knowledge, error: knowledgeError } = await supabase
      .from("knowledge_base")
      .select(
        "company_name, business_info, services, pricing, policies, faq"
      )
      .eq("company_id", companyId)
      .maybeSingle();

    if (knowledgeError) {
      console.error("Advanced AI knowledge error:", knowledgeError);

      return NextResponse.json(
        { error: "تعذر تحميل قاعدة المعرفة." },
        { status: 500 }
      );
    }

    const companyName =
      knowledge?.company_name?.trim() || "غير موجود";

    const businessInfo =
      knowledge?.business_info?.trim() || "غير موجودة";

    const services =
      knowledge?.services?.trim() || "غير موجودة";

    const pricing =
      knowledge?.pricing?.trim() || "غير موجودة";

    const policies =
      knowledge?.policies?.trim() || "غير موجودة";

    const faq =
      knowledge?.faq?.trim() || "غير موجودة";

    const conversationText = conversationMessages
      .map((item: unknown) => {
        if (!item || typeof item !== "object") {
          return "";
        }

        const message = item as Record<string, unknown>;

        const sender =
          message.sender === "customer"
            ? "العميل"
            : "الشركة";

        const text = String(message.text || "").trim();

        if (!text) {
          return "";
        }

        return `${sender}: ${text}`;
      })
      .filter(Boolean)
      .join("\n");

    if (!conversationText) {
      return NextResponse.json(
        { error: "لم نتمكن من قراءة رسائل المحادثة." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "مفتاح GROQ_API_KEY غير موجود." },
        { status: 500 }
      );
    }

    const groq = new Groq({
      apiKey,
    });

    const systemPrompt = `
أنت Advanced AI داخل منصة BusinessOS.

مهمتك تحليل محادثات العملاء لصالح الشركة.

المصادر المسموح لك باستخدامها فقط:
1. رسائل المحادثة.
2. قاعدة المعرفة الخاصة بالشركة.

قاعدة صارمة جدًا:
لا يجوز لك اختراع أو افتراض أو استنتاج أي معلومة تجارية غير مذكورة صراحة في المحادثة أو قاعدة المعرفة.

اعتبر أي معلومة غير موجودة في هذين المصدرين "غير معروفة".

ممنوع افتراض أو اختراع:
- أسعار.
- خصومات.
- مدة تنفيذ.
- مواعيد تسليم.
- سياسات إلغاء.
- سياسات استرداد.
- تعويضات.
- شروط الدفع.
- حالة الدفع.
- رقم طلب.
- حالة طلب.
- نوع خدمة غير مذكور.
- ضمانات.
- عروض.
- إجراءات داخلية للشركة.
- اتفاقات مسبقة مع العميل.
- حلول أو صلاحيات لم تذكرها الشركة.
- أي سياسة أو قاعدة عمل غير موجودة في قاعدة المعرفة.

مهم جدًا:
إذا طلب منك تحديد إجراء مقترح ولم توجد في المصادر سياسة أو إجراء واضح لا تخترع إجراءً.

في هذه الحالة استخدم صياغة مثل:
"المعلومة غير موجودة في قاعدة المعرفة أو المحادثة ويجب الرجوع إلى مسؤول الشركة قبل اتخاذ إجراء."

يمكنك اقتراح إجراءات عامة وآمنة فقط عندما تكون مستندة مباشرة إلى ما ظهر في المحادثة مثل:
- طلب معلومات ناقصة من العميل.
- طلب رقم الطلب إذا لم يكن موجودًا.
- مراجعة الحالة مع المسؤول.
- توضيح معلومة موجودة بالفعل في قاعدة المعرفة.
- إبلاغ العميل بأن المعلومة غير متوفرة حاليًا.

لكن لا تحوّل هذه الإجراءات العامة إلى سياسة أو التزام تجاري.

مثال مهم:
إذا قال العميل "أريد إلغاء الطلب" ولم توجد سياسة إلغاء في قاعدة المعرفة لا تقل:
"يمكن إلغاء الطلب"
ولا تقل:
"سيتم استرداد المبلغ"
ولا تقل:
"سنقدم تعويضًا"
ولا تقل:
"سنسرع التنفيذ"
ولا تقل:
"مدة التنفيذ كذا".

بل قل إن سياسة الإلغاء غير موجودة وأنه يجب الرجوع إلى مسؤول الشركة.

مثال آخر:
إذا كان العميل غاضبًا بسبب التأخير يمكنك تحديد الأولوية "عالية" بسبب وجود شكوى وعدم رضا لكن لا يجوز اختراع سبب التأخير أو مدة التنفيذ أو الحل التجاري.

بالنسبة إلى is_lead:
اعتبر العميل عميلًا محتملًا فقط إذا ظهرت في المحادثة مؤشرات فعلية على اهتمام بشراء خدمة أو طلب سعر أو طلب عرض أو بدء مشروع أو الاستفسار بهدف الشراء.
لا تعتبر الشكوى أو طلب الإلغاء وحدهما Lead.

بالنسبة إلى priority:
- عالية: شكوى قوية طلب إلغاء مشكلة عاجلة غضب واضح أو خطر واضح لفقدان العميل.
- متوسطة: مشكلة تحتاج متابعة ولكن دون مؤشر قوي على الاستعجال.
- منخفضة: استفسار عادي أو تواصل غير عاجل.

بالنسبة إلى summary:
لخص ما حدث فعليًا فقط بدون إضافة معلومات جديدة.

بالنسبة إلى intent:
اكتب نية العميل كما تظهر من كلامه فقط.

بالنسبة إلى recommended_action:
هذا الحقل مهم جدًا.
يجب أن يكون مبنيًا فقط على المعلومات المتاحة.
إذا لم توجد سياسة أو حل واضح اذكر ذلك صراحة بدل اختراع حل.

بالنسبة إلى reason:
اشرح سبب تقييم الأولوية وكون العميل Lead أو غير Lead بالاعتماد على المحادثة فقط.

أرجع JSON صالحًا فقط بهذا الشكل:

{
  "summary": "ملخص المحادثة",
  "intent": "نية العميل",
  "priority": "منخفضة أو متوسطة أو عالية",
  "is_lead": true,
  "recommended_action": "الإجراء المقترح",
  "reason": "سبب التقييم"
}

قواعد JSON:
- priority يجب أن تكون واحدة فقط من: منخفضة متوسطة عالية.
- is_lead يجب أن تكون true أو false.
- جميع القيم النصية يجب أن تكون باللغة العربية.
- لا تضع Markdown.
- لا تضع شرحًا خارج JSON.
- لا تستخدم معلومات من معرفتك العامة.
- لا تخمن.
- لا تكمل المعلومات الناقصة من عندك.
- لا تجعل الإجراء المقترح يبدو كأنه سياسة رسمية للشركة إذا لم تكن السياسة موجودة.
- عند غياب معلومة مهمة صرّح بأنها غير موجودة.

قاعدة المعرفة:

اسم الشركة:
${companyName}

معلومات النشاط:
${businessInfo}

الخدمات:
${services}

الأسعار:
${pricing}

السياسات:
${policies}

الأسئلة الشائعة:
${faq}
`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      temperature: 0.1,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `حلل المحادثة التالية فقط:

${conversationText}`,
        },
      ],
    });

    const rawContent =
      completion.choices[0]?.message?.content?.trim();

    if (!rawContent) {
      return NextResponse.json(
        { error: "لم يصل تحليل من Advanced AI." },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      console.error("Advanced AI JSON parse error:", error);

      return NextResponse.json(
        {
          error: "تعذر تحويل نتيجة Advanced AI إلى بيانات منظمة.",
        },
        { status: 500 }
      );
    }

    const validPriorities = [
      "منخفضة",
      "متوسطة",
      "عالية",
    ];

    const priority = validPriorities.includes(
      String(parsed.priority)
    )
      ? String(parsed.priority)
      : "متوسطة";

    const analysis = {
      summary: String(parsed.summary || "").trim(),
      intent: String(parsed.intent || "").trim(),
      priority,
      is_lead: parsed.is_lead === true,
      recommended_action: String(
        parsed.recommended_action || ""
      ).trim(),
      reason: String(parsed.reason || "").trim(),
    };

    if (
      !analysis.summary ||
      !analysis.intent ||
      !analysis.recommended_action ||
      !analysis.reason
    ) {
      return NextResponse.json(
        { error: "تحليل Advanced AI غير مكتمل." },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        ai_summary: analysis.summary,
        ai_intent: analysis.intent,
        ai_priority: analysis.priority,
        ai_is_lead: analysis.is_lead,
        ai_recommended_action: analysis.recommended_action,
        ai_reason: analysis.reason,
        ai_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("company_id", companyId);

    if (updateError) {
      console.error(
        "Advanced AI save analysis error:",
        updateError
      );

      return NextResponse.json(
        {
          error: "تم إنشاء التحليل ولكن تعذر حفظه في Supabase.",
          analysis,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analysis,
      plan: plan.name,
      feature: "advanced_ai",
      saved: true,
    });
  } catch (error) {
    console.error("Advanced AI API Error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تشغيل Advanced AI." },
      { status: 500 }
    );
  }
}









