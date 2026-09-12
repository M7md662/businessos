"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [password, setPassword] = useState("");

  const [inviteToken, setInviteToken] = useState("");
  const [isInviteRegistration, setIsInviteRegistration] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const token = params.get("invite") || "";

    if (token) {
      setInviteToken(token);
      setIsInviteRegistration(true);
    }
  }, []);

  const businessTypes = [
    {
      value: "company",
      label: isEnglish ? "Company / Services" : "شركة / خدمات",
    },
    {
      value: "travel",
      label: isEnglish ? "Travel Agency" : "شركة سياحة وسفر",
    },
    {
      value: "education",
      label: isEnglish
        ? "Educational Platform"
        : "منصة تعليمية",
    },
    {
      value: "store",
      label: isEnglish
        ? "Store / E-commerce"
        : "متجر / تجارة إلكترونية",
    },
    {
      value: "agency",
      label: isEnglish ? "Agency" : "وكالة",
    },
    {
      value: "other",
      label: isEnglish ? "Other" : "أخرى",
    },
  ];

  async function createCompanyForUser(
    userId: string,
    workspaceName: string,
    selectedBusinessType: string
  ) {
    const companyId = crypto.randomUUID();

    const { error: companyError } = await supabase
      .from("companies")
      .insert({
        id: companyId,
        name: workspaceName,
        business_type: selectedBusinessType,
      });

    if (companyError) {
      console.error(
        "Company creation error:",
        companyError
      );

      throw new Error(
        companyError.message ||
          (isEnglish
            ? "Unable to create the company"
            : "تعذر إنشاء الشركة")
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
      console.error(
        "Company member error:",
        memberError
      );

      throw new Error(
        memberError.message ||
          (isEnglish
            ? "Unable to link the user to the company"
            : "تعذر ربط المستخدم بالشركة")
      );
    }
  }

  async function acceptInvitation(
    token: string
  ) {
    const { data, error: acceptError } =
      await supabase.rpc(
        "accept_company_invitation",
        {
          invite_token: token,
        }
      );

    if (acceptError) {
      console.error(
        "Invitation acceptance error:",
        acceptError
      );

      throw new Error(
        isEnglish
          ? "Account created, but the invitation could not be accepted."
          : "تم إنشاء الحساب، لكن تعذر قبول الدعوة."
      );
    }

    if (!data?.success) {
      const message =
        data?.error === "expired"
          ? isEnglish
            ? "This invitation has expired."
            : "انتهت صلاحية الدعوة."
          : data?.error === "already_used"
            ? isEnglish
              ? "This invitation has already been used."
              : "تم استخدام هذه الدعوة بالفعل."
            : data?.error === "invalid_invitation"
              ? isEnglish
                ? "This invitation is invalid."
                : "هذه الدعوة غير صالحة."
              : isEnglish
                ? "Unable to accept the invitation."
                : "تعذر قبول الدعوة.";

      throw new Error(message);
    }
  }

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(
        isEnglish ? "Enter your name" : "اكتب اسمك"
      );
      return;
    }

    if (!email.trim()) {
      setError(
        isEnglish
          ? "Enter your email address"
          : "اكتب البريد الإلكتروني"
      );
      return;
    }

    if (!isInviteRegistration && !companyName.trim()) {
      setError(
        isEnglish
          ? "Enter your company name"
          : "اكتب اسم الشركة"
      );
      return;
    }

    if (!isInviteRegistration && !businessType) {
      setError(
        isEnglish
          ? "Select your business type"
          : "اختر نوع النشاط"
      );
      return;
    }

    if (password.length < 6) {
      setError(
        isEnglish
          ? "Password must be at least 6 characters"
          : "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
      );
      return;
    }

    if (isInviteRegistration && !inviteToken) {
      setError(
        isEnglish
          ? "Invalid invitation link."
          : "رابط الدعوة غير صالح."
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
              ...(isInviteRegistration
                ? {
                    invited_by_token: inviteToken,
                  }
                : {
                    company_name: companyName.trim(),
                    business_type: businessType,
                  }),
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
            (isEnglish
              ? "An error occurred while creating the account"
              : "حدث خطأ أثناء إنشاء الحساب")
        );
      }

      if (!data.user) {
        throw new Error(
          isEnglish
            ? "Unable to create the account"
            : "تعذر إنشاء الحساب"
        );
      }

      /*
       * Employee invitation registration
       *
       * The employee must join the existing company.
       * We do NOT create a new company here.
       */
      if (isInviteRegistration) {
        if (!data.session) {
          setSuccess(
            isEnglish
              ? "Account created. Please sign in to complete the invitation."
              : "تم إنشاء الحساب. سجّل الدخول لإكمال قبول الدعوة."
          );

          setTimeout(() => {
            router.replace(
              `/${locale}/login?redirect=/invite/${encodeURIComponent(
                inviteToken
              )}`
            );
          }, 1200);

          return;
        }

        await acceptInvitation(inviteToken);

        setSuccess(
          isEnglish
            ? "Account created and you joined the company successfully 🎉"
            : "تم إنشاء الحساب وانضممت إلى الشركة بنجاح 🎉"
        );

        setTimeout(() => {
          router.replace(`/${locale}`);
          router.refresh();
        }, 1200);

        return;
      }

      /*
       * Normal registration
       *
       * This creates a new company and makes
       * the first user the Company Owner.
       */
      if (!data.session) {
        setSuccess(
          isEnglish
            ? "Account created. Check your email and click the confirmation link."
            : "تم إنشاء الحساب. تحقق من بريدك الإلكتروني واضغط على رابط التأكيد."
        );

        return;
      }

      await createCompanyForUser(
        data.user.id,
        companyName.trim(),
        businessType
      );

      setSuccess(
        isEnglish
          ? "Account and company created successfully 🎉"
          : "تم إنشاء الحساب والشركة بنجاح 🎉"
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
          isEnglish
            ? "An error occurred while creating the account"
            : "حدث خطأ أثناء إنشاء الحساب"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-screen bg-[#f6f8fc] px-4 py-10"
    >
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-black text-white shadow-xl">
              B
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              {isInviteRegistration
                ? isEnglish
                  ? "Join Company"
                  : "الانضمام إلى الشركة"
                : isEnglish
                  ? "Create Account"
                  : "إنشاء حساب"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {isInviteRegistration
                ? isEnglish
                  ? "Create your account to join the invited company"
                  : "أنشئ حسابك للانضمام إلى الشركة التي تمت دعوتك إليها"
                : isEnglish
                  ? "Start managing your business with BusinessOS"
                  : "ابدأ إدارة أعمالك مع BusinessOS"}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            {isInviteRegistration && (
              <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-center">
                <p className="text-sm font-bold text-slate-900">
                  {isEnglish
                    ? "You are joining through a company invitation."
                    : "أنت تنضم من خلال دعوة شركة."}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {isEnglish
                    ? "You do not need to create a company or select a business type."
                    : "لا تحتاج إلى إنشاء شركة أو اختيار نوع نشاط."}
                </p>
              </div>
            )}

            <form
              onSubmit={handleRegister}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  {isEnglish ? "Name" : "الاسم"}
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder={
                    isEnglish
                      ? "Mohammed Emad"
                      : "محمد عماد"
                  }
                  disabled={loading}
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  {isEnglish
                    ? "Email Address"
                    : "البريد الإلكتروني"}
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

              {!isInviteRegistration && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      {isEnglish
                        ? "Company Name"
                        : "اسم الشركة"}
                    </label>

                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) =>
                        setCompanyName(e.target.value)
                      }
                      placeholder={
                        isEnglish
                          ? "BusinessOS Company"
                          : "شركة BusinessOS"
                      }
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      {isEnglish
                        ? "Business Type"
                        : "نوع النشاط"}
                    </label>

                    <select
                      value={businessType}
                      onChange={(e) =>
                        setBusinessType(e.target.value)
                      }
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                    >
                      <option value="">
                        {isEnglish
                          ? "Select business type"
                          : "اختر نوع النشاط"}
                      </option>

                      {businessTypes.map((type) => (
                        <option
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  {isEnglish
                    ? "Password"
                    : "كلمة المرور"}
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
                  {isEnglish
                    ? "Password must contain at least 6 characters"
                    : "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل"}
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
                  ? isEnglish
                    ? "Creating account..."
                    : "جاري إنشاء الحساب..."
                  : isInviteRegistration
                    ? isEnglish
                      ? "Create Account & Join"
                      : "إنشاء الحساب والانضمام"
                    : isEnglish
                      ? "Create Account"
                      : "إنشاء الحساب"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
              {isEnglish
                ? "Already have an account?"
                : "لديك حساب بالفعل"}{" "}
              <button
                type="button"
                onClick={() =>
                  isInviteRegistration
                    ? router.push(
                        `/${locale}/login?redirect=/invite/${encodeURIComponent(
                          inviteToken
                        )}`
                      )
                    : router.push(
                        `/${locale}/login`
                      )
                }
                className="font-bold text-slate-950 hover:underline"
              >
                {isEnglish
                  ? "Sign in"
                  : "تسجيل الدخول"}
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            {isEnglish
              ? "BusinessOS — Manage your business from one place"
              : "BusinessOS — إدارة أعمالك من مكان واحد"}
          </p>
        </div>
      </div>
    </main>
  );
}