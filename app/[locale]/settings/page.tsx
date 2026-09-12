"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  User,
  Building2,
  Globe2,
  Bell,
  ShieldCheck,
  LogOut,
  Check,
  ChevronRight,
  Sparkles,
  Settings as SettingsIcon,
  Users,
  Mail,
  QrCode,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [email, setEmail] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const [aiEnabled, setAiEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [conversationNotifications, setConversationNotifications] =
    useState(true);
  const [saved, setSaved] = useState(false);

  const text = isEnglish
    ? {
        title: "Settings",
        subtitle: "Manage your BusinessOS workspace and preferences.",
        workspace: "Workspace",
        workspaceName: "BusinessOS PRO",
        workspaceDescription: "Professional business workspace",
        plan: "Current plan",
        planValue: "PRO",
        account: "Account",
        accountDescription: "Your account information",
        email: "Email address",
        role: "Role",
        ownerRole: "Company Owner",
        memberRole: "Workspace member",
        preferences: "Preferences",
        preferencesDescription:
          "Customize how BusinessOS works for you.",
        language: "Language",
        languageDescription:
          "Choose your preferred interface language.",
        arabic: "العربية",
        english: "English",
        ai: "AI Assistant",
        aiDescription:
          "Enable AI-powered business assistance.",
        notifications: "Notifications",
        notificationsDescription:
          "Control notifications and workspace activity alerts.",
        taskNotifications: "Task notifications",
        taskNotificationsDescription:
          "Receive notifications about task updates.",
        conversationNotifications: "Conversation notifications",
        conversationNotificationsDescription:
          "Receive notifications about customer conversations.",
        security: "Security",
        securityDescription:
          "Manage your account session.",
        signOut: "Sign out",
        save: "Save preferences",
        saved: "Saved",
        secure: "Your session is secure.",
        workspaceAccess: "Workspace access",
        fullAccess: "Full access",
        teamManagement: "Team management",
        teamDescription:
          "Manage employees, invitations, roles and team access.",
        manageTeam: "Manage team",
        inviteEmployee: "Invite employee",
        invitations: "Invitations & QR",
      }
    : {
        title: "الإعدادات",
        subtitle:
          "إدارة مساحة عمل BusinessOS والتفضيلات الخاصة بك.",
        workspace: "مساحة العمل",
        workspaceName: "BusinessOS PRO",
        workspaceDescription:
          "مساحة عمل احترافية لإدارة الأعمال",
        plan: "الخطة الحالية",
        planValue: "PRO",
        account: "الحساب",
        accountDescription: "معلومات حسابك",
        email: "البريد الإلكتروني",
        role: "الدور",
        ownerRole: "مالك الشركة",
        memberRole: "عضو في مساحة العمل",
        preferences: "التفضيلات",
        preferencesDescription:
          "خصص طريقة عمل BusinessOS بما يناسبك.",
        language: "اللغة",
        languageDescription:
          "اختر لغة واجهة النظام المفضلة.",
        arabic: "العربية",
        english: "English",
        ai: "المساعد الذكي",
        aiDescription:
          "تفعيل المساعدة الذكية المدعومة بالذكاء الاصطناعي.",
        notifications: "الإشعارات",
        notificationsDescription:
          "تحكم في إشعارات النظام ونشاط مساحة العمل.",
        taskNotifications: "إشعارات المهام",
        taskNotificationsDescription:
          "استقبال إشعارات عند تحديث المهام.",
        conversationNotifications: "إشعارات المحادثات",
        conversationNotificationsDescription:
          "استقبال إشعارات حول محادثات العملاء.",
        security: "الأمان",
        securityDescription:
          "إدارة جلسة حسابك.",
        signOut: "تسجيل الخروج",
        save: "حفظ التفضيلات",
        saved: "تم الحفظ",
        secure: "جلستك الحالية آمنة.",
        workspaceAccess: "صلاحية مساحة العمل",
        fullAccess: "صلاحية كاملة",
        teamManagement: "إدارة الفريق",
        teamDescription:
          "إدارة الموظفين والدعوات والأدوار وصلاحيات الوصول.",
        manageTeam: "إدارة الفريق",
        inviteEmployee: "دعوة موظف",
        invitations: "الدعوات وQR",
      };

  useEffect(() => {
    async function loadSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (user.email) {
        setEmail(user.email);
      }

      const { data: membership } = await supabase
        .from("company_members")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      setIsOwner(membership?.role === "owner");

      const storedAi = localStorage.getItem(
        "businessos-ai-enabled"
      );

      const storedNotifications = localStorage.getItem(
        "businessos-notifications-enabled"
      );

      const storedTasks = localStorage.getItem(
        "businessos-task-notifications"
      );

      const storedConversations = localStorage.getItem(
        "businessos-conversation-notifications"
      );

      if (storedAi !== null) {
        setAiEnabled(storedAi === "true");
      }

      if (storedNotifications !== null) {
        setNotificationsEnabled(
          storedNotifications === "true"
        );
      }

      if (storedTasks !== null) {
        setTaskNotifications(storedTasks === "true");
      }

      if (storedConversations !== null) {
        setConversationNotifications(
          storedConversations === "true"
        );
      }
    }

    loadSettings();
  }, []);

  function savePreferences() {
    localStorage.setItem(
      "businessos-ai-enabled",
      String(aiEnabled)
    );

    localStorage.setItem(
      "businessos-notifications-enabled",
      String(notificationsEnabled)
    );

    localStorage.setItem(
      "businessos-task-notifications",
      String(taskNotifications)
    );

    localStorage.setItem(
      "businessos-conversation-notifications",
      String(conversationNotifications)
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = `/${locale}/login`;
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-[calc(100vh-24px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto min-h-[calc(100vh-24px)] max-w-[1500px] overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.06)]">
        <section className="min-w-0 bg-[#f8f8f8]">
          <header className="border-b border-neutral-100 bg-white px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                <SettingsIcon
                  className="h-5 w-5"
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {text.title}
                </h1>

                <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
                  {text.subtitle}
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                  <Building2
                    className="h-5 w-5 text-neutral-700"
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-bold">
                    {text.workspace}
                  </h2>

                  <p className="mt-1 text-[11px] text-neutral-400">
                    {text.workspaceDescription}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-neutral-100 bg-[#fafafa] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-neutral-400">
                        {text.workspace}
                      </div>

                      <div className="mt-1 text-sm font-bold">
                        {text.workspaceName}
                      </div>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                      <Building2
                        className="h-4 w-4"
                        strokeWidth={1.8}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-100 bg-[#fafafa] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-neutral-400">
                        {text.plan}
                      </div>

                      <div className="mt-1 text-sm font-bold">
                        {text.planValue}
                      </div>
                    </div>

                    <span className="rounded-full bg-black px-3 py-1 text-[9px] font-bold text-white">
                      PRO
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {isOwner && (
              <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                    <Users
                      className="h-5 w-5"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold">
                      {text.teamManagement}
                    </h2>

                    <p className="mt-1 text-[11px] text-neutral-400">
                      {text.teamDescription}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Link
                    href={`/${locale}/team`}
                    className="group rounded-2xl border border-neutral-100 bg-[#fafafa] p-4 transition hover:border-black hover:bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                        <Users className="h-4 w-4" />
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 text-neutral-300 transition group-hover:text-black ${
                          !isEnglish ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    <div className="mt-4 text-sm font-bold">
                      {text.manageTeam}
                    </div>

                    <div className="mt-1 text-[10px] text-neutral-400">
                      {text.teamDescription}
                    </div>
                  </Link>

                  <Link
                    href={`/${locale}/team`}
                    className="group rounded-2xl border border-neutral-100 bg-[#fafafa] p-4 transition hover:border-black hover:bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
                        <Mail className="h-4 w-4" />
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 text-neutral-300 transition group-hover:text-black ${
                          !isEnglish ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    <div className="mt-4 text-sm font-bold">
                      {text.inviteEmployee}
                    </div>

                    <div className="mt-1 text-[10px] text-neutral-400">
                      {text.inviteEmployee}
                    </div>
                  </Link>

                  <Link
                    href={`/${locale}/team`}
                    className="group rounded-2xl border border-neutral-100 bg-[#fafafa] p-4 transition hover:border-black hover:bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
                        <QrCode className="h-4 w-4" />
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 text-neutral-300 transition group-hover:text-black ${
                          !isEnglish ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    <div className="mt-4 text-sm font-bold">
                      {text.invitations}
                    </div>

                    <div className="mt-1 text-[10px] text-neutral-400">
                      {text.invitations}
                    </div>
                  </Link>
                </div>
              </section>
            )}

            <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                  <User
                    className="h-5 w-5 text-neutral-700"
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-bold">
                    {text.account}
                  </h2>

                  <p className="mt-1 text-[11px] text-neutral-400">
                    {text.accountDescription}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-neutral-100 bg-[#fafafa] p-4">
                  <div className="text-[10px] text-neutral-400">
                    {text.email}
                  </div>

                  <div className="mt-2 break-all text-sm font-semibold">
                    {email || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-100 bg-[#fafafa] p-4">
                  <div className="text-[10px] text-neutral-400">
                    {text.role}
                  </div>

                  <div className="mt-2 text-sm font-semibold">
                    {isOwner
                      ? text.ownerRole
                      : text.memberRole}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                  <Globe2
                    className="h-5 w-5 text-neutral-700"
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-bold">
                    {text.preferences}
                  </h2>

                  <p className="mt-1 text-[11px] text-neutral-400">
                    {text.preferencesDescription}
                  </p>
                </div>
              </div>

              <div className="border-b border-neutral-100 pb-5">
                <div className="mb-3">
                  <div className="text-sm font-semibold">
                    {text.language}
                  </div>

                  <div className="mt-1 text-[11px] text-neutral-400">
                    {text.languageDescription}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                  <Link
                    href="/ar/settings"
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${
                      !isEnglish
                        ? "border-black bg-black text-white"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-black"
                    }`}
                  >
                    {!isEnglish && (
                      <Check className="h-3.5 w-3.5" />
                    )}

                    {text.arabic}
                  </Link>

                  <Link
                    href="/en/settings"
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${
                      isEnglish
                        ? "border-black bg-black text-white"
                        : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-black"
                    }`}
                  >
                    {isEnglish && (
                      <Check className="h-3.5 w-3.5" />
                    )}

                    {text.english}
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <Sparkles
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {text.ai}
                    </div>

                    <div className="mt-1 text-[11px] leading-5 text-neutral-400">
                      {text.aiDescription}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    aiEnabled ? "bg-black" : "bg-neutral-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                      aiEnabled
                        ? isEnglish
                          ? "right-1"
                          : "left-1"
                        : isEnglish
                        ? "left-1"
                        : "right-1"
                    }`}
                  />
                </button>
              </div>

              <div className="border-b border-neutral-100 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                      <Bell
                        className="h-4 w-4"
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {text.notifications}
                      </div>

                      <div className="mt-1 text-[11px] leading-5 text-neutral-400">
                        {text.notificationsDescription}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationsEnabled(
                        !notificationsEnabled
                      )
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      notificationsEnabled
                        ? "bg-black"
                        : "bg-neutral-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                        notificationsEnabled
                          ? isEnglish
                            ? "right-1"
                            : "left-1"
                          : isEnglish
                          ? "left-1"
                          : "right-1"
                      }`}
                    />
                  </button>
                </div>

                <div
                  className={`mt-5 space-y-2 ${
                    !notificationsEnabled
                      ? "pointer-events-none opacity-40"
                      : ""
                  }`}
                >
                  <ToggleRow
                    label={text.taskNotifications}
                    description={
                      text.taskNotificationsDescription
                    }
                    checked={taskNotifications}
                    onChange={() =>
                      setTaskNotifications(!taskNotifications)
                    }
                  />

                  <ToggleRow
                    label={text.conversationNotifications}
                    description={
                      text.conversationNotificationsDescription
                    }
                    checked={conversationNotifications}
                    onChange={() =>
                      setConversationNotifications(
                        !conversationNotifications
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] text-neutral-400">
                  {saved ? text.saved : ""}
                </div>

                <button
                  type="button"
                  onClick={savePreferences}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  {saved ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <SettingsIcon className="h-4 w-4" />
                  )}

                  {saved ? text.saved : text.save}
                </button>
              </div>
            </section>

            <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <ShieldCheck
                      className="h-5 w-5 text-neutral-700"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold">
                      {text.security}
                    </h2>

                    <p className="mt-1 text-[11px] text-neutral-400">
                      {text.securityDescription}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {text.secure}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  {text.signOut}
                </button>
              </div>
            </section>

            <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                    <User
                      className="h-5 w-5"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <div className="text-sm font-bold">
                      {text.workspaceAccess}
                    </div>

                    <div className="mt-1 text-[10px] text-neutral-400">
                      {text.fullAccess}
                    </div>
                  </div>
                </div>

                <ChevronRight
                  className={`h-4 w-4 text-neutral-300 ${
                    !isEnglish ? "rotate-180" : ""
                  }`}
                />
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#fafafa] px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold">
          {label}
        </div>

        <div className="mt-1 text-[10px] leading-5 text-neutral-400">
          {description}
        </div>
      </div>

      <button
        type="button"
        onClick={onChange}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-black" : "bg-neutral-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            checked ? "right-0.5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
