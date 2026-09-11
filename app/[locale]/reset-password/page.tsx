"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareReset() {
      try {
        setError("");

        const code = new URLSearchParams(
          window.location.search
        ).get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          window.history.replaceState(
            {},
            document.title,
            "/reset-password"
          );
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error(
            "رابط استرجاع كلمة المرور غير صالح أو انتهت صلاحيته."
          );
        }

        if (active) {
          setInitializing(false);
        }
      } catch (error) {
        console.error(
          "Password recovery session error:",
          error
        );

        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "تعذر التحقق من رابط استرجاع كلمة المرور."
          );

          setInitializing(false);
        }
      }
    }

    prepareReset();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(
        "كلمة المرور يجب أن تكون 6 أحرف أو أكثر."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setMessage(
        "تم تغيير كلمة المرور بنجاح. سيتم تحويلك لتسجيل الدخول..."
      );

      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error(
        "Password update error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تغيير كلمة المرور."
      );
    } finally {
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
      >
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />

          <h1 className="text-xl font-bold text-slate-900">
            جاري التحقق من الرابط...
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            لحظات من فضلك
          </p>
        </div>
      </main>
    );
  }

  if (error && !message) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
      >
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-xl">
              ⚠️
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              تعذر استرجاع الحساب
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              رابط الاسترجاع غير صالح أو انتهت صلاحيته.
            </p>
          </div>

          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-black">
            BusinessOS
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            تغيير كلمة المرور
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            أدخل كلمة المرور الجديدة لحسابك
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                كلمة المرور الجديدة
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="أدخل كلمة المرور الجديدة"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                تأكيد كلمة المرور
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="أعد كتابة كلمة المرور"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "جاري تغيير كلمة المرور..."
                : "تغيير كلمة المرور"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
