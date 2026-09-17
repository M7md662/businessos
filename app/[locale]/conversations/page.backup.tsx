"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  User,
  X,
  Package,
  ListTodo,
  Mail,
  CalendarDays,
  Menu,
  PanelRight,
  Zap,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";

const hasFeature = (_plan: string, _feature: string) => true;

type ConversationStatus = "جديدة" | "قيد المتابعة" | "مغلقة";

type ReplyMode =
  | "manual"
  | "ai_suggest"
  | "ai_auto"
  | "hybrid";

type Message = {
  id: string;
  sender: "customer" | "me";
  text: string;
  time: string;
};

type AdvancedAnalysis = {
  summary: string;
  intent: string;
  priority: "منخفضة" | "متوسطة" | "عالية";
  is_lead: boolean;
  recommended_action: string;
  reason: string;
  analyzed_at?: string | null;
};

type Conversation = {
  id: string;
  customerId: string | null;
  customer: string;
  lastMessage: string;
  status: ConversationStatus;
  unread: boolean;
  channel: string;
  messages: Message[];
  advancedAnalysis: AdvancedAnalysis | null;
};

type Customer = {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type Order = {
  id: string;
  company_id: string;
  customer_id: string | null;
  customer_name: string | null;
  total: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  service: string | null;
};

type Task = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  created_at: string;
  customer_id: string | null;
};

function normalizeMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((message, index) => {
      if (!message || typeof message !== "object") return null;

      const item = message as Record<string, unknown>;

      return {
        id:
          typeof item.id === "string"
            ? item.id
            : `${Date.now()}-${index}`,
        sender:
          item.sender === "customer" || item.sender === "me"
            ? item.sender
            : "customer",
        text: typeof item.text === "string" ? item.text : "",
        time: typeof item.time === "string" ? item.time : "",
      };
    })
    .filter(Boolean) as Message[];
}

function normalizeAdvancedAnalysis(
  row: Record<string, unknown>,
): AdvancedAnalysis | null {
  if (
    !row.ai_summary &&
    !row.ai_intent &&
    !row.ai_priority &&
    !row.ai_recommended_action
  ) {
    return null;
  }

  const priority =
    row.ai_priority === "عالية" ||
    row.ai_priority === "متوسطة" ||
    row.ai_priority === "منخفضة"
      ? row.ai_priority
      : "متوسطة";

  return {
    summary: typeof row.ai_summary === "string" ? row.ai_summary : "",
    intent: typeof row.ai_intent === "string" ? row.ai_intent : "",
    priority,
    is_lead: Boolean(row.ai_is_lead),
    recommended_action:
      typeof row.ai_recommended_action === "string"
        ? row.ai_recommended_action
        : "",
    reason: typeof row.ai_reason === "string" ? row.ai_reason : "",
    analyzed_at:
      typeof row.ai_analyzed_at === "string"
        ? row.ai_analyzed_at
        : null,
  };
}

function formatMoney(value: number | null) {
  if (value === null || Number.isNaN(Number(value))) return "—";

  return `${Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} EGP`;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status: string | null, locale: string) {
  if (locale === "en") {
    const map: Record<string, string> = {
      جديدة: "New",
      "قيد المتابعة": "In progress",
      مغلقة: "Closed",
      pending: "Pending",
      completed: "Completed",
      cancelled: "Cancelled",
      open: "Open",
      in_progress: "In progress",
      done: "Done",
    };

    return map[status || ""] || status || "—";
  }

  return status || "—";
}

function getChannelLabel(channel: string, locale: string) {
  if (locale === "en") {
    const map: Record<string, string> = {
      whatsapp: "WhatsApp",
      email: "Email",
      web: "Website",
      manual: "Manual",
      instagram: "Instagram",
      messenger: "Messenger",
    };

    return map[channel] || channel || "Conversation";
  }

  const map: Record<string, string> = {
    whatsapp: "واتساب",
    email: "البريد الإلكتروني",
    web: "الموقع",
    manual: "يدوي",
    instagram: "إنستغرام",
    messenger: "ماسنجر",
  };

  return map[channel] || channel || "محادثة";
}

function getReplyModeLabel(
  mode: ReplyMode,
  isEnglish: boolean,
) {
  const labels: Record<
    ReplyMode,
    { ar: string; en: string }
  > = {
    manual: {
      ar: "يدوي",
      en: "Manual",
    },
    ai_suggest: {
      ar: "اقتراح AI",
      en: "AI Suggest",
    },
    ai_auto: {
      ar: "تلقائي",
      en: "AI Auto",
    },
    hybrid: {
      ar: "هجين",
      en: "Hybrid",
    },
  };

  return isEnglish ? labels[mode].en : labels[mode].ar;
}

export default function ConversationsPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerTasks, setCustomerTasks] = useState<Task[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const [companyId, setCompanyId] = useState<string | null>(null);

  const [replyMode, setReplyMode] =
    useState<ReplyMode>("manual");

  const [advancedAiEnabled, setAdvancedAiEnabled] =
    useState(false);

  const [conversationsEnabled, setConversationsEnabled] =
    useState(true);

  const [conversationDrawerOpen, setConversationDrawerOpen] =
    useState(false);

  const [customerDrawerOpen, setCustomerDrawerOpen] =
    useState(false);

  const autoReplyingRef = useRef<Set<string>>(new Set());

  const selectedConversation = useMemo(
    () =>
      conversations.find((item) => item.id === selectedId) ||
      null,
    [conversations, selectedId],
  );

  const unreadCount = conversations.filter(
    (item) => item.unread,
  ).length;

  const activeCount = conversations.filter(
    (item) => item.status !== "مغلقة",
  ).length;

  async function loadConversations() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          isEnglish
            ? "You must be logged in."
            : "يجب تسجيل الدخول أولاً.",
        );
        return;
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership?.company_id) {
        setError(
          isEnglish
            ? "No company was found for this account."
            : "لم يتم العثور على شركة لهذا الحساب.",
        );
        return;
      }

      setCompanyId(membership.company_id);

      /* ======================================================
         LOAD COMPANY REPLY MODE
      ====================================================== */

      const { data: company, error: companyError } =
        await supabase
          .from("companies")
          .select("reply_mode")
          .eq("id", membership.company_id)
          .maybeSingle();

      if (companyError) {
        console.error(
          "Reply mode load error:",
          companyError,
        );
      }

      if (
        company?.reply_mode === "manual" ||
        company?.reply_mode === "ai_suggest" ||
        company?.reply_mode === "ai_auto" ||
        company?.reply_mode === "hybrid"
      ) {
        setReplyMode(company.reply_mode);
      } else {
        setReplyMode("manual");
      }

      let advancedEnabled = false;

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_id,status")
        .eq("company_id", membership.company_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (subscription?.plan_id) {
        const { data: plan } = await supabase
          .from("plans")
          .select("name")
          .eq("id", subscription.plan_id)
          .maybeSingle();

        if (plan?.name) {
          advancedEnabled = hasFeature(
            plan.name,
            "advanced_ai",
          );

          setConversationsEnabled(
            hasFeature(plan.name, "conversations"),
          );
        }
      }

      setAdvancedAiEnabled(advancedEnabled);

      const {
        data,
        error: conversationsError,
      } = await supabase
        .from("conversations")
        .select(
          "id, customer_id, customer_name, channel, status, last_message, messages, created_at, updated_at, last_message_at, ai_summary, ai_intent, ai_priority, ai_is_lead, ai_recommended_action, ai_reason, ai_analyzed_at",
        )
        .eq("company_id", membership.company_id)
        .order("updated_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      const normalized: Conversation[] = (
        data || []
      ).map((row: any) => ({
        id: row.id,
        customerId: row.customer_id,
        customer:
          row.customer_name ||
          (isEnglish ? "Customer" : "عميل"),
        lastMessage: row.last_message || "",
        status:
          row.status === "مغلقة"
            ? "مغلقة"
            : row.status === "قيد المتابعة"
              ? "قيد المتابعة"
              : "جديدة",
        unread: Boolean(
          Array.isArray(row.messages) &&
            row.messages.length > 0 &&
            row.messages[row.messages.length - 1]?.sender ===
              "customer",
        ),
        channel: row.channel || "manual",
        messages: normalizeMessages(row.messages),
        advancedAnalysis:
          normalizeAdvancedAnalysis(row),
      }));

      setConversations(normalized);

      if (normalized.length > 0) {
        setSelectedId(
          (current) => current || normalized[0].id,
        );
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      console.error(err);

      setError(
        isEnglish
          ? "An error occurred while loading conversations."
          : "حدث خطأ أثناء تحميل المحادثات.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerContext(
    customerId: string | null,
    currentCompanyId: string | null,
  ) {
    setCustomer(null);
    setCustomerOrders([]);
    setCustomerTasks([]);

    if (!customerId || !currentCompanyId) return;

    setLoadingContext(true);

    try {
      const [
        customerResult,
        ordersResult,
        tasksResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id,company_id,name,email,phone,notes,created_at",
          )
          .eq("id", customerId)
          .eq("company_id", currentCompanyId)
          .maybeSingle(),

        supabase
          .from("orders")
          .select(
            "id,company_id,customer_id,customer_name,total,status,notes,created_at,service",
          )
          .eq("customer_id", customerId)
          .eq("company_id", currentCompanyId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("tasks")
          .select(
            "id,company_id,title,description,status,priority,due_date,created_at,customer_id",
          )
          .eq("customer_id", customerId)
          .eq("company_id", currentCompanyId)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (customerResult.error) {
        console.error(
          "Customer context error:",
          customerResult.error,
        );
      }

      if (ordersResult.error) {
        console.error(
          "Orders context error:",
          ordersResult.error,
        );
      }

      if (tasksResult.error) {
        console.error(
          "Tasks context error:",
          tasksResult.error,
        );
      }

      setCustomer(
        (customerResult.data as Customer | null) ||
          null,
      );

      setCustomerOrders(
        (ordersResult.data as Order[]) || [],
      );

      setCustomerTasks(
        (tasksResult.data as Task[]) || [],
      );
    } catch (err) {
      console.error("Customer context:", err);
    } finally {
      setLoadingContext(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      setCustomer(null);
      setCustomerOrders([]);
      setCustomerTasks([]);
      return;
    }

    loadCustomerContext(
      selectedConversation.customerId,
      companyId,
    );
  }, [
    selectedConversation?.id,
    companyId,
  ]);

  async function sendMessage() {
    if (
      !selectedConversation ||
      !reply.trim() ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    const message: Message = {
      id: crypto.randomUUID(),
      sender: "me",
      text: reply.trim(),
      time: new Date().toLocaleTimeString(
        isEnglish ? "en-US" : "ar-EG",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      ),
    };

    const updatedMessages = [
      ...selectedConversation.messages,
      message,
    ];

    try {
      const { error: updateError } =
        await supabase
          .from("conversations")
          .update({
            messages: updatedMessages,
            last_message: message.text,
            last_message_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
            status: "قيد المتابعة",
            ai_summary: null,
            ai_intent: null,
            ai_priority: null,
            ai_is_lead: null,
            ai_recommended_action: null,
            ai_reason: null,
            ai_analyzed_at: null,
          })
          .eq("id", selectedConversation.id);

      if (updateError) throw updateError;

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                messages: updatedMessages,
                lastMessage: message.text,
                status: "قيد المتابعة",
                unread: false,
                advancedAnalysis: null,
              }
            : conversation,
        ),
      );

      setReply("");
    } catch (err) {
      console.error(err);

      setError(
        isEnglish
          ? "Could not send the message."
          : "تعذر إرسال الرسالة.",
      );
    } finally {
      setSending(false);
    }
  }

  async function generateAIReply(
    conversationOverride?: Conversation | null,
  ) {
    const target =
      conversationOverride || selectedConversation;

    if (!target || sending) return;

    const lastCustomerMessage = [
      ...target.messages,
    ]
      .reverse()
      .find(
        (message) =>
          message.sender === "customer",
      );

    if (!lastCustomerMessage) {
      if (!conversationOverride) {
        setError(
          isEnglish
            ? "There is no customer message to answer."
            : "لا توجد رسالة من العميل للرد عليها.",
        );
      }

      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastCustomerMessage.text,
          conversationId: target.id,
          customerId: target.customerId,
          companyId,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "AI request failed",
        );
      }

      const aiText =
        data?.reply ||
        data?.message ||
        data?.content ||
        "";

      if (!aiText) {
        throw new Error(
          "Empty AI response",
        );
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        sender: "me",
        text: aiText,
        time: new Date().toLocaleTimeString(
          isEnglish ? "en-US" : "ar-EG",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        ),
      };

      const updatedMessages = [
        ...target.messages,
        aiMessage,
      ];

      const { error: updateError } =
        await supabase
          .from("conversations")
          .update({
            messages: updatedMessages,
            last_message: aiText,
            last_message_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
            status: "قيد المتابعة",
          })
          .eq("id", target.id);

      if (updateError) throw updateError;

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === target.id
            ? {
                ...conversation,
                messages: updatedMessages,
                lastMessage: aiText,
                status: "قيد المتابعة",
                unread: false,
              }
            : conversation,
        ),
      );
    } catch (err) {
      console.error(
        "AI reply error:",
        err,
      );

      if (!conversationOverride) {
        setError(
          isEnglish
            ? "AI could not generate a reply."
            : "تعذر على الذكاء الاصطناعي إنشاء الرد.",
        );
      }
    } finally {
      setSending(false);
    }
  }

  /*
   * ============================================================
   * AUTOMATIC REPLY ENGINE
   * ============================================================
   *
   * Runs only when:
   *
   * manual     -> never
   * ai_suggest -> never automatically
   * ai_auto    -> automatically
   * hybrid     -> automatically for normal conversations
   *
   * We only trigger when the latest message belongs to the
   * customer and the latest saved message is not already ours.
   */

  useEffect(() => {
    if (
      loading ||
      !companyId ||
      !selectedConversation
    ) {
      return;
    }

    if (
      replyMode !== "ai_auto" &&
      replyMode !== "hybrid"
    ) {
      return;
    }

    const messages =
      selectedConversation.messages;

    if (messages.length === 0) return;

    const lastMessage =
      messages[messages.length - 1];

    if (
      lastMessage.sender !== "customer"
    ) {
      return;
    }

    if (
      autoReplyingRef.current.has(
        selectedConversation.id,
      )
    ) {
      return;
    }

    /*
     * Prevent duplicate automatic replies during
     * React re-renders.
     */
    autoReplyingRef.current.add(
      selectedConversation.id,
    );

    generateAIReply(
      selectedConversation,
    ).finally(() => {
      /*
       * Keep the conversation marked as handled.
       * A new customer message will cause a new
       * conversation state and can trigger again.
       */
    });
  }, [
    selectedConversation?.id,
    selectedConversation?.messages.length,
    replyMode,
    companyId,
    loading,
  ]);

  async function analyzeWithAdvancedAI() {
    if (
      !selectedConversation ||
      analyzing
    ) {
      return;
    }

    setAnalyzing(true);
    setError("");

    try {
      const response = await fetch(
        "/api/ai/advanced",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId:
              selectedConversation.id,
            customerId:
              selectedConversation.customerId,
            companyId,
            messages:
              selectedConversation.messages,
            customer,
            orders: customerOrders,
            tasks: customerTasks,
            locale,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Advanced AI failed",
        );
      }

      const analysis =
        data?.analysis || data;

      const normalized: AdvancedAnalysis =
        {
          summary:
            analysis?.summary || "",
          intent:
            analysis?.intent || "",
          priority:
            analysis?.priority ===
              "عالية" ||
            analysis?.priority ===
              "متوسطة" ||
            analysis?.priority ===
              "منخفضة"
              ? analysis.priority
              : "متوسطة",
          is_lead: Boolean(
            analysis?.is_lead,
          ),
          recommended_action:
            analysis?.recommended_action ||
            "",
          reason:
            analysis?.reason || "",
          analyzed_at:
            new Date().toISOString(),
        };

      const { error: updateError } =
        await supabase
          .from("conversations")
          .update({
            ai_summary:
              normalized.summary,
            ai_intent:
              normalized.intent,
            ai_priority:
              normalized.priority,
            ai_is_lead:
              normalized.is_lead,
            ai_recommended_action:
              normalized.recommended_action,
            ai_reason:
              normalized.reason,
            ai_analyzed_at:
              normalized.analyzed_at,
          })
          .eq(
            "id",
            selectedConversation.id,
          );

      if (updateError)
        throw updateError;

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id ===
          selectedConversation.id
            ? {
                ...conversation,
                advancedAnalysis:
                  normalized,
              }
            : conversation,
        ),
      );
    } catch (err) {
      console.error(err);

      setError(
        isEnglish
          ? "Advanced AI analysis failed."
          : "فشل تحليل الذكاء الاصطناعي المتقدم.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function createTaskFromAnalysis() {
    if (
      !selectedConversation ||
      !selectedConversation.advancedAnalysis ||
      !companyId ||
      creatingTask
    ) {
      return;
    }

    setCreatingTask(true);
    setError("");

    try {
      const analysis =
        selectedConversation.advancedAnalysis;

      const { error: insertError } =
        await supabase
          .from("tasks")
          .insert({
            company_id: companyId,
            customer_id:
              selectedConversation.customerId,
            title:
              analysis.recommended_action ||
              (isEnglish
                ? "Follow up with customer"
                : "متابعة العميل"),
            description:
              `${analysis.summary}\n\n${analysis.reason}`.trim(),
            status: "جديدة",
            priority:
              analysis.priority,
          });

      if (insertError)
        throw insertError;

      await loadCustomerContext(
        selectedConversation.customerId,
        companyId,
      );
    } catch (err) {
      console.error(err);

      setError(
        isEnglish
          ? "Could not create the task."
          : "تعذر إنشاء المهمة.",
      );
    } finally {
      setCreatingTask(false);
    }
  }

  async function changeStatus(
    status: ConversationStatus,
  ) {
    if (!selectedConversation) return;

    try {
      const { error: updateError } =
        await supabase
          .from("conversations")
          .update({
            status,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            selectedConversation.id,
          );

      if (updateError)
        throw updateError;

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id ===
          selectedConversation.id
            ? {
                ...conversation,
                status,
              }
            : conversation,
        ),
      );
    } catch (err) {
      console.error(err);

      setError(
        isEnglish
          ? "Could not update conversation status."
          : "تعذر تحديث حالة المحادثة.",
      );
    }
  }

  async function clearSavedAdvancedAnalysis() {
    if (!selectedConversation)
      return;

    try {
      const { error: updateError } =
        await supabase
          .from("conversations")
          .update({
            ai_summary: null,
            ai_intent: null,
            ai_priority: null,
            ai_is_lead: null,
            ai_recommended_action:
              null,
            ai_reason: null,
            ai_analyzed_at: null,
          })
          .eq(
            "id",
            selectedConversation.id,
          );

      if (updateError)
        throw updateError;

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id ===
          selectedConversation.id
            ? {
                ...conversation,
                advancedAnalysis: null,
              }
            : conversation,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  }

  function selectConversation(
    id: string,
  ) {
    setSelectedId(id);
    setConversationDrawerOpen(false);
    setCustomerDrawerOpen(false);
  }

  async function autoReplyConversation(conversation: Conversation) {
  if (!companyId) return;

  if (autoReplyingRef.current.has(conversation.id)) {
    return;
  }

  const lastMessage =
    conversation.messages[conversation.messages.length - 1];

  if (!lastMessage || lastMessage.sender !== "customer") {
    return;
  }

  autoReplyingRef.current.add(conversation.id);

  try {
    setError("");

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: lastMessage.text,
        conversationId: conversation.id,
        customerId: conversation.customerId,
        companyId,
        locale,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          "AI reply failed"
      );
    }

    const aiText =
      data?.reply ||
      data?.message ||
      data?.content ||
      "";

    if (!aiText.trim()) {
      throw new Error("AI returned an empty reply");
    }

    const aiMessage: Message = {
      id: crypto.randomUUID(),
      sender: "me",
      text: aiText,
      time: new Date().toISOString(),
    };

    const updatedMessages = [
      ...conversation.messages,
      aiMessage,
    ];

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        messages: updatedMessages,
        last_message: aiText,
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", conversation.id);

    if (updateError) {
      throw updateError;
    }

    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              messages: updatedMessages,
              lastMessage: aiText,
            }
          : item
      )
    );
  } catch (err) {
    console.error("Auto AI reply error:", err);

    setError(
      err instanceof Error
        ? err.message
        : "حدث خطأ أثناء الرد التلقائي بالذكاء الاصطناعي"
    );
  } finally {
    autoReplyingRef.current.delete(conversation.id);
  }
}


