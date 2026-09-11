"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const text = isEnglish
    ? {
        badge: "Business management platform",
        title: "Welcome back",
        subtitle:
          "Sign in to your BusinessOS workspace and continue managing your business.",
        email: "Email address",
        emailPlaceholder: "you@example.com",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        forgot: "Forgot password?",
        sending: "Sending...",
        login: "Sign in",
        loggingIn: "Signing in...",
        noAccount: "Don't have an account?",
        createAccount: "Create a new account",
        footer: "BusinessOS — Manage your business from one place",
        loginSuccess: "Signed in successfully.",
        loginError: "The email or password is incorrect.",
        enterEmail: "Please enter your email address first.",
        resetSuccess:
          "A password recovery link has been sent to your email.",
        resetError:
          "An error occurred while sending the password recovery link.",
        secure: "Secure authentication",
        workspace: "Professional workspace",
        ai: "AI-powered business tools",
      }
    : {
        badge: "منصة إدارة الأعمال",
        title: "مرحبًا بعودتك",
        subtitle:
          "سجّل الدخول إلى مساحة عمل BusinessOS وتابع إدارة أعمالك.",
        email: "البريد الإلكتروني",
        emailPlaceholder: "you@example.com",
        password: "كلمة المرور",
        passwordPlaceholder: "أدخل كلمة المرور",
        forgot: "هل نسيت كلمة المرور؟",
        sending: "جاري الإرسال...",
        login: "تسجيل الدخول",
        loggingIn: "جاري تسجيل الدخول...",
        noAccount: "ليس لديك حساب؟",
        createAccount: "إنشاء حساب جديد",
        footer: "BusinessOS — إدارة أعمالك من مكان واحد",
        loginSuccess: "تم تسجيل الدخول بنجاح.",
        loginError:
          "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        enterEmail: "اكتب بريدك الإلكتروني أولًا.",
        resetSuccess:
          "تم إرسال رابط استرجاع كلمة المرور إلى بريدك الإلكتروني.",
        resetError:
          "حدث خطأ أثناء إرسال رابط استرجاع كلمة المرور.",
        secure: "مصادقة آمنة",
        workspace: "مساحة عمل احترافية",
        ai: "أدوات أعمال مدعومة بالذكاء الاصطناعي",
      };

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(text.loginError);
      setLoading(false);
      return;
    }

    setSuccess(text.loginSuccess);

    window.location.href = `/${locale}`;
  }

  async function handleForgotPassword() {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError(text.enterEmail);
      return;
    }

    setResetLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

      if (error) {
        throw error;
      }

      setSuccess(text.resetSuccess);
    } catch (error) {
      console.error("Password recovery error:", error);

      setError(
        error instanceof Error
          ? error.message
          : text.resetError
      );
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-screen bg-[#f3f3f3] px-4 py-6 text-[#111] sm:px-6 sm:py-10"
    >
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[1200px] items-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-neutral-100 bg-white shadow-[0_20px_70px_rgba(0,0,0,.08)] lg:grid-cols-[1fr_1.05fr]">
          {/* Brand panel */}
          <div className="relative hidden min-h-[650px] overflow-hidden bg-black p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="relative z-10">
              <Link
                href={`/${locale}`}
                className="inline-flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
                  B
                </div>

                <div>
                  <div className="text-sm font-bold">
                    BusinessOS
                  </div>

                  <div className="text-[9px] text-neutral-500">
                    Business Suite
                  </div>
                </div>
              </Link>

              <div className="mt-24 max-w-md">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-neutral-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {text.badge}
                </div>

                <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
                  {isEnglish
                    ? "Everything your business needs."
                    : "كل ما يحتاجه عملك في مكان واحد."}
                </h2>

                <p className="mt-5 max-w-sm text-sm leading-7 text-neutral-400">
                  {text.subtitle}
                </p>
              </div>
            </div>

            <div className="relative z-10 grid gap-3">
              <InfoItem
                icon={<ShieldCheck className="h-4 w-4" />}
                text={text.secure}
              />

              <InfoItem
                icon={<LockKeyhole className="h-4 w-4" />}
                text={text.workspace}
              />

              <InfoItem
                icon={<Sparkles className="h-4 w-4" />}
                text={text.ai}
              />
            </div>

            <div className="pointer-events-none absolute -bottom-32 -end-20 h-80 w-80 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-20 -end-8 h-56 w-56 rounded-full border border-white/10" />
          </div>

          {/* Login panel */}
          <div className="flex min-h-[650px] flex-col justify-center bg-white p-6 sm:p-10 lg:p-14">
            <div className="mx-auto w-full max-w-md">
              {/* Mobile logo */}
              <div className="mb-10 lg:hidden">
                <Link
                  href={`/${locale}`}
                  className="inline-flex items-center gap-2"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-xs font-bold text-white">
                    B
                  </div>

                  <div>
                    <div className="text-sm font-bold">
                      BusinessOS
                    </div>

                    <div className="text-[9px] text-neutral-400">
                      Business Suite
                    </div>
                  </div>
                </Link>
              </div>

              <div className="mb-8">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                  <LockKeyhole
                    className="h-5 w-5"
                    strokeWidth={1.8}
                  />
                </div>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {text.title}
                </h1>

                <p className="mt-3 text-sm leading-6 text-neutral-400">
                  {text.subtitle}
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-semibold text-neutral-700"
                  >
                    {text.email}
                  </label>

                  <div className="relative">
                    <Mail
                      className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 ${
                        isEnglish ? "left-4" : "right-4"
                      }`}
                      strokeWidth={1.8}
                    />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder={text.emailPlaceholder}
                      required
                      autoComplete="email"
                      className={`h-12 w-full rounded-xl border border-neutral-200 bg-[#fafafa] text-sm outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-neutral-100 ${
                        isEnglish
                          ? "pl-11 pr-4"
                          : "pr-11 pl-4"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-neutral-700"
                    >
                      {text.password}
                    </label>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="text-[11px] font-semibold text-neutral-500 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resetLoading
                        ? text.sending
                        : text.forgot}
                    </button>
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 ${
                        isEnglish ? "left-4" : "right-4"
                      }`}
                      strokeWidth={1.8}
                    />

                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder={text.passwordPlaceholder}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      className={`h-12 w-full rounded-xl border border-neutral-200 bg-[#fafafa] text-sm outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-neutral-100 ${
                        isEnglish
                          ? "pl-11 pr-4"
                          : "pr-11 pl-4"
                      }`}
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    text.loggingIn
                  ) : (
                    <>
                      {text.login}

                      {isEnglish ? (
                        <ArrowRight className="h-4 w-4" />
                      ) : (
                        <ArrowLeft className="h-4 w-4" />
                      )}
                    </>
                  )}
                </button>
              </form>

              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-100" />
                <span className="text-[9px] text-neutral-300">
                  BusinessOS
                </span>
                <div className="h-px flex-1 bg-neutral-100" />
              </div>

              <div className="text-center">
                <p className="text-xs text-neutral-400">
                  {text.noAccount}
                </p>

                <Link
                  href={`/${locale}/register`}
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-black transition hover:border-black hover:bg-neutral-50"
                >
                  {text.createAccount}
                </Link>
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] text-neutral-300">
                  {text.footer}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-neutral-300">
        {icon}
      </div>

      <span className="text-xs text-neutral-300">
        {text}
      </span>
    </div>
  );
}