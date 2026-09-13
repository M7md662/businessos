"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RegistrationMode = "owner" | "employee" | "";

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [password, setPassword] = useState("");

  const [registrationMode, setRegistrationMode] =
    useState<RegistrationMode>("");

  const [inviteToken, setInviteToken] = useState("");
  const [isInviteRegistration, setIsInviteRegistration] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite")?.trim() || "";

    if (token) {
      setInviteToken(token);
      setIsInviteRegistration(true);
      setRegistrationMode("employee");
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
    workspaceName: string,
    selectedBusinessType: string
  ) {
    const { data, error } = await supabase.rpc(
      "create_company_with_owner",
      {
        company_name: workspaceName.trim(),
        business_type: selectedBusinessType,
      }
    );

    if (error) {
      console.error(
        "Company creation RPC error:",
        error
      );

      throw new Error(
        error.message ||
          (isEnglish
            ? "Unable to create the company"
            : "تعذر إنشاء الشركة")
      );
    }

    if (!data?.success) {
      console.error(
        "Company creation failed:",
        data
      );

      throw new Error(
        isEnglish
          ? "Unable to create the company"
          : "تعذر إنشاء الشركة"
      );
    }
  }

  async function acceptInvitation(token: string) {
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
          : "تم إنشاء الحساب لكن تعذر قبول الدعوة."
      );
    }

    if (!data?.success) {
      const invitationError = data?.error;

      if (invitationError === "expired") {
        throw new Error(
          isEnglish
            ? "This invitation has expired."
            : "انتهت صلاحية الدعوة."
        );
      }

      if (invitationError === "already_used") {
        throw new Error(
          isEnglish
            ? "This invitation has already been used."
            : "تم استخدام هذه الدعوة بالفعل."
        );
      }

      if (invitationError === "invalid_invitation") {
        throw new Error(
          isEnglish
            ? "This invitation is invalid."
            : "هذه الدعوة غير صالحة."
        );
      }

      if (invitationError === "email_mismatch") {
        throw new Error(
          isEnglish
            ? "This invitation was sent to a different email address."
            : "هذه الدعوة موجهة إلى بريد إلكتروني مختلف."
        );
      }

      if (invitationError === "not_authenticated") {
        throw new Error(
          isEnglish
            ? "Please sign in before accepting this invitation."
            : "يرجى تسجيل الدخول قبل قبول هذه الدعوة."
        );
      }

      throw new Error(
        isEnglish
          ? "Unable to accept the invitation."
          : "تعذر قبول الدعوة."
      );
    }
  }

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!registrationMode) {
      setError(
        isEnglish
          ? "Choose how you want to use BusinessOS."
          : "اختر أولًا كيف تريد استخدام BusinessOS."
      );
      return;
    }

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

    if (
      registrationMode === "owner" &&
      !companyName.trim()
    ) {
      setError(
        isEnglish
          ? "Enter your company name"
          : "اكتب اسم الشركة"
      );
      return;
    }

    if (
      registrationMode === "owner" &&
      !businessType
    ) {
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
              registration_type: registrationMode,
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
       * Employee + invitation:
       * create the account, then immediately accept
       * the invitation when a session is available.
       */
      if (
        registrationMode === "employee" &&
        isInviteRegistration
      ) {
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
       * Owner:
       * create the company and owner membership.
       */
      if (registrationMode === "owner") {
        if (!data.session) {
          setSuccess(
            isEnglish
              ? "Account created. Check your email and click the confirmation link."
              : "تم إنشاء الحساب. تحقق من بريدك الإلكتروني واضغط على رابط التأكيد."
          );

          return;
        }

        await createCompanyForUser(
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

        return;
      }

      /*
       * Employee without invitation:
       * The account exists, but it has no company membership.
       * The user must wait until a company invites them.
       */
      setSuccess(
        isEnglish
          ? "Your employee account was created successfully. You are currently waiting for a company invitation."
          : "تم إنشاء حساب الموظف بنجاح. حسابك الآن في انتظار دعوة من شركة."
      );

      setTimeout(() => {
        router.replace(`/${locale}/login`);
      }, 1800);
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

  function selectRegistrationMode(
    mode: RegistrationMode
  ) {
    if (loading || isInviteRegistration) {
      return;
    }

    setRegistrationMode(mode);
    setError("");
    setSuccess("");
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
                : registrationMode === "employee"
                  ? isEnglish
                    ? "Create Employee Account"
                    : "إنشاء حساب موظف"
                  : registrationMode === "owner"
                    ? isEnglish
                      ? "Create Your Business"
                      : "إنشاء مساحة عملك"
                    : isEnglish
                      ? "Create Account"
                      : "إنشاء حساب"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {isInviteRegistration
                ? isEnglish
                  ? "Create your account to join the invited company"
                  : "أنشئ حسابك للانضمام إلى الشركة التي تمت دعوتك إليها"
                : !registrationMode
                  ? isEnglish
                    ? "Choose how you want to use BusinessOS"
                    : "اختر كيف تريد استخدام BusinessOS"
                  : registrationMode === "employee"
                    ? isEnglish
                      ? "Create an employee account and wait for a company invitation"
                      : "أنشئ حساب موظف وانتظر دعوة من شركة"
                    : isEnglish
                      ? "Create and manage your business with BusinessOS"
                      : "أنشئ وأدر أعمالك باستخدام BusinessOS"}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            {isInviteRegistration ? (
              <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-center">
                <p className="text-sm font-bold text-slate-900">
                  {isEnglish
                    ? "You are joining through a company invitation."
                    : "أنت تنضم من خلال دعوة شركة."}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {isEnglish
                    ? "Create your account using the email address that received the invitation."
                    : "أنشئ حسابك باستخدام البريد الإلكتروني الذي تم إرسال الدعوة إليه."}
                </p>
              </div>
            ) : !registrationMode ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() =>
                    selectRegistrationMode("owner")
                  }
                  className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-right transition hover:border-slate-400 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xl text-white">
                      🏢
                    </div>

                    <div className="flex-1">
                      <p className="font-black text-slate-950">
                        {isEnglish
                          ? "Company / Business Owner"
                          : "صاحب شركة / مؤسسة"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {isEnglish
                          ? "Create a workspace and manage your team and business."
                          : "أنشئ مساحة عمل وأدر فريقك وأعمالك."}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    selectRegistrationMode("employee")
                  }
                  className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-right transition hover:border-slate-400 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-950">
                      👤
                    </div>

                    <div className="flex-1">
                      <p className="font-black text-slate-950">
                        {isEnglish
                          ? "Employee"
                          : "موظف"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {isEnglish
                          ? "Create an employee account and join a company when invited."
                          : "أنشئ حساب موظف وانضم إلى الشركة عند وصول دعوة."}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <>
                {registrationMode === "employee" &&
                  !isInviteRegistration && (
                    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
                      <p className="text-sm font-bold text-slate-900">
                        {isEnglish
                          ? "No company invitation is required to create your account."
                          : "لا تحتاج إلى دعوة لإنشاء حساب الموظف."}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {isEnglish
                          ? "After registration, your account will wait for a company invitation."
                          : "بعد التسجيل سيبقى حسابك في انتظار دعوة من شركة."}
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

                  {registrationMode === "owner" && (
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
                            setCompanyName(
                              e.target.value
                            )
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
                            setBusinessType(
                              e.target.value
                            )
                          }
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                        >
                          <option value="">
                            {isEnglish
                              ? "Select business type"
                              : "اختر نوع النشاط"}
                          </option>

                          {businessTypes.map(
                            (type) => (
                              <option
                                key={type.value}
                                value={type.value}
                              >
                                {type.label}
                              </option>
                            )
                          )}
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
                        setPassword(
                          e.target.value
                        )
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
                        : registrationMode === "employee"
                          ? isEnglish
                            ? "Create Employee Account"
                            : "إنشاء حساب الموظف"
                          : isEnglish
                            ? "Create Account"
                            : "إنشاء الحساب"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    if (!isInviteRegistration) {
                      setRegistrationMode("");
                      setError("");
                      setSuccess("");
                    }
                  }}
                  disabled={loading || isInviteRegistration}
                  className="mt-4 w-full text-center text-sm font-bold text-slate-500 hover:text-slate-950 disabled:cursor-default"
                >
                  {isEnglish
                    ? "← Change registration type"
                    : "→ تغيير طريقة التسجيل"}
                </button>
              </>
            )}

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
              ? "BusinessOS - Manage your business from one place"
              : "BusinessOS - إدارة أعمالك من مكان واحد"}
          </p>
        </div>
      </div>
    </main>
  );
}
