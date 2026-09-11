"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocale();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function createCompanyForUser(
    userId: string,
    workspaceName: string
  ) {
    const companyId = crypto.randomUUID();

    const { error: companyError } = await supabase
      .from("companies")
      .insert({
        id: companyId,
        name: workspaceName,
      });

    if (companyError) {
      console.error("Company creation error:", companyError);

      throw new Error(
        companyError.message || "تعذر إنشاء الشركة"
      );
    }

    const { error: memberError } = await supabase
      .from("company_members")
      .insert({
        company_id: companyId,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      console.error("Company member error:", memberError);

      throw new Error(
        memberError.message ||
          "تعذر ربط المستخدم بالشركة"
      );
    }
  }

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("اكتب اسمك");
      return;
    }

    if (!email.trim()) {
      setError("اكتب البريد الإلكتروني");
      return;
    }

    if (!companyName.trim()) {
      setError("اكتب اسم الشركة");
      return;
    }

    if (password.length < 6) {
      setError(
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
      );
      return;
    }

    setLoading(true);

    try {
      const emailRedirectTo =
        `${window.location.origin}/${locale}/auth/callback`;

      const { data, error: authError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo,
            data: {
              full_name: name.trim(),
              company_name: companyName.trim(),
            },
          },
        });

      if (authError) {
        console.error("Supabase Auth error:", {
          message: authError.message,
          status: authError.status,
          name: authError.name,
        });

        throw new Error(
          authError.message ||
            "حدث خطأ أثناء إنشاء الحساب"
        );
      }

      if (!data.user) {
        throw new Error("تعذر إنشاء الحساب");
      }

      if (!data.session) {
        setSuccess(
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني واضغط على رابط التأكيد."
        );

        return;
      }

      await createCompanyForUser(
        data.user.id,
        companyName.trim()
      );

      setSuccess(
        "تم إنشاء الحساب والشركة بنجاح 🎉"
      );

      setTimeout(() => {
        router.replace(`/${locale}`);
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      console.error("Register error:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "حدث خطأ أثناء إنشاء الحساب"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir={locale === "en" ? "ltr" : "rtl"}
      className="min-h-screen bg-[#f6f8fc] px-4 py-10"
    >
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-black text-white shadow-xl">
              B
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              إنشاء حساب
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              ابدأ إدارة أعمالك مع BusinessOS
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <form
              onSubmit={handleRegister}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  الاسم
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="محمد عماد"
                  disabled={loading}
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  البريد الإلكتروني
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  disabled={loading}
                  autoComplete="email"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  اسم الشركة
                </label>

                <input
                  type="text"
                  value={companyName}
                  onChange={(e) =>
                    setCompanyName(e.target.value)
                  }
                  placeholder="شركة BusinessOS"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  كلمة المرور
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />

                <p className="mt-2 text-xs text-slate-400">
                  يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-600">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "جاري إنشاء الحساب..."
                  : "إنشاء الحساب"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
              لديك حساب بالفعل{" "}
              <button
                type="button"
                onClick={() =>
                  router.push(`/${locale}/login`)
                }
                className="font-bold text-slate-950 hover:underline"
              >
                تسجيل الدخول
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            BusinessOS — إدارة أعمالك من مكان واحد
          </p>
        </div>
      </div>
    </main>
  );
}
