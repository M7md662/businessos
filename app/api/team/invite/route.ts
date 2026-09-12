import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email,
      companyName,
      role,
      inviteLink,
    } = body;

    if (!email || !companyName || !inviteLink) {
      return NextResponse.json(
        {
          success: false,
          error: "بيانات الدعوة غير مكتملة",
        },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_API_KEY غير موجود في إعدادات الخادم",
        },
        { status: 500 }
      );
    }

    const roleLabels: Record<string, string> = {
      owner: "مالك الشركة",
      manager: "مدير",
      sales: "مبيعات",
      support: "دعم",
      employee: "موظف",
    };

    const roleLabel = roleLabels[role] || "موظف";

    const { data, error } = await resend.emails.send({
      from: "BusinessOS <onboarding@resend.dev>",
      to: [email],
      subject: `دعوة للانضمام إلى ${companyName} في BusinessOS`,
      html: `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>دعوة BusinessOS</title>
          </head>

          <body
            style="
              margin:0;
              padding:0;
              background:#f6f8fc;
              font-family:Arial,Helvetica,sans-serif;
              color:#0f172a;
            "
          >
            <div style="max-width:600px;margin:40px auto;padding:20px;">
              <div
                style="
                  background:#ffffff;
                  border:1px solid #e2e8f0;
                  border-radius:20px;
                  padding:32px;
                  text-align:right;
                "
              >
                <h1
                  style="
                    margin:0 0 12px;
                    font-size:28px;
                    font-weight:800;
                    color:#0f172a;
                  "
                >
                  BusinessOS
                </h1>

                <h2
                  style="
                    margin:0 0 20px;
                    font-size:22px;
                    color:#0f172a;
                  "
                >
                  تمت دعوتك للانضمام إلى الشركة
                </h2>

                <p
                  style="
                    font-size:16px;
                    line-height:1.8;
                    color:#475569;
                  "
                >
                  تمت دعوتك للانضمام إلى
                  <strong>${companyName}</strong>
                  على منصة BusinessOS.
                </p>

                <p
                  style="
                    font-size:15px;
                    line-height:1.8;
                    color:#475569;
                  "
                >
                  الدور المخصص لك:
                  <strong>${roleLabel}</strong>
                </p>

                <div style="text-align:center;margin:30px 0;">
                  <a
                    href="${inviteLink}"
                    style="
                      display:inline-block;
                      background:#0f172a;
                      color:#ffffff;
                      text-decoration:none;
                      padding:14px 28px;
                      border-radius:12px;
                      font-size:16px;
                      font-weight:700;
                    "
                  >
                    قبول الدعوة
                  </a>
                </div>

                <p
                  style="
                    font-size:13px;
                    line-height:1.7;
                    color:#94a3b8;
                  "
                >
                  رابط الدعوة صالح لمدة 7 أيام.
                </p>

                <p
                  style="
                    margin-top:25px;
                    padding-top:20px;
                    border-top:1px solid #e2e8f0;
                    font-size:12px;
                    line-height:1.7;
                    color:#94a3b8;
                    word-break:break-all;
                  "
                >
                  إذا لم يعمل الزر يمكنك فتح الرابط التالي:
                  <br />
                  ${inviteLink}
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message || "تعذر إرسال البريد الإلكتروني",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data?.id || null,
      message: "تم إرسال الدعوة إلى البريد الإلكتروني",
    });
  } catch (error: unknown) {
    console.error("Invite email error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إرسال الدعوة",
      },
      { status: 500 }
    );
  }
}