// AI Auto reply effect
useEffect(() => {
  console.log("[AI AUTO] effect started", {
    selectedId,
    companyId,
    replyMode,
  });

  if (!selectedId || !companyId) {
    console.log("[AI AUTO] missing selectedId/companyId");
    return;
  }

  if (replyMode !== "ai_auto") {
    console.log("[AI AUTO] mode is not ai_auto:", replyMode);
    return;
  }

  const selected = conversations.find(
    (conversation) => conversation.id === selectedId
  );

  if (!selected) return;

  const lastMessage =
    selected.messages[selected.messages.length - 1];

  if (!lastMessage || lastMessage.sender !== "customer") {
    console.log("[AI AUTO] last message is not customer", lastMessage);
    return;
  }

  console.log("[AI AUTO] customer message detected:", lastMessage.text);

  if (autoReplyingRef.current.has(selected.id)) {
    return;
  }

  autoReplyConversation(selected);
}, [selectedId, companyId, replyMode, conversations]);

if (loading) {
    

return (
      <main className="min-h-screen bg-white p-6 text-black">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            {isEnglish
              ? "Loading conversations..."
              : "جاري تحميل المحادثات..."}
          </div>
        </div>
      </main>
    );
  }

  if (!conversationsEnabled) {
    return (
      <main className="min-h-screen bg-white p-6 text-black">
        <div className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 p-10 text-center">
          <MessageCircle className="mx-auto mb-4 h-10 w-10" />

          <h1 className="text-2xl font-semibold">
            {isEnglish
              ? "Conversations"
              : "المحادثات"}
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            {isEnglish
              ? "Conversations are not included in your current plan."
              : "المحادثات غير متاحة في خطتك الحالية."}
          </p>
        </div>
      </main>
    );
  }



  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col p-4 md:p-6">

        {/* HEADER */}

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setConversationDrawerOpen(true)
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white transition hover:bg-neutral-50"
              title={
                isEnglish
                  ? "Open conversations"
                  : "فتح المحادثات"
              }
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200">
              <MessageCircle className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
                {isEnglish
                  ? "Conversations"
                  : "المحادثات"}
              </h1>

              <p className="hidden text-sm text-neutral-500 md:block">
                {isEnglish
                  ? "Customer communication workspace"
                  : "مساحة العمل الخاصة بمحادثات العملاء"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={loadConversations}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 transition hover:bg-neutral-50"
              title={
                isEnglish
                  ? "Refresh"
                  : "تحديث"
              }
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {selectedConversation && (
              <button
                type="button"
                onClick={() =>
                  setCustomerDrawerOpen(true)
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3.5 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                <User className="h-4 w-4" />

                <span className="hidden sm:inline">
                  {isEnglish
                    ? "Customer data"
                    : "بيانات العميل"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* CONVERSATION */}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white">

          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <MessageCircle className="mx-auto mb-4 h-12 w-12 text-neutral-300" />

                <h2 className="font-semibold">
                  {isEnglish
                    ? "Select a conversation"
                    : "اختر محادثة"}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  {isEnglish
                    ? "Open the conversation list to get started."
                    : "افتح قائمة المحادثات للبدء."}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setConversationDrawerOpen(true)
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white"
                >
                  <Menu className="h-4 w-4" />

                  {isEnglish
                    ? "Open conversations"
                    : "فتح المحادثات"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* CONVERSATION HEADER */}

              <div className="border-b border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
                      <User className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">
                        {selectedConversation.customer}
                      </h2>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                        <span>
                          {getChannelLabel(
                            selectedConversation.channel,
                            locale,
                          )}
                        </span>

                        <span>•</span>

                        <span>
                          {
                            selectedConversation.messages
                              .length
                          }{" "}
                          {isEnglish
                            ? "messages"
                            : "رسالة"}
                        </span>

                        {selectedConversation.unread && (
                          <>
                            <span>•</span>

                            <span className="font-medium text-black">
                              {isEnglish
                                ? "Unread"
                                : "غير مقروءة"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomerDrawerOpen(true)
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium transition hover:bg-neutral-50"
                    >
                      <PanelRight className="h-4 w-4" />

                      <span className="hidden sm:inline">
                        {isEnglish
                          ? "Customer data"
                          : "بيانات العميل"}
                      </span>
                    </button>

                    <select
                      value={
                        selectedConversation.status
                      }
                      onChange={(event) =>
                        changeStatus(
                          event.target
                            .value as ConversationStatus,
                        )
                      }
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    >
                      <option value="جديدة">
                        {isEnglish
                          ? "New"
                          : "جديدة"}
                      </option>

                      <option value="قيد المتابعة">
                        {isEnglish
                          ? "In progress"
                          : "قيد المتابعة"}
                      </option>

                      <option value="مغلقة">
                        {isEnglish
                          ? "Closed"
                          : "مغلقة"}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AI TOOLBAR */}

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 p-3">

                <div className="flex flex-wrap items-center gap-2">

                  {/* CURRENT REPLY MODE */}

                  <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs">
                    {replyMode ===
                    "ai_auto" ? (
                      <Zap className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}

                    <span>
                      {isEnglish
                        ? "Mode:"
                        : "الوضع:"}
                    </span>

                    <span className="font-semibold">
                      {getReplyModeLabel(
                        replyMode,
                        isEnglish,
                      )}
                    </span>
                  </div>

                  {/* AI SUGGEST / MANUAL BUTTON */}

                  {replyMode !==
                    "ai_auto" && (
                    <button
                      type="button"
                      onClick={() =>
                        generateAIReply()
                      }
                      disabled={sending}
                      className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Bot className="h-4 w-4" />

                      {sending
                        ? isEnglish
                          ? "Generating..."
                          : "جاري الإنشاء..."
                        : isEnglish
                          ? "AI Reply"
                          : "رد بالذكاء الاصطناعي"}
                    </button>
                  )}

                  {replyMode ===
                    "ai_auto" && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white">
                      <Zap className="h-4 w-4" />

                      {isEnglish
                        ? "AI Auto Reply Active"
                        : "الرد التلقائي بالذكاء الاصطناعي مفعل"}
                    </div>
                  )}

                  {advancedAiEnabled && (
                    <button
                      type="button"
                      onClick={
                        analyzeWithAdvancedAI
                      }
                      disabled={analyzing}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />

                      {analyzing
                        ? isEnglish
                          ? "Analyzing..."
                          : "جاري التحليل..."
                        : isEnglish
                          ? "Advanced AI"
                          : "تحليل AI متقدم"}
                    </button>
                  )}
                </div>

                <div className="hidden text-xs text-neutral-400 md:block">
                  {isEnglish
                    ? `${activeCount} active • ${unreadCount} unread`
                    : `${activeCount} نشطة • ${unreadCount} غير مقروءة`}
                </div>
              </div>

              {/* MESSAGES */}

              <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 md:p-6">
                {selectedConversation.messages.length ===
                0 ? (
                  <div className="flex h-full min-h-[400px] items-center justify-center text-center">
                    <div>
                      <MessageCircle className="mx-auto mb-4 h-10 w-10 text-neutral-300" />

                      <p className="text-sm text-neutral-500">
                        {isEnglish
                          ? "No messages yet."
                          : "لا توجد رسائل حتى الآن."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                    {selectedConversation.messages.map(
                      (message) => {
                        const mine =
                          message.sender === "me";

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              mine
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[70%] ${
                                mine
                                  ? "bg-black text-white"
                                  : "border border-neutral-200 bg-neutral-50"
                              }`}
                            >
                              <p className="whitespace-pre-wrap text-sm leading-6">
                                {message.text}
                              </p>

                              {message.time && (
                                <div
                                  className={`mt-2 text-[10px] ${
                                    mine
                                      ? "text-white/50"
                                      : "text-neutral-400"
                                  }`}
                                >
                                  {message.time}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

              {/* REPLY COMPOSER */}

              <div className="border-t border-neutral-200 bg-white p-3 md:p-4">
                <div className="mx-auto max-w-5xl">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={reply}
                      onChange={(event) =>
                        setReply(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={
                        isEnglish
                          ? "Write a reply..."
                          : "اكتب ردًا..."
                      }
                      rows={2}
                      className="min-h-[52px] flex-1 resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                    />

                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={
                        !reply.trim() ||
                        sending
                      }
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-black text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="mt-2 text-[11px] text-neutral-400">
                    {isEnglish
                      ? "Enter to send • Shift + Enter for a new line"
                      : "Enter للإرسال • Shift + Enter لسطر جديد"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* OVERLAY */}

      {(conversationDrawerOpen ||
        customerDrawerOpen) && (
        <button
          type="button"
          aria-label="Close drawer"
          onClick={() => {
            setConversationDrawerOpen(
              false,
            );
            setCustomerDrawerOpen(
              false,
            );
          }}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        />
      )}

      {/* LEFT DRAWER */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(390px,92vw)] flex-col border-r border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ${
          conversationDrawerOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-4">
          <div>
            <h2 className="font-semibold">
              {isEnglish
                ? "Conversations"
                : "المحادثات"}
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              {activeCount}{" "}
              {isEnglish
                ? "active"
                : "نشطة"}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setConversationDrawerOpen(
                false,
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="text-xs text-neutral-500">
            {isEnglish
              ? "All conversations"
              : "كل المحادثات"}
          </span>

          <span className="rounded-full border border-neutral-200 bg-white px-2 py-1 text-[10px]">
            {conversations.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length ===
          0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              {isEnglish
                ? "No conversations yet."
                : "لا توجد محادثات حتى الآن."}
            </div>
          ) : (
            conversations.map(
              (conversation) => {
                const active =
                  conversation.id ===
                  selectedConversation?.id;

              



  return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() =>
                      selectConversation(
                        conversation.id,
                      )
                    }
                    className={`w-full border-b border-neutral-200 p-4 text-left transition ${
                      active
                        ? "bg-black text-white"
                        : "bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                          active
                            ? "border-white/20 bg-white/10"
                            : "border-neutral-200 bg-neutral-50"
                        }`}
                      >
                        <User className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {
                              conversation.customer
                            }
                          </span>

                          {conversation.unread && (
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                active
                                  ? "bg-white"
                                  : "bg-black"
                              }`}
                            />
                          )}
                        </div>

                        <div
                          className={`mt-1 text-[11px] ${
                            active
                              ? "text-white/60"
                              : "text-neutral-500"
                          }`}
                        >
                          {getChannelLabel(
                            conversation.channel,
                            locale,
                          )}
                        </div>

                        <p
                          className={`mt-2 line-clamp-2 text-xs leading-5 ${
                            active
                              ? "text-white/70"
                              : "text-neutral-500"
                          }`}
                        >
                          {conversation.lastMessage ||
                            (isEnglish
                              ? "No messages"
                              : "لا توجد رسائل")}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              },
            )
          )}
        </div>
      </aside>

      {/* RIGHT CUSTOMER DRAWER */}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(430px,94vw)] flex-col border-l border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ${
          customerDrawerOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
              <User className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                {isEnglish
                  ? "Customer data"
                  : "بيانات العميل"}
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                {customer?.name ||
                  selectedConversation?.customer ||
                  "—"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCustomerDrawerOpen(
                false,
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadingContext ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {isEnglish
                ? "Loading customer..."
                : "جاري تحميل بيانات العميل..."}
            </div>
          </div>
        ) : !customer ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <User className="mx-auto mb-3 h-10 w-10 text-neutral-300" />

              <p className="text-sm text-neutral-500">
                {selectedConversation?.customerId
                  ? isEnglish
                    ? "Customer record not found."
                    : "لم يتم العثور على سجل العميل."
                  : isEnglish
                    ? "No customer linked."
                    : "لا يوجد عميل مرتبط."}
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">

            {/* CUSTOMER PROFILE */}

            <div className="border-b border-neutral-200 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-white">
                  <User className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">
                    {customer.name}
                  </h3>

                  <p className="mt-1 text-xs text-neutral-500">
                    {isEnglish
                      ? "Customer"
                      : "عميل"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">

                {customer.email && (
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                    <Mail className="h-4 w-4 shrink-0 text-neutral-400" />

                    <div className="min-w-0">
                      <div className="text-[10px] text-neutral-400">
                        {isEnglish
                          ? "Email"
                          : "البريد الإلكتروني"}
                      </div>

                      <div className="mt-0.5 truncate text-sm">
                        {customer.email}
                      </div>
                    </div>
                  </div>
                )}

                {customer.phone && (
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                    <Phone className="h-4 w-4 shrink-0 text-neutral-400" />

                    <div className="min-w-0">
                      <div className="text-[10px] text-neutral-400">
                        {isEnglish
                          ? "Phone"
                          : "الهاتف"}
                      </div>

                      <div
                        dir="ltr"
                        className="mt-0.5 truncate text-sm"
                      >
                        {customer.phone}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-neutral-400" />

                  <div>
                    <div className="text-[10px] text-neutral-400">
                      {isEnglish
                        ? "Customer since"
                        : "تاريخ إنشاء العميل"}
                    </div>

                    <div className="mt-0.5 text-sm">
                      {formatDate(
                        customer.created_at,
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {customer.notes && (
                <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-2 text-xs font-semibold">
                    {isEnglish
                      ? "Notes"
                      : "ملاحظات"}
                  </div>

                  <p className="whitespace-pre-wrap text-xs leading-5 text-neutral-600">
                    {customer.notes}
                  </p>
                </div>
              )}
            </div>

            {/* ORDERS */}

            <div className="border-b border-neutral-200 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />

                  <h3 className="text-sm font-semibold">
                    {isEnglish
                      ? "Orders"
                      : "الطلبات"}
                  </h3>
                </div>

                <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs">
                  {customerOrders.length}
                </span>
              </div>

              {customerOrders.length ===
              0 ? (
                <p className="text-xs text-neutral-500">
                  {isEnglish
                    ? "No orders."
                    : "لا توجد طلبات."}
                </p>
              ) : (
                <div className="space-y-3">
                  {customerOrders.map(
                    (order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-neutral-200 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {order.service ||
                                (isEnglish
                                  ? "Order"
                                  : "طلب")}
                            </div>

                            <div className="mt-1 text-[10px] text-neutral-400">
                              {formatDate(
                                order.created_at,
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-xs font-semibold">
                            {formatMoney(
                              order.total,
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-neutral-200 px-2 py-1 text-[10px]">
                            {getStatusLabel(
                              order.status,
                              locale,
                            )}
                          </span>
                        </div>

                        {order.notes && (
                          <p className="mt-3 text-[11px] leading-5 text-neutral-500">
                            {order.notes}
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* TASKS */}

            <div className="border-b border-neutral-200 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />

                  <h3 className="text-sm font-semibold">
                    {isEnglish
                      ? "Tasks"
                      : "المهام"}
                  </h3>
                </div>

                <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs">
                  {customerTasks.length}
                </span>
              </div>

              {customerTasks.length ===
              0 ? (
                <p className="text-xs text-neutral-500">
                  {isEnglish
                    ? "No tasks."
                    : "لا توجد مهام."}
                </p>
              ) : (
                <div className="space-y-3">
                  {customerTasks.map(
                    (task) => (
                      <div
                        key={task.id}
                        className="rounded-xl border border-neutral-200 p-3"
                      >
                        <div className="flex items-start gap-3">
                          {task.status ===
                            "مكتملة" ||
                          task.status ===
                            "completed" ||
                          task.status ===
                            "done" ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          ) : (
                            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">
                              {task.title}
                            </div>

                            {task.description && (
                              <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                                {
                                  task.description
                                }
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {task.status && (
                                <span className="rounded-full border border-neutral-200 px-2 py-1 text-[10px]">
                                  {getStatusLabel(
                                    task.status,
                                    locale,
                                  )}
                                </span>
                              )}

                              {task.priority && (
                                <span className="rounded-full border border-neutral-200 px-2 py-1 text-[10px]">
                                  {
                                    task.priority
                                  }
                                </span>
                              )}

                              {task.due_date && (
                                <span className="rounded-full border border-neutral-200 px-2 py-1 text-[10px]">
                                  {formatDate(
                                    task.due_date,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* AI ANALYSIS */}

            {selectedConversation?.advancedAnalysis && (
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />

                    <h3 className="text-sm font-semibold">
                      {isEnglish
                        ? "AI Analysis"
                        : "تحليل AI"}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={
                      clearSavedAdvancedAnalysis
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:text-black"
                    title={
                      isEnglish
                        ? "Clear analysis"
                        : "مسح التحليل"
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-4">

                  {selectedConversation
                    .advancedAnalysis
                    .summary && (
                    <div className="rounded-xl border border-neutral-200 p-4">
                      <div className="mb-2 text-xs font-semibold">
                        {isEnglish
                          ? "Summary"
                          : "الملخص"}
                      </div>

                      <p className="text-xs leading-5 text-neutral-600">
                        {
                          selectedConversation
                            .advancedAnalysis
                            .summary
                        }
                      </p>
                    </div>
                  )}

                  {selectedConversation
                    .advancedAnalysis
                    .intent && (
                    <div className="rounded-xl border border-neutral-200 p-4">
                      <div className="mb-2 text-xs font-semibold">
                        {isEnglish
                          ? "Intent"
                          : "النية"}
                      </div>

                      <p className="text-xs leading-5 text-neutral-600">
                        {
                          selectedConversation
                            .advancedAnalysis
                            .intent
                        }
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-neutral-200 px-3 py-1.5 text-[10px]">
                      {isEnglish
                        ? "Priority: "
                        : "الأولوية: "}

                      {
                        selectedConversation
                          .advancedAnalysis
                          .priority
                      }
                    </span>

                    {selectedConversation
                      .advancedAnalysis
                      .is_lead && (
                      <span className="rounded-full bg-black px-3 py-1.5 text-[10px] text-white">
                        {isEnglish
                          ? "Lead"
                          : "عميل محتمل"}
                      </span>
                    )}
                  </div>

                  {selectedConversation
                    .advancedAnalysis
                    .recommended_action && (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="mb-2 text-xs font-semibold">
                        {isEnglish
                          ? "Recommended action"
                          : "الإجراء المقترح"}
                      </div>

                      <p className="text-xs leading-5 text-neutral-600">
                        {
                          selectedConversation
                            .advancedAnalysis
                            .recommended_action
                        }
                      </p>
                    </div>
                  )}

                  {selectedConversation
                    .advancedAnalysis
                    .reason && (
                    <div className="rounded-xl border border-neutral-200 p-4">
                      <div className="mb-2 text-xs font-semibold">
                        {isEnglish
                          ? "Reason"
                          : "السبب"}
                      </div>

                      <p className="text-xs leading-5 text-neutral-600">
                        {
                          selectedConversation
                            .advancedAnalysis
                            .reason
                        }
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      createTaskFromAnalysis
                    }
                    disabled={creatingTask}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />

                    {creatingTask
                      ? isEnglish
                        ? "Creating..."
                        : "جاري الإنشاء..."
                      : isEnglish
                        ? "Create task"
                        : "إنشاء مهمة"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </main>
  );
}