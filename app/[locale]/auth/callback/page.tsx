"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const locale = useLocale();

  const [message, setMessage] = useState(
    "جاري تأكيد حسابك..."
  );

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (error) {
            throw error;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            "تعذر تأكيد الحساب. حاول تسجيل الدخول مرة أخرى."
          );
        }

        const { data: existingMember, error: memberError } =
          await supabase
            .from("company_members")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (memberError) {
          throw memberError;
        }

        if (!existingMember) {
          const companyName =
            typeof user.user_metadata?.company_name ===
            "string"
              ? user.user_metadata.company_name.trim()
              : "";

          if (!companyName) {
            throw new Error(
              "تم تأكيد البريد لكن اسم الشركة غير موجود."
            );
          }

          const companyId = crypto.randomUUID();

          const { error: companyError } =
            await supabase
              .from("companies")
              .insert({
                id: companyId,
                name: companyName,
              });

          if (companyError) {
            throw companyError;
          }

          const { error: createMemberError } =
            await supabase
              .from("company_members")
              .insert({
                company_id: companyId,
                user_id: user.id,
                role: "owner",
              });

          if (createMemberError) {
            throw createMemberError;
          }
        }

        if (mounted) {
          setMessage(
            "تم تأكيد حسابك بنجاح 🎉 جاري الدخول..."
          );
        }

        setTimeout(() => {
          router.replace(`/${locale}`);
          router.refresh();
        }, 1000);
      } catch (error) {
        console.error(
          "Authentication callback error:",
          error
        );

        if (mounted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "حدث خطأ أثناء تأكيد الحساب"
          );
        }
      }
    }

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [locale, router]);

  return (
    <main
      dir={locale === "en" ? "ltr" : "rtl"}
      className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4"
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-black text-white">
          B
        </div>

        <h1 className="text-2xl font-black text-slate-950">
          BusinessOS
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-500">
          {message}
        </p>
      </div>
    </main>
  );
}
