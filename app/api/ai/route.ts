import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body.message || "").trim();
    const knowledge = body.knowledge || {};

    if (!message) {
      return NextResponse.json(
        { error: "الرسالة فارغة" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "مفتاح GROQ_API_KEY غير موجود" },
        { status: 500 }
      );
    }

    const companyName = String(
      knowledge.companyName || ""
    ).trim();

    const businessInfo = String(
      knowledge.businessInfo || ""
    ).trim();

    const services = String(
      knowledge.services || ""
    ).trim();

    const pricing = String(
      knowledge.pricing || ""
    ).trim();

    const policies = String(
      knowledge.policies || ""
    ).trim();

    const faq = String(
      knowledge.faq || ""
    ).trim();

    const groq = new Groq({
      apiKey,
    });

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

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: `أنت مساعد ذكي داخل نظام لإدارة الشركات.

أجب عن سؤال المستخدم اعتمادًا على قاعدة المعرفة المرفقة فقط.

قاعدة مهمة جدًا:
إذا سأل المستخدم عن اسم الشركة، استخدم القيمة الموجودة حرفيًا في خانة "اسم الشركة الحقيقي".

لا تفترض اسمًا للشركة من اسم النظام أو التطبيق.
لا تستخدم اسم "BusinessOS" كاسم للشركة إلا إذا كانت خانة "اسم الشركة الحقيقي" تحتوي على BusinessOS.

لا تخترع معلومات أو أسعارًا أو خدمات غير موجودة في قاعدة المعرفة.

إذا كانت المعلومة غير موجودة في قاعدة المعرفة، قل بوضوح إنها غير موجودة في قاعدة المعرفة.

أجب باللغة العربية بشكل واضح ومفيد.

قاعدة المعرفة:
${knowledgeText}`,
          },
          {
            role: "user",
            content: message,
          },
        ],
      });

    const reply =
      completion.choices[0]?.message?.content ||
      "لم أتمكن من إنشاء رد.";

    return NextResponse.json({
      reply,
    });
  } catch (error) {
    console.error("AI API Error:", error);

    return NextResponse.json(
      {
        error: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي",
      },
      { status: 500 }
    );
  }
}