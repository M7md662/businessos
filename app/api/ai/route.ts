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

    if (!user) {
      return NextResponse.json(
        {
          error: "يجب تسجيل الدخول لاستخدام المساعد الذكي.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const message = String(body.message || "").trim();
    const locale = body.locale === "en" ? "en" : "ar";

    if (!message) {
      return NextResponse.json(
        {
          error: locale === "en" ? "Message is empty." : "الرسالة فارغة",
        },
        { status: 400 }
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error("Membership lookup error:", membershipError);

      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Unable to verify your company."
              : "تعذر التحقق من الشركة المرتبطة بحسابك.",
        },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "No company is associated with your account."
              : "لا توجد شركة مرتبطة بحسابك.",
        },
        { status: 403 }
      );
    }

    const companyId = membership.company_id;

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError) {
      console.error("Subscription lookup error:", subscriptionError);

      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Unable to verify your subscription."
              : "تعذر التحقق من الاشتراك.",
        },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "No active subscription allows AI access."
              : "لا يوجد اشتراك نشط يسمح باستخدام المساعد الذكي.",
        },
        { status: 403 }
      );
    }

    if (
      subscription.end_date &&
      new Date(subscription.end_date).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Your subscription has expired."
              : "انتهى اشتراكك. يرجى تجديد الاشتراك لاستخدام المساعد الذكي.",
        },
        { status: 403 }
      );
    }

    const {
      data: plan,
      error: planError,
    } = await supabase
      .from("plans")
      .select("*")
      .eq("id", subscription.plan_id)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) {
      console.error("Plan lookup error:", planError);

      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Unable to verify your current plan."
              : "تعذر التحقق من الخطة الحالية.",
        },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Unable to find the plan linked to your subscription."
              : "تعذر العثور على الخطة المرتبطة باشتراكك.",
        },
        { status: 403 }
      );
    }

    const canUseAI = hasFeature(plan.name, "ai");

    if (!canUseAI) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "AI Assistant is available on Pro and Enterprise plans only."
              : "المساعد الذكي متاح في خطة Pro وEnterprise فقط.",
          plan: plan.name,
          feature: "ai",
        },
        { status: 403 }
      );
    }

    const {
      data: knowledge,
      error: knowledgeError,
    } = await supabase
      .from("knowledge_base")
      .select(
        "company_name, business_info, services, pricing, policies, faq"
      )
      .eq("company_id", companyId)
      .maybeSingle();

    if (knowledgeError) {
      console.error("Knowledge lookup error:", knowledgeError);

      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Unable to load your company's knowledge base."
              : "تعذر تحميل قاعدة المعرفة الخاصة بشركتك.",
        },
        { status: 500 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "GROQ_API_KEY is not configured."
              : "مفتاح GROQ_API_KEY غير موجود",
        },
        { status: 500 }
      );
    }

    const companyName = knowledge?.company_name?.trim() || "";
    const businessInfo = knowledge?.business_info?.trim() || "";
    const services = knowledge?.services?.trim() || "";
    const pricing = knowledge?.pricing?.trim() || "";
    const policies = knowledge?.policies?.trim() || "";
    const faq = knowledge?.faq?.trim() || "";

    const knowledgeText = `
اسم الشركة الحقيقي:
${companyName || "غير موجود"}

معلومات النشاط:
${businessInfo || "غير موجودة"}

الخدمات والمنتجات:
${services || "غير موجودة"}

الأسعار:
${pricing || "غير موجودة"}

السياسات:
${policies || "غير موجودة"}

الأسئلة الشائعة:
${faq || "غير موجودة"}
`;

    const groq = new Groq({
      apiKey,
    });

    const systemPrompt =
      locale === "en"
        ? `You are an intelligent assistant inside BusinessOS for managing companies.

Your job is to help the company's customers and answer questions using ONLY the company's knowledge base.

Important rules:

1. Use only information contained in the knowledge base.

2. If the user asks for the company name, use the exact value from "اسم الشركة الحقيقي".

3. Never assume the company name is BusinessOS.
BusinessOS is the system you are operating inside, not necessarily the company's name.

4. Never invent services, prices, policies, or other company information.

5. If the requested information is not available in the knowledge base, clearly say:
"This information is not available in the company's knowledge base."

6. Do not use information from other companies.

7. Answer in clear, concise English because the user is using the English BusinessOS interface.

8. If the knowledge base is empty or does not contain the requested information, do not guess.

Company knowledge base:

${knowledgeText}`
        : `أنت مساعد ذكي داخل BusinessOS لإدارة الشركات.

مهمتك هي مساعدة عملاء الشركة والإجابة عن أسئلتهم اعتمادًا على قاعدة المعرفة الخاصة بالشركة فقط.

قواعد مهمة جدًا:

1. استخدم المعلومات الموجودة في قاعدة المعرفة فقط.

2. إذا سأل المستخدم عن اسم الشركة، استخدم القيمة الموجودة حرفيًا في "اسم الشركة الحقيقي".

3. لا تفترض أن اسم الشركة هو BusinessOS.
BusinessOS هو النظام الذي تعمل بداخله، وليس بالضرورة اسم الشركة.

4. لا تخترع خدمات أو أسعارًا أو سياسات أو معلومات غير موجودة في قاعدة المعرفة.

5. إذا كانت المعلومة غير موجودة في قاعدة المعرفة، قل بوضوح:
"هذه المعلومة غير موجودة في قاعدة المعرفة الخاصة بالشركة."

6. لا تستخدم معلومات من شركات أخرى.

7. أجب باللغة العربية بشكل واضح ومفيد ومختصر.

8. إذا كانت قاعدة المعرفة فارغة أو لا تحتوي على المعلومات المطلوبة، لا تخمن الإجابة.

قاعدة المعرفة الخاصة بالشركة:

${knowledgeText}`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content ||
      (locale === "en"
        ? "I could not generate a response."
        : "لم أتمكن من إنشاء رد.");

    return NextResponse.json({
      reply,
      plan: plan.name,
    });
  } catch (error) {
    console.error("AI API Error:", error);

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي",
      },
      { status: 500 }
    );
  }
}
