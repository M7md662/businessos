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
  MessageCircle,
  Plug,
  Bot,
  UserRound,
  Zap,
  GitMerge,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ReplyMode = "manual" | "ai_suggest" | "ai_auto" | "hybrid";

export default function SettingsPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [email, setEmail] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [companyId, setCompanyId] = useState("");

    const [whatsappStatus, setWhatsappStatus] =
      useState<"connected" | "disconnected" | "error">("disconnected");

    const [whatsappPhone, setWhatsappPhone] = useState("");

  const [replyMode, setReplyMode] =
    useState<ReplyMode>("manual");
  const [savingReplyMode, setSavingReplyMode] =
    useState(false);
  const [replyModeSaved, setReplyModeSaved] =
    useState(false);

  const [aiEnabled, setAiEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);
  const [taskNotifications, setTaskNotifications] =
    useState(true);
  const [conversationNotifications, setConversationNotifications] =
    useState(true);
  const [saved, setSaved] = useState(false);

  const text = isEnglish
    ? {
        title: "Settings",
        subtitle:
          "Manage your BusinessOS workspace and preferences.",
        workspace: "Workspace",
        workspaceName: "BusinessOS PRO",
        workspaceDescription:
          "Professional business workspace",
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
        conversationNotifications:
          "Conversation notifications",
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
        employeeAccess: "Employee access",
        teamManagement: "Team management",
        teamDescription:
          "Manage employees, invitations, roles and team access.",
        manageTeam: "Manage team",
        inviteEmployee: "Invite employee",
        invitations: "Invitations & QR",

        integrations: "Integrations",
        integrationsDescription:
          "Connect your company's communication channels to BusinessOS.",
        connected: "Connected",
        notConnected: "Not connected",
        configure: "Configure",
        whatsapp: "WhatsApp Business",
        whatsappDescription:
          "Connect your company's WhatsApp Business account and receive customer conversations inside BusinessOS.",
        whatsappNote:
          "Each company connects its own WhatsApp Business account.",
        emailIntegration: "Business Email",
        emailDescription:
          "Connect your company's email channel and manage customer emails inside BusinessOS.",
        emailNote:
          "Email integration will use your company's own mailbox.",
        integrationsOwnerOnly:
          "Only the Company Owner can manage integrations.",

        replyMode: "Employee Reply Mode",
        replyModeDescription:
          "Choose how BusinessOS handles customer replies for your company.",
        manual: "Manual",
        manualDescription:
          "Employees reply to customers themselves.",
        aiSuggest: "AI Suggest",
        aiSuggestDescription:
          "AI prepares a reply and the employee reviews and sends it.",
        aiAuto: "AI Auto",
        aiAutoDescription:
          "AI automatically handles customer replies.",
        hybrid: "Hybrid",
        hybridDescription:
          "AI handles normal cases and sends important cases to employees.",
        saveReplyMode: "Save reply mode",
        replyModeSaved: "Reply mode saved",
        ownerOnlyReplyMode:
          "Only the Company Owner can change the employee reply mode.",
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
        conversationNotifications:
          "إشعارات المحادثات",
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

        integrations: "التكاملات",
        integrationsDescription:
          "اربط قنوات التواصل الخاصة بشركتك مع BusinessOS.",
        connected: "متصل",
        notConnected: "غير متصل",
        configure: "إعداد",
        whatsapp: "WhatsApp Business",
        whatsappDescription:
          "اربط حساب WhatsApp Business الخاص بشركتك واستقبل محادثات العملاء داخل BusinessOS.",
        whatsappNote:
          "كل شركة تربط حساب WhatsApp Business الخاص بها.",
        emailIntegration: "بريد الشركة",
        emailDescription:
          "اربط بريد شركتك لإدارة رسائل العملاء من داخل BusinessOS.",
        emailNote:
          "تكامل البريد سيستخدم صندوق البريد الخاص بشركتك.",
        integrationsOwnerOnly:
          "فقط مالك الشركة يستطيع إدارة التكاملات.",

        replyMode: "وضع رد الموظفين",
        replyModeDescription:
          "اختر الطريقة التي يتعامل بها BusinessOS مع ردود العملاء في شركتك.",
        manual: "يدوي",
        manualDescription:
          "الموظفون يردون على العملاء بأنفسهم.",
        aiSuggest: "اقتراح الذكاء الاصطناعي",
        aiSuggestDescription:
          "الذكاء الاصطناعي يجهز الرد والموظف يراجعه ثم يرسله.",
        aiAuto: "الرد التلقائي بالذكاء الاصطناعي",
        aiAutoDescription:
          "الذكاء الاصطناعي يتعامل تلقائيًا مع ردود العملاء.",
        hybrid: "هجين",
        hybridDescription:
          "الذكاء الاصطناعي يتعامل مع الحالات العادية ويحوّل الحالات المهمة للموظفين.",
        saveReplyMode: "حفظ وضع الرد",
        replyModeSaved: "تم حفظ وضع الرد",
        ownerOnlyReplyMode:
          "فقط مالك الشركة يستطيع تغيير وضع رد الموظفين.",
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

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id, role, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

      if (membershipError) {
        console.error(
          "Failed to load company membership:",
          membershipError
        );
        return;
      }

      const membership = memberships?.[0];

      setIsOwner(membership?.role === "owner");

      if (membership?.company_id) {
        setCompanyId(membership.company_id);

          const { data: whatsappConnection, error: whatsappError } =
            await supabase
              .from("whatsapp_connections")
              .select("status, display_phone_number")
              .eq("company_id", membership.company_id)
              .maybeSingle();

          if (whatsappError) {
            console.error(
              "Failed to load WhatsApp connection:",
              whatsappError
            );
          } else if (whatsappConnection) {
            setWhatsappStatus(
              whatsappConnection.status || "disconnected"
            );
            setWhatsappPhone(
              whatsappConnection.display_phone_number || ""
            );
          }

        const { data: company } = await supabase
          .from("companies")
          .select("reply_mode")
          .eq("id", membership.company_id)
          .maybeSingle();

        if (
          company?.reply_mode === "manual" ||
          company?.reply_mode === "ai_suggest" ||
          company?.reply_mode === "ai_auto" ||
          company?.reply_mode === "hybrid"
        ) {
          setReplyMode(company.reply_mode);
        }
      }

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

  async function saveReplyMode() {
    if (!companyId || !isOwner) return;

    setSavingReplyMode(true);
    setReplyModeSaved(false);

    const { error } = await supabase
      .from("companies")
      .update({
        reply_mode: replyMode,
      })
      .eq("id", companyId);

    setSavingReplyMode(false);

    if (error) {
      console.error("Failed to save reply mode:", error);
      return;
    }

    setReplyModeSaved(true);

    window.setTimeout(() => {
      setReplyModeSaved(false);
    }, 2500);
  }

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
              <>
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

                {/* Employee Reply Mode */}
                <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                      <Bot
                        className="h-5 w-5"
                        strokeWidth={1.8}
                      />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold">
                        {text.replyMode}
                      </h2>

                      <p className="mt-1 text-[11px] leading-5 text-neutral-400">
                        {text.replyModeDescription}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReplyModeCard
                      icon={
                        <UserRound className="h-4 w-4" />
                      }
                      title={text.manual}
                      description={text.manualDescription}
                      selected={replyMode === "manual"}
                      onClick={() =>
                        setReplyMode("manual")
                      }
                    />

                    <ReplyModeCard
                      icon={<Sparkles className="h-4 w-4" />}
                      title={text.aiSuggest}
                      description={text.aiSuggestDescription}
                      selected={
                        replyMode === "ai_suggest"
                      }
                      onClick={() =>
                        setReplyMode("ai_suggest")
                      }
                    />

                    <ReplyModeCard
                      icon={<Zap className="h-4 w-4" />}
                      title={text.aiAuto}
                      description={text.aiAutoDescription}
                      selected={replyMode === "ai_auto"}
                      onClick={() =>
                        setReplyMode("ai_auto")
                      }
                    />

                    <ReplyModeCard
                      icon={<GitMerge className="h-4 w-4" />}
                      title={text.hybrid}
                      description={text.hybridDescription}
                      selected={replyMode === "hybrid"}
                      onClick={() =>
                        setReplyMode("hybrid")
                      }
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[10px] text-neutral-400">
                      {replyModeSaved
                        ? text.replyModeSaved
                        : text.ownerOnlyReplyMode}
                    </div>

                    <button
                      type="button"
                      onClick={saveReplyMode}
                      disabled={savingReplyMode}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {replyModeSaved ? (
                        <Check className="h-4 w-4" />
                      ) : savingReplyMode ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      {replyModeSaved
                        ? text.replyModeSaved
                        : text.saveReplyMode}
                    </button>
                  </div>
                </section>

                {/* Integrations */}
                <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                      <Plug
                        className="h-5 w-5"
                        strokeWidth={1.8}
                      />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold">
                        {text.integrations}
                      </h2>

                      <p className="mt-1 text-[11px] text-neutral-400">
                        {text.integrationsDescription}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <IntegrationCard
                        icon={
                          <MessageCircle
                            className="h-5 w-5"
                            strokeWidth={1.8}
                          />
                        }
                        title={text.whatsapp}
                        description={text.whatsappDescription}
                        note={
                          whatsappPhone
                            ? whatsappPhone
                            : text.whatsappNote
                        }
                        status={
                          whatsappStatus === "connected"
                            ? text.connected
                            : whatsappStatus === "error"
                              ? "Error"
                              : text.notConnected
                        }
                        buttonText={text.configure}
                        isEnglish={isEnglish}
                        disabled={!isOwner}
                        onConfigure={() => {
                          if (!isOwner) return;

                          alert(
                            isEnglish
                              ? "WhatsApp connection setup will be added here."
                              : "???? ????? ????? ????? WhatsApp ???."
                          );
                        }}
                      />

                    <IntegrationCard
                      icon={
                        <Mail
                          className="h-5 w-5"
                          strokeWidth={1.8}
                        />
                      }
                      title={text.emailIntegration}
                      description={text.emailDescription}
                      note={text.emailNote}
                      status={text.notConnected}
                      buttonText={text.configure}
                      isEnglish={isEnglish}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-neutral-100 bg-[#fafafa] px-4 py-3 text-[10px] text-neutral-400">
                    <Plug className="h-3.5 w-3.5 shrink-0" />
                    <span>{text.integrationsOwnerOnly}</span>
                  </div>
                </section>
              </>
            )}

            {!isOwner && (
              <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                    <Plug
                      className="h-5 w-5 text-neutral-700"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold">
                      {text.integrations}
                    </h2>

                    <p className="mt-1 text-[11px] text-neutral-400">
                      {text.integrationsOwnerOnly}
                    </p>
                  </div>
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
                    isEnglish={isEnglish}
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
                    isEnglish={isEnglish}
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
                      {isOwner ? text.fullAccess : text.employeeAccess}
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

function ReplyModeCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-right transition ${
        selected
          ? "border-black bg-black text-white"
          : "border-neutral-100 bg-[#fafafa] text-[#111] hover:border-neutral-300 hover:bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            selected
              ? "bg-white text-black"
              : "bg-neutral-100 text-black"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold">
              {title}
            </div>

            <div
              className={`h-4 w-4 rounded-full border-2 ${
                selected
                  ? "border-white bg-white"
                  : "border-neutral-300 bg-transparent"
              }`}
            >
              {selected && (
                <div className="m-[2px] h-2 w-2 rounded-full bg-black" />
              )}
            </div>
          </div>

          <div
            className={`mt-2 text-[10px] leading-5 ${
              selected
                ? "text-neutral-300"
                : "text-neutral-400"
            }`}
          >
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

function IntegrationCard({
    icon,
    title,
    description,
    note,
    status,
    buttonText,
    isEnglish,
    disabled = false,
    onConfigure,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    note: string;
    status: string;
    buttonText: string;
    isEnglish: boolean;
    disabled?: boolean;
    onConfigure?: () => void;
  }) {
  return (
    <div className="rounded-[20px] border border-neutral-100 bg-[#fafafa] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white">
            {icon}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold">
              {title}
            </h3>

            <div className="mt-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />

              <span className="text-[10px] font-medium text-neutral-400">
                {status}
              </span>
            </div>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[9px] font-semibold text-neutral-500">
          {buttonText}
        </span>
      </div>

      <p
        className={`mt-4 text-[11px] leading-6 text-neutral-500 ${
          isEnglish ? "text-left" : "text-right"
        }`}
      >
        {description}
      </p>

      <div className="mt-4 rounded-xl border border-neutral-100 bg-white px-3 py-2.5 text-[10px] leading-5 text-neutral-400">
        {note}
      </div>

      <button
        type="button"
        disabled
        className="mt-4 flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-black text-xs font-semibold text-white opacity-40"
      >
        <Plug className="h-3.5 w-3.5" />
        {buttonText}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  isEnglish,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  isEnglish: boolean;
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
            checked
              ? isEnglish
                ? "right-0.5"
                : "left-0.5"
              : isEnglish
              ? "left-0.5"
              : "right-0.5"
          }`}
        />
      </button>
    </div>
  );
}

