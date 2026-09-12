"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

type Invitation = {
  id: string;
  company_id: string;
  company_name: string;
  email: string | null;
  role: string;
  expires_at: string;
  accepted_at: string | null;
};

const roleLabels: Record<string, { ar: string; en: string }> = {
  employee: {
    ar: "موظف",
    en: "Employee",
  },
  manager: {
    ar: "مدير",
    en: "Manager",
  },
  sales: {
    ar: "مبيعات",
    en: "Sales",
  },
  support: {
    ar: "دعم",
    en: "Support",
  },
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();

  const token = String(params.token || "");
  const isEnglish = locale === "en";

  const [invitation, setInvitation] =
    useState<Invitation | null>(null);

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/invite/${token}`
      : "";

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      isEnglish ? "en-US" : "ar-EG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function isExpired(date: string) {
    return new Date(date).getTime() <= Date.now();
  }

  async function loadInvitation() {
    if (!token) {
      setError(
        isEnglish
          ? "Invalid invitation link."
          : "رابط الدعوة غير صالح."
      );
      setLoading(false);
      return;
    }

    const { data, error: invitationError } =
      await supabase.rpc("get_company_invitation", {
        invite_token: token,
      });

    if (invitationError) {
      console.error(
        "Invitation lookup error:",
        invitationError
      );

      setError(
        isEnglish
          ? "Unable to load this invitation."
          : "تعذر تحميل هذه الدعوة."
      );

      setLoading(false);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      setError(
        isEnglish
          ? "This invitation does not exist."
          : "هذه الدعوة غير موجودة."
      );

      setLoading(false);
      return;
    }

    setInvitation(result as Invitation);
    setLoading(false);
  }

  useEffect(() => {
    loadInvitation();
  }, [token]);

  async function handleAccept() {
    if (!token || accepting || !invitation) {
      return;
    }

    if (invitation.accepted_at) {
      setError(
        isEnglish
          ? "This invitation has already been used."
          : "تم استخدام هذه الدعوة بالفعل."
      );
      return;
    }

    if (isExpired(invitation.expires_at)) {
      setError(
        isEnglish
          ? "This invitation has expired."
          : "انتهت صلاحية هذه الدعوة."
      );
      return;
    }

    setAccepting(true);
    setError("");
    setSuccess("");

    const {
      data: userData,
    } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push(
        `/${locale}/login?redirect=/invite/${token}`
      );
      return;
    }

    const { data, error: acceptError } =
      await supabase.rpc("accept_company_invitation", {
        invite_token: token,
      });

    if (acceptError) {
      console.error(
        "Invitation acceptance error:",
        acceptError
      );

      setError(
        isEnglish
          ? "Unable to accept the invitation."
          : "تعذر قبول الدعوة."
      );

      setAccepting(false);
      return;
    }

    if (!data?.success) {
      const message =
        data?.error === "expired"
          ? isEnglish
            ? "This invitation has expired."
            : "انتهت صلاحية هذه الدعوة."
          : data?.error === "already_used"
            ? isEnglish
              ? "This invitation has already been used."
              : "تم استخدام هذه الدعوة بالفعل."
            : data?.error === "invalid_invitation"
              ? isEnglish
                ? "This invitation is invalid."
                : "هذه الدعوة غير صالحة."
                : isEnglish
                  ? "Unable to accept this invitation."
                  : "تعذر قبول هذه الدعوة.";

      setError(message);
      setAccepting(false);
      return;
    }

    setSuccess(
      isEnglish
        ? "You have successfully joined the company."
        : "تم انضمامك إلى الشركة بنجاح."
    );

    setTimeout(() => {
      router.push(`/${locale}`);
      router.refresh();
    }, 1200);
  }

  if (loading) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-screen items-center justify-center bg-neutral-50 px-4"
      >
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-7 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
          <p className="text-sm font-semibold text-neutral-700">
            {isEnglish
              ? "Loading invitation..."
              : "جاري تحميل الدعوة..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-screen bg-neutral-50 px-4 py-10"
    >
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-lg items-center justify-center">
        <div className="w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          {/* Brand */}
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg font-black text-white">
              B
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight text-black">
              BusinessOS
            </h1>

            <p className="mt-1 text-sm text-neutral-400">
              {isEnglish
                ? "Company invitation"
                : "دعوة للانضمام إلى الشركة"}
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl">
                !
              </div>

              <p className="mt-4 text-sm font-bold text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => router.push(`/${locale}/login`)}
                className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800"
              >
                {isEnglish ? "Go to login" : "الذهاب لتسجيل الدخول"}
              </button>
            </div>
          ) : invitation ? (
            <>
              {/* Company */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-center">
                <p className="text-xs font-semibold text-neutral-400">
                  {isEnglish
                    ? "You have been invited to"
                    : "تمت دعوتك للانضمام إلى"}
                </p>

                <h2 className="mt-2 text-xl font-black text-black">
                  {invitation.company_name}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  {isEnglish
                    ? "as"
                    : "بصفة"}{" "}
                  <span className="font-bold text-black">
                    {roleLabels[invitation.role]?.[
                      isEnglish ? "en" : "ar"
                    ] || invitation.role}
                  </span>
                </p>
              </div>

              {/* QR */}
              <div className="mt-6 flex justify-center">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  {inviteUrl && (
                    <QRCodeSVG
                      value={inviteUrl}
                      size={190}
                      level="H"
                      includeMargin
                    />
                  )}
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] text-neutral-400">
                {isEnglish
                  ? "Scan this QR code to open this invitation."
                  : "يمكن مسح رمز QR لفتح هذه الدعوة."}
              </p>

              {/* Expiration */}
              <div className="mt-6 rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-neutral-500">
                    {isEnglish
                      ? "Invitation expires"
                      : "تنتهي صلاحية الدعوة"}
                  </span>

                  <span
                    className={`text-xs font-bold ${
                      isExpired(invitation.expires_at)
                        ? "text-red-600"
                        : "text-black"
                    }`}
                  >
                    {formatDate(invitation.expires_at)}
                  </span>
                </div>
              </div>

              {/* Email */}
              {invitation.email && (
                <div className="mt-3 rounded-2xl border border-neutral-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-neutral-500">
                      {isEnglish ? "Email" : "البريد الإلكتروني"}
                    </span>

                    <span className="max-w-[60%] truncate text-xs font-bold text-black">
                      {invitation.email}
                    </span>
                  </div>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-700">
                  {success}
                </div>
              )}

              {/* Accept */}
              {!success && (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={
                    accepting ||
                    !!invitation.accepted_at ||
                    isExpired(invitation.expires_at)
                  }
                  className="mt-6 flex w-full items-center justify-center rounded-2xl bg-black px-5 py-4 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  {accepting
                    ? isEnglish
                      ? "Joining..."
                      : "جاري الانضمام..."
                    : isExpired(invitation.expires_at)
                      ? isEnglish
                        ? "Invitation expired"
                        : "انتهت صلاحية الدعوة"
                      : invitation.accepted_at
                        ? isEnglish
                          ? "Invitation already used"
                          : "تم استخدام الدعوة"
                        : isEnglish
                          ? "Accept invitation"
                          : "قبول الدعوة"}
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
