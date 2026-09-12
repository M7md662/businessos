"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Link2,
  Loader2,
  Mail,
  Plus,
  QrCode,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string | null;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [showQr, setShowQr] = useState<Invitation | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTeam() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        throw new Error("لم يتم العثور على شركة لهذا الحساب");
      }

      setCompanyId(membership.company_id);
      setIsOwner(membership.role === "owner");

      const { data: company, error: companyError } =
        await supabase
          .from("companies")
          .select("name")
          .eq("id", membership.company_id)
          .single();

      if (companyError) throw companyError;

      setCompanyName(company?.name || "Company");

      const { data: memberRows, error: membersError } =
        await supabase
          .from("company_members")
          .select("id, user_id, role, created_at")
          .eq("company_id", membership.company_id)
          .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      setMembers(memberRows || []);

      if (membership.role === "owner") {
        const {
          data: invitationRows,
          error: invitationError,
        } = await supabase
          .from("company_invitations")
          .select(
            "id, email, role, token, expires_at, created_at"
          )
          .eq("company_id", membership.company_id)
          .order("created_at", { ascending: false });

        if (invitationError) throw invitationError;

        setInvitations(invitationRows || []);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الفريق"
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendInvitationEmail(invitation: Invitation) {
    if (!invitation.email) {
      return {
        success: false,
        skipped: true,
        error: "",
      };
    }

    const inviteLink = getInviteLink(invitation.token);

    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: invitation.email,
          companyName,
          role: invitation.role,
          inviteLink,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          skipped: false,
          error:
            result.error ||
            "تعذر إرسال البريد الإلكتروني",
        };
      }

      return {
        success: true,
        skipped: false,
        error: "",
      };
    } catch {
      return {
        success: false,
        skipped: false,
        error: "تعذر الاتصال بخدمة البريد الإلكتروني",
      };
    }
  }

  async function createInvitation() {
    setError("");
    setMessage("");

    if (!isOwner) {
      setError("فقط مالك الشركة يستطيع إرسال الدعوات");
      return;
    }

    if (!email.trim()) {
      setError("اكتب البريد الإلكتروني للموظف");
      return;
    }

    setCreating(true);

    try {
      const { data, error: invitationError } = await supabase
        .from("company_invitations")
        .insert({
          company_id: companyId,
          email: email.trim(),
          role,
        })
        .select(
          "id, email, role, token, expires_at, created_at"
        )
        .single();

      if (invitationError) throw invitationError;

      const invitation = data as Invitation;

      setInvitations((current) => [
        invitation,
        ...current,
      ]);

      const emailResult =
        await sendInvitationEmail(invitation);

      setEmail("");
      setRole("employee");
      setShowInvite(false);

      if (emailResult.success) {
        setMessage(
          `تم إنشاء الدعوة وإرسالها إلى ${invitation.email}`
        );
      } else {
        setMessage(
          "تم إنشاء الدعوة لكن تعذر إرسال البريد الإلكتروني. يمكنك نسخ الرابط وإرساله يدويًا."
        );

        if (emailResult.error) {
          setError(emailResult.error);
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر إنشاء الدعوة"
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteInvitation(id: string) {
    if (!isOwner) return;

    const { error: deleteError } = await supabase
      .from("company_invitations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (showQr?.id === id) {
      setShowQr(null);
    }

    setInvitations((current) =>
      current.filter((item) => item.id !== id)
    );

    setMessage("تم إلغاء الدعوة");
  }

  function getInviteLink(token: string) {
    if (typeof window === "undefined") return "";

    const locale =
      window.location.pathname.match(/^\/(ar|en)(?:\/|$)/)?.[1] ||
      "ar";

    return `https://businessos-sable.vercel.app/${locale}/invite/${token}`;
  }

  async function copyInvite(token: string) {
    const link = getInviteLink(token);

    try {
      await navigator.clipboard.writeText(link);
      setMessage("تم نسخ رابط الدعوة");
    } catch {
      setError("تعذر نسخ الرابط");
    }
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt).getTime() <= Date.now();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case "owner":
        return "مالك الشركة";
      case "manager":
        return "مدير";
      case "sales":
        return "مبيعات";
      case "support":
        return "دعم";
      default:
        return "موظف";
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-950" />
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f6f8fc] p-4 sm:p-6 lg:p-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-950">
                الفريق
              </h1>

              <p className="text-sm text-slate-500">
                {companyName}
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
                setShowInvite(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              دعوة موظف
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-black text-slate-950">
              أعضاء الشركة
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              جميع المستخدمين المرتبطين بهذه الشركة
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                    {member.role === "owner" ? "O" : "M"}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {getRoleLabel(member.role)}
                    </p>

                    <p className="text-xs text-slate-500">
                      {member.role}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {member.role === "owner"
                    ? "Owner"
                    : "Member"}
                </span>
              </div>
            ))}

            {members.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                لا يوجد أعضاء
              </div>
            )}
          </div>
        </section>

        {isOwner && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-black text-slate-950">
                دعوات الفريق
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                كل دعوة لها رابط وQR خاص بها وصلاحية محددة
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {invitations.map((invitation) => {
                const expired = isExpired(
                  invitation.expires_at
                );

                const inviteLink = getInviteLink(
                  invitation.token
                );

                return (
                  <div
                    key={invitation.id}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-950">
                            {invitation.email || "دعوة عامة"}
                          </p>

                          {expired ? (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">
                              منتهية
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                              فعالة
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          الدور:{" "}
                          <span className="font-bold text-slate-700">
                            {getRoleLabel(invitation.role)}
                          </span>
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          تنتهي:{" "}
                          {formatDate(
                            invitation.expires_at
                          )}
                        </p>

                        <p
                          className="mt-2 max-w-xl truncate text-[10px] text-slate-300"
                          dir="ltr"
                        >
                          {inviteLink}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setShowQr(invitation)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <QrCode className="h-4 w-4" />
                          QR
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            copyInvite(invitation.token)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Copy className="h-4 w-4" />
                          نسخ الرابط
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteInvitation(invitation.id)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {invitations.length === 0 && (
                <div className="p-8 text-center">
                  <Link2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />

                  <p className="text-sm font-bold text-slate-700">
                    لا توجد دعوات
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    أنشئ أول دعوة لإضافة موظف
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  دعوة موظف
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  سيتم إنشاء رابط وQR وإرسال الدعوة إلى البريد
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
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
                  placeholder="employee@example.com"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  الدور
                </label>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="employee">
                    Employee
                  </option>
                  <option value="manager">
                    Manager
                  </option>
                  <option value="sales">
                    Sales
                  </option>
                  <option value="support">
                    Support
                  </option>
                </select>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <p className="font-bold text-slate-700">
                  مدة الدعوة
                </p>

                <p className="mt-1">
                  الرابط والـQR صالحان لمدة 7 أيام.
                </p>
              </div>

              <button
                type="button"
                onClick={createInvitation}
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}

                {creating
                  ? "جاري إنشاء وإرسال الدعوة..."
                  : "إنشاء وإرسال الدعوة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQr && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  QR Code
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  دعوة {showQr.email || "عامة"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowQr(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-5">
              <QRCodeSVG
                value={getInviteLink(showQr.token)}
                size={230}
                level="H"
                includeMargin
              />
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-bold text-slate-500">
                تنتهي الدعوة
              </p>

              <p
                className={`mt-1 text-xs font-black ${
                  isExpired(showQr.expires_at)
                    ? "text-red-600"
                    : "text-slate-950"
                }`}
              >
                {formatDate(showQr.expires_at)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => copyInvite(showQr.token)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Copy className="h-4 w-4" />
              نسخ رابط الدعوة
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

