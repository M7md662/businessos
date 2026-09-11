"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import { hasFeature } from "@/lib/plan-permissions";

type ConversationStatus = "جديدة" | "قيد المتابعة" | "مغلقة";

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
  messages: Message[];
  advancedAnalysis: AdvancedAnalysis | null;
};

function isValidStatus(
  value: string
): value is ConversationStatus {
  return (
    value === "جديدة" ||
    value === "قيد المتابعة" ||
    value === "مغلقة"
  );
}

function normalizeMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const message = item as Record<string, unknown>;

      return {
        id: String(
          message.id || `${Date.now()}-${Math.random()}`
        ),
        sender:
          message.sender === "customer"
            ? "customer"
            : "me",
        text: String(message.text || ""),
        time: String(message.time || ""),
      };
    })
    .filter(
      (item): item is Message =>
        item !== null && item.text.length > 0
    );
}

function normalizeAdvancedAnalysis(
  conversation: Record<string, unknown>
): AdvancedAnalysis | null {
  const summary = String(
    conversation.ai_summary || ""
  ).trim();

  const intent = String(
    conversation.ai_intent || ""
  ).trim();

  const recommendedAction = String(
    conversation.ai_recommended_action || ""
  ).trim();

  const reason = String(
    conversation.ai_reason || ""
  ).trim();

  if (
    !summary ||
    !intent ||
    !recommendedAction ||
    !reason
  ) {
    return null;
  }

  const rawPriority = String(
    conversation.ai_priority || "متوسطة"
  );

  const priority: AdvancedAnalysis["priority"] =
    rawPriority === "منخفضة" ||
    rawPriority === "متوسطة" ||
    rawPriority === "عالية"
      ? rawPriority
      : "متوسطة";

  return {
    summary,
    intent,
    priority,
    is_lead: conversation.ai_is_lead === true,
    recommended_action: recommendedAction,
    reason,
    analyzed_at: conversation.ai_analyzed_at
      ? String(conversation.ai_analyzed_at)
      : null,
  };
}

export default function ConversationsPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdvancedAnalyzing, setIsAdvancedAnalyzing] =
    useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [planName, setPlanName] = useState("");
  const [canUseAdvancedAI, setCanUseAdvancedAI] =
    useState(false);

  const text = isEnglish
    ? {
        conversations: "Conversations",
        subtitle:
          "Manage customer conversations and respond with AI.",
        aiInsights: "AI Insights",
        aiInsightsDescription:
          "Smart overview based on advanced conversation analysis.",
        analyzed: "Analyzed conversations",
        highPriority: "High priority",
        leads: "Potential leads",
        attention: "Needs attention",
        total: "Total conversations",
        unread: "Unread",
        active: "Active",
        chooseConversation: "Choose a conversation",
        noConversations: "No conversations",
        noConversationsDescription:
          "Conversations will appear here when added.",
        customerConversation: "Customer conversation",
        aiReply: "AI reply",
        generating: "Generating reply...",
        advancedAI: "Advanced AI",
        analyzing: "Analyzing...",
        statusNew: "New",
        statusActive: "Active",
        statusClosed: "Closed",
        enterprise: "Enterprise",
        analysis: "Advanced AI analysis",
        summary: "Summary",
        intent: "Customer intent",
        priority: "Priority",
        lead: "Potential lead",
        yes: "Yes",
        no: "No",
        recommendedAction: "Recommended action",
        reason: "Reason",
        createTask: "Create task from analysis",
        creatingTask: "Creating task...",
        taskCreated: "Task created",
        close: "Close",
        lastAnalysis: "Last analysis",
        businessOS: "BusinessOS",
        aiWriting:
          "BusinessOS AI is writing a reply...",
        aiAnalyzing:
          "Advanced AI is analyzing the conversation...",
        writeReply: "Write your reply...",
        send: "Send",
        manualOrAI:
          "You can send a manual reply or use AI.",
        noSelectedConversation:
          "No conversation selected.",
        accessTitle: "Conversations unavailable",
        accessDescription:
          "Conversations are available starting from the Basic plan.",
        currentPlan: "Current plan",
        upgrade:
          "Upgrade your subscription to access customer conversation management.",
        noSubscription: "No subscription",
        expired: "Expired",
        errorLoad:
          "An error occurred while loading conversations.",
        errorMessage:
          "An error occurred while sending the message.",
        errorStatus:
          "An error occurred while updating the conversation status.",
        noCustomer:
          "This conversation is not linked to a customer.",
        taskError: "Unable to create the task.",
        noCustomerMessages:
          "There are no customer messages.",
        advancedUnavailable:
          "Advanced AI is available on the Enterprise plan only.",
        noMessages:
          "There are no messages to analyze.",
        advancedIncomplete:
          "Advanced AI analysis is incomplete.",
        aiApiError: "An error occurred in the AI API.",
        noAIReply:
          "No reply was received from the AI.",
      }
    : {
        conversations: "المحادثات",
        subtitle:
          "إدارة محادثات العملاء والرد باستخدام الذكاء الاصطناعي.",
        aiInsights: "AI Insights",
        aiInsightsDescription:
          "ملخص ذكي لحالة المحادثات بناءً على التحليل المتقدم.",
        analyzed: "المحادثات المحللة",
        highPriority: "أولوية عالية",
        leads: "عملاء محتملون",
        attention: "تحتاج تدخلًا",
        total: "إجمالي المحادثات",
        unread: "غير مقروءة",
        active: "قيد المتابعة",
        chooseConversation: "اختر محادثة",
        noConversations: "لا توجد محادثات",
        noConversationsDescription:
          "ستظهر المحادثات هنا عند إضافتها.",
        customerConversation: "محادثة العميل",
        aiReply: "رد بالذكاء الاصطناعي",
        generating: "جاري إنشاء الرد...",
        advancedAI: "Advanced AI",
        analyzing: "جاري التحليل...",
        statusNew: "جديدة",
        statusActive: "قيد المتابعة",
        statusClosed: "مغلقة",
        enterprise: "Enterprise",
        analysis: "تحليل Advanced AI",
        summary: "الملخص",
        intent: "نية العميل",
        priority: "الأولوية",
        lead: "عميل محتمل",
        yes: "نعم",
        no: "لا",
        recommendedAction: "الإجراء المقترح",
        reason: "سبب التقييم",
        createTask: "إنشاء مهمة من التحليل",
        creatingTask: "جاري إنشاء المهمة...",
        taskCreated: "تم إنشاء المهمة",
        close: "إغلاق",
        lastAnalysis: "آخر تحليل",
        businessOS: "BusinessOS",
        aiWriting:
          "BusinessOS AI يكتب الرد...",
        aiAnalyzing:
          "Advanced AI يحلل المحادثة...",
        writeReply: "اكتب ردك هنا...",
        send: "إرسال",
        manualOrAI:
          "يمكنك إرسال رد يدوي أو استخدام الذكاء الاصطناعي.",
        noSelectedConversation:
          "لا توجد محادثة محددة.",
        accessTitle: "المحادثات غير متاحة",
        accessDescription:
          "ميزة المحادثات متاحة بدايةً من خطة Basic.",
        currentPlan: "خطتك الحالية",
        upgrade:
          "يمكنك ترقية الاشتراك للوصول إلى إدارة محادثات العملاء.",
        noSubscription: "بدون اشتراك",
        expired: "منتهية",
        errorLoad:
          "حدث خطأ أثناء تحميل المحادثات من قاعدة البيانات.",
        errorMessage:
          "حدث خطأ أثناء إرسال الرسالة.",
        errorStatus:
          "حدث خطأ أثناء تحديث حالة المحادثة.",
        noCustomer:
          "لا يمكن إنشاء المهمة لأن المحادثة غير مرتبطة بعميل.",
        taskError: "تعذر إنشاء المهمة.",
        noCustomerMessages:
          "لا توجد رسالة من العميل.",
        advancedUnavailable:
          "Advanced AI متاح في خطة Enterprise فقط.",
        noMessages:
          "لا توجد رسائل لتحليل المحادثة.",
        advancedIncomplete:
          "تحليل Advanced AI غير مكتمل.",
        aiApiError: "حدث خطأ في API.",
        noAIReply:
          "لم يصل رد من الذكاء الاصطناعي.",
      };

  useEffect(() => {
    async function loadConversations() {
      setErrorMessage("");
      setAccessDenied(false);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("User not found");
        }

        const { data: membership, error: membershipError } =
          await supabase
            .from("company_members")
            .select("company_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        if (!membership) {
          throw new Error("Company not found");
        }

        const companyId = membership.company_id;

        const {
          data: subscription,
          error: subscriptionError,
        } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("company_id", companyId)
          .eq("status", "active")
          .maybeSingle();

        if (subscriptionError) {
          throw subscriptionError;
        }

        if (!subscription) {
          setAccessDenied(true);
          setPlanName(text.noSubscription);
          return;
        }

        if (
          subscription.end_date &&
          new Date(subscription.end_date).getTime() <=
            Date.now()
        ) {
          setAccessDenied(true);
          setPlanName(text.expired);
          return;
        }

        const { data: plan, error: planError } =
          await supabase
            .from("plans")
            .select("name")
            .eq("id", subscription.plan_id)
            .eq("is_active", true)
            .maybeSingle();

        if (planError) {
          throw planError;
        }

        if (!plan) {
          throw new Error("Plan not found");
        }

        setPlanName(plan.name);

        setCanUseAdvancedAI(
          hasFeature(plan.name, "advanced_ai")
        );

        if (!hasFeature(plan.name, "conversations")) {
          setAccessDenied(true);
          return;
        }

        const { data, error } = await supabase
          .from("conversations")
          .select(
            "id, customer_id, customer_name, channel, status, last_message, messages, created_at, updated_at, last_message_at, ai_summary, ai_intent, ai_priority, ai_is_lead, ai_recommended_action, ai_reason, ai_analyzed_at"
          )
          .eq("company_id", companyId)
          .order("updated_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        const mapped: Conversation[] = (data || []).map(
          (conversation) => ({
            id: String(conversation.id),
            customerId: conversation.customer_id
              ? String(conversation.customer_id)
              : null,
            customer:
              conversation.customer_name ||
              (isEnglish
                ? "Unnamed customer"
                : "عميل بدون اسم"),
            lastMessage:
              conversation.last_message || "",
            status: isValidStatus(conversation.status)
              ? conversation.status
              : "جديدة",
            unread: false,
            messages: normalizeMessages(
              conversation.messages
            ),
            advancedAnalysis:
              normalizeAdvancedAnalysis(
                conversation as Record<string, unknown>
              ),
          })
        );

        setConversations(mapped);

        if (mapped.length > 0) {
          setSelectedId(mapped[0].id);
        }
      } catch (error) {
        console.error(
          "Supabase conversations load error:",
          error
        );

        setErrorMessage(text.errorLoad);
      } finally {
        setIsLoaded(true);
      }
    }

    loadConversations();
  }, []);

  const analyzedConversations = conversations.filter(
    (conversation) => conversation.advancedAnalysis
  );

  const highPriorityConversations =
    conversations.filter(
      (conversation) =>
        conversation.advancedAnalysis?.priority === "عالية"
    );

  const leadConversations = conversations.filter(
    (conversation) =>
      conversation.advancedAnalysis?.is_lead === true
  );

  const conversationsNeedingAttention =
    conversations.filter(
      (conversation) =>
        conversation.advancedAnalysis?.priority ===
          "عالية" ||
        conversation.advancedAnalysis?.is_lead === true
    );

  const selectedConversation =
    conversations.find(
      (conversation) => conversation.id === selectedId
    ) ?? null;

  const unreadCount = conversations.filter(
    (conversation) => conversation.unread
  ).length;

  const activeCount = conversations.filter(
    (conversation) =>
      conversation.status === "قيد المتابعة"
  ).length;

  function selectConversation(id: string) {
    setSelectedId(id);
    setErrorMessage("");
    setTaskCreated(false);

    const conversation = conversations.find(
      (item) => item.id === id
    );

    if (!conversation || !conversation.unread) {
      return;
    }

    setConversations((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              unread: false,
            }
          : item
      )
    );
  }

  async function clearSavedAdvancedAnalysis(
    conversationId: string
  ) {
    const { error } = await supabase
      .from("conversations")
      .update({
        ai_summary: null,
        ai_intent: null,
        ai_priority: null,
        ai_is_lead: null,
        ai_recommended_action: null,
        ai_reason: null,
        ai_analyzed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (error) {
      console.error(
        "Clear Advanced AI analysis error:",
        error
      );
    }
  }

  async function createTaskFromAnalysis() {
    if (
      !selectedConversation?.advancedAnalysis ||
      creatingTask ||
      taskCreated
    ) {
      return;
    }

    setCreatingTask(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          isEnglish
            ? "You must sign in first."
            : "يجب تسجيل الدخول أولًا."
        );
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership?.company_id) {
        throw new Error(
          isEnglish
            ? "Unable to determine company."
            : "تعذر تحديد الشركة."
        );
      }

      const analysis =
        selectedConversation.advancedAnalysis;

      if (!selectedConversation.customerId) {
        throw new Error(text.noCustomer);
      }

      const description = [
        `${isEnglish ? "Conversation" : "المحادثة"}: ${selectedConversation.customer}`,
        "",
        `${isEnglish ? "Summary" : "الملخص"}: ${analysis.summary}`,
        "",
        `${isEnglish ? "Customer intent" : "نية العميل"}: ${analysis.intent}`,
        "",
        `${isEnglish ? "Recommended action" : "الإجراء المقترح"}: ${analysis.recommended_action}`,
        "",
        `${isEnglish ? "Reason" : "سبب التقييم"}: ${analysis.reason}`,
      ].join("\n");

      const { error: taskError } = await supabase
        .from("tasks")
        .insert({
          company_id: membership.company_id,
          customer_id: selectedConversation.customerId,
          title: `${
            isEnglish
              ? "Review conversation"
              : "مراجعة محادثة"
          } ${selectedConversation.customer}`,
          description,
          status: "جديدة",
          priority: analysis.priority,
        });

      if (taskError) {
        throw taskError;
      }

      setTaskCreated(true);
    } catch (error) {
      console.error(
        "Create task from AI analysis error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : text.taskError
      );
    } finally {
      setCreatingTask(false);
    }
  }

  async function sendMessage() {
    const messageText = message.trim();

    if (
      !messageText ||
      !selectedConversation ||
      isGenerating ||
      isAdvancedAnalyzing
    ) {
      return;
    }

    setErrorMessage("");
    setTaskCreated(false);

    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      sender: "me",
      text: messageText,
      time: new Date().toLocaleTimeString(
        isEnglish ? "en-US" : "ar-EG",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
    };

    const updatedMessages = [
      ...selectedConversation.messages,
      newMessage,
    ];

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("conversations")
        .update({
          last_message: messageText,
          last_message_at: now,
          status: "قيد المتابعة",
          messages: updatedMessages,
          ai_summary: null,
          ai_intent: null,
          ai_priority: null,
          ai_is_lead: null,
          ai_recommended_action: null,
          ai_reason: null,
          ai_analyzed_at: null,
          updated_at: now,
        })
        .eq("id", selectedConversation.id);

      if (error) {
        throw error;
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                lastMessage: messageText,
                status: "قيد المتابعة",
                unread: false,
                messages: updatedMessages,
                advancedAnalysis: null,
              }
            : conversation
        )
      );

      setMessage("");
    } catch (error) {
      console.error(
        "Supabase conversation message error:",
        error
      );

      setErrorMessage(text.errorMessage);
    }
  }

  async function generateAIReply() {
    if (
      !selectedConversation ||
      isGenerating ||
      isAdvancedAnalyzing
    ) {
      return;
    }

    const messages =
      selectedConversation.messages || [];

    const lastCustomerMessage = [...messages]
      .reverse()
      .find(
        (item) => item.sender === "customer"
      );

    if (!lastCustomerMessage) {
      alert(text.noCustomerMessages);
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setTaskCreated(false);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastCustomerMessage.text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || text.aiApiError
        );
      }

      const reply = String(
        data?.reply || ""
      ).trim();

      if (!reply) {
        throw new Error(text.noAIReply);
      }

      const aiMessage: Message = {
        id: `${Date.now()}-${Math.random()}`,
        sender: "me",
        text: reply,
        time: new Date().toLocaleTimeString(
          isEnglish ? "en-US" : "ar-EG",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
      };

      const updatedMessages = [
        ...selectedConversation.messages,
        aiMessage,
      ];

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("conversations")
        .update({
          last_message: reply,
          last_message_at: now,
          status: "قيد المتابعة",
          messages: updatedMessages,
          ai_summary: null,
          ai_intent: null,
          ai_priority: null,
          ai_is_lead: null,
          ai_recommended_action: null,
          ai_reason: null,
          ai_analyzed_at: null,
          updated_at: now,
        })
        .eq("id", selectedConversation.id);

      if (error) {
        throw error;
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                lastMessage: reply,
                status: "قيد المتابعة",
                unread: false,
                messages: updatedMessages,
                advancedAnalysis: null,
              }
            : conversation
        )
      );
    } catch (error) {
      console.error(
        "AI Conversation Error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : text.aiApiError
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function analyzeWithAdvancedAI() {
    if (
      !selectedConversation ||
      isGenerating ||
      isAdvancedAnalyzing
    ) {
      return;
    }

    if (!canUseAdvancedAI) {
      setErrorMessage(text.advancedUnavailable);
      return;
    }

    if (selectedConversation.messages.length === 0) {
      setErrorMessage(text.noMessages);
      return;
    }

    setIsAdvancedAnalyzing(true);
    setErrorMessage("");
    setTaskCreated(false);

    try {
      const response = await fetch(
        "/api/ai/advanced",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            messages: selectedConversation.messages,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "حدث خطأ أثناء تحليل المحادثة."
        );
      }

      const rawAnalysis = data?.analysis;

      if (
        !rawAnalysis ||
        typeof rawAnalysis !== "object"
      ) {
        throw new Error(
          "لم يصل تحليل من Advanced AI."
        );
      }

      const rawPriority = String(
        rawAnalysis.priority || "متوسطة"
      );

      const priority: AdvancedAnalysis["priority"] =
        rawPriority === "منخفضة" ||
        rawPriority === "متوسطة" ||
        rawPriority === "عالية"
          ? rawPriority
          : "متوسطة";

      const analysis: AdvancedAnalysis = {
        summary: String(
          rawAnalysis.summary || ""
        ).trim(),
        intent: String(
          rawAnalysis.intent || ""
        ).trim(),
        priority,
        is_lead: rawAnalysis.is_lead === true,
        recommended_action: String(
          rawAnalysis.recommended_action || ""
        ).trim(),
        reason: String(
          rawAnalysis.reason || ""
        ).trim(),
        analyzed_at: new Date().toISOString(),
      };

      if (
        !analysis.summary ||
        !analysis.intent ||
        !analysis.recommended_action ||
        !analysis.reason
      ) {
        throw new Error(
          text.advancedIncomplete
        );
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                advancedAnalysis: analysis,
              }
            : conversation
        )
      );
    } catch (error) {
      console.error(
        "Advanced AI Conversation Error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تشغيل Advanced AI."
      );
    } finally {
      setIsAdvancedAnalyzing(false);
    }
  }

  async function changeStatus(
    newStatus: ConversationStatus
  ) {
    if (!selectedConversation) {
      return;
    }

    setErrorMessage("");

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("conversations")
        .update({
          status: newStatus,
          updated_at: now,
        })
        .eq("id", selectedConversation.id);

      if (error) {
        throw error;
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                status: newStatus,
              }
            : conversation
        )
      );
    } catch (error) {
      console.error(
        "Supabase conversation status error:",
        error
      );

      setErrorMessage(text.errorStatus);
    }
  }

  if (!isLoaded) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-40px)] items-center justify-center rounded-[24px] bg-[#f8f8f8]"
      >
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
          {isEnglish
            ? "Loading conversations..."
            : "جاري تحميل المحادثات..."}
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="min-h-[calc(100vh-40px)] bg-[#f3f3f3] text-[#111]"
      >
        <div className="mx-auto flex min-h-[70vh] max-w-[1500px] items-center justify-center">
          <div className="w-full max-w-2xl rounded-[24px] bg-white p-8 text-center shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white">
              <MessageCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-6 text-2xl font-bold">
              {text.accessTitle}
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-500">
              {text.accessDescription}{" "}
              <span className="font-semibold text-black">
                {text.currentPlan}: {planName}
              </span>
              .
            </p>

            <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
              {text.upgrade}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-[calc(100vh-40px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-[24px] bg-white px-5 py-6 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                <MessageCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {text.businessOS}
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {text.conversations}
                </h1>

                <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                  {text.subtitle}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-5 space-y-5">
          {errorMessage && (
            <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600 shadow-[0_5px_25px_rgba(0,0,0,.03)]">
              {errorMessage}
            </div>
          )}

          <section className="rounded-[24px] bg-white p-5 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                <Sparkles className="h-4 w-4" />
              </div>

              <div>
                <h2 className="text-base font-bold">
                  {text.aiInsights}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  {text.aiInsightsDescription}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                title={text.analyzed}
                value={analyzedConversations.length}
                icon={
                  <Bot className="h-4 w-4" />
                }
              />

              <InsightCard
                title={text.highPriority}
                value={
                  highPriorityConversations.length
                }
                icon={
                  <AlertTriangle className="h-4 w-4" />
                }
                type="amber"
              />

              <InsightCard
                title={text.leads}
                value={leadConversations.length}
                icon={
                  <Users className="h-4 w-4" />
                }
                type="green"
              />

              <InsightCard
                title={text.attention}
                value={
                  conversationsNeedingAttention.length
                }
                icon={
                  <Clock3 className="h-4 w-4" />
                }
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title={text.total}
              value={conversations.length}
              icon={
                <MessageCircle className="h-4 w-4" />
              }
            />

            <StatCard
              title={text.unread}
              value={unreadCount}
              icon={
                <CircleDotIcon className="h-4 w-4" />
              }
            />

            <StatCard
              title={text.active}
              value={activeCount}
              icon={
                <Clock3 className="h-4 w-4" />
              }
              type="amber"
            />
          </section>

          <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.05)]">
            <div className="grid lg:grid-cols-[340px_1fr]">
              <aside
                className={`border-b border-neutral-100 lg:border-b-0 ${
                  isEnglish
                    ? "lg:border-r"
                    : "lg:border-l"
                }`}
              >
                <div className="border-b border-neutral-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold">
                        {text.conversations}
                      </h2>

                      <p className="mt-1 text-xs text-neutral-400">
                        {text.chooseConversation}
                      </p>
                    </div>

                    <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-neutral-100 px-2 text-xs font-semibold text-neutral-600">
                      {conversations.length}
                    </div>
                  </div>
                </div>

                <div className="max-h-[320px] overflow-y-auto lg:max-h-[700px]">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                        <MessageCircle className="h-5 w-5 text-neutral-400" />
                      </div>

                      <p className="mt-4 text-sm font-semibold text-neutral-600">
                        {text.noConversations}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-neutral-400">
                        {text.noConversationsDescription}
                      </p>
                    </div>
                  ) : (
                    conversations.map(
                      (conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() =>
                            selectConversation(
                              conversation.id
                            )
                          }
                          className={`w-full border-b border-neutral-100 p-4 text-start transition sm:p-5 ${
                            selectedId ===
                            conversation.id
                              ? "bg-neutral-100"
                              : "hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                selectedId ===
                                conversation.id
                                  ? "bg-black text-white"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              <User className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-sm font-semibold">
                                  {conversation.customer}
                                </p>

                                {conversation.unread && (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-black" />
                                )}
                              </div>

                              <p className="mt-1 truncate text-xs text-neutral-400">
                                {conversation.lastMessage ||
                                  (isEnglish
                                    ? "No messages"
                                    : "لا توجد رسائل")}
                              </p>

                              <div className="mt-3">
                                <StatusBadge
                                  status={
                                    conversation.status
                                  }
                                  text={text}
                                />
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    )
                  )}
                </div>
              </aside>

              <section className="flex min-h-[650px] min-w-0 flex-col">
                {selectedConversation ? (
                  <>
                    <div className="border-b border-neutral-100 p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                            <User className="h-4 w-4" />
                          </div>

                          <div>
                            <h2 className="font-bold">
                              {
                                selectedConversation.customer
                              }
                            </h2>

                            <p className="mt-1 text-xs text-neutral-400">
                              {text.customerConversation}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            onClick={generateAIReply}
                            disabled={
                              isGenerating ||
                              isAdvancedAnalyzing ||
                              creatingTask
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />

                            {isGenerating
                              ? text.generating
                              : text.aiReply}
                          </button>

                          {canUseAdvancedAI && (
                            <button
                              onClick={
                                analyzeWithAdvancedAI
                              }
                              disabled={
                                isGenerating ||
                                isAdvancedAnalyzing ||
                                creatingTask
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Bot className="h-3.5 w-3.5" />

                              {isAdvancedAnalyzing
                                ? text.analyzing
                                : text.advancedAI}
                            </button>
                          )}

                          <select
                            value={
                              selectedConversation.status
                            }
                            onChange={(event) =>
                              changeStatus(
                                event.target
                                  .value as ConversationStatus
                              )
                            }
                            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium outline-none focus:border-black"
                          >
                            <option value="جديدة">
                              {text.statusNew}
                            </option>

                            <option value="قيد المتابعة">
                              {text.statusActive}
                            </option>

                            <option value="مغلقة">
                              {text.statusClosed}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {selectedConversation.advancedAnalysis && (
                      <div className="border-b border-neutral-100 p-5">
                        <div className="rounded-[20px] bg-neutral-50 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                                <Sparkles className="h-4 w-4" />
                              </div>

                              <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                                  {text.enterprise}
                                </p>

                                <h3 className="mt-1 text-sm font-bold">
                                  {text.analysis}
                                </h3>
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                const conversationId =
                                  selectedConversation.id;

                                setConversations(
                                  (current) =>
                                    current.map(
                                      (conversation) =>
                                        conversation.id ===
                                        conversationId
                                          ? {
                                              ...conversation,
                                              advancedAnalysis:
                                                null,
                                            }
                                          : conversation
                                    )
                                );

                                setTaskCreated(false);

                                await clearSavedAdvancedAnalysis(
                                  conversationId
                                );
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-white hover:text-black"
                              aria-label={text.close}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <AnalysisItem
                              label={text.summary}
                              value={
                                selectedConversation
                                  .advancedAnalysis
                                  .summary
                              }
                            />

                            <AnalysisItem
                              label={text.intent}
                              value={
                                selectedConversation
                                  .advancedAnalysis
                                  .intent
                              }
                            />

                            <AnalysisItem
                              label={text.priority}
                              value={
                                selectedConversation
                                  .advancedAnalysis
                                  .priority
                              }
                            />

                            <AnalysisItem
                              label={text.lead}
                              value={
                                selectedConversation
                                  .advancedAnalysis
                                  .is_lead
                                  ? text.yes
                                  : text.no
                              }
                            />

                            <AnalysisItem
                              label={
                                text.recommendedAction
                              }
                              value={
                                selectedConversation
                                  .advancedAnalysis
                                  .recommended_action
                              }
                              fullWidth
                            />

                            <AnalysisItem
                              label={text.reason}
                              value={
                                selectedConversation
                                  .advancedAnalysis
                                  .reason
                              }
                              fullWidth
                            />

                            <div className="sm:col-span-2">
                              <button
                                type="button"
                                onClick={
                                  createTaskFromAnalysis
                                }
                                disabled={
                                  creatingTask ||
                                  taskCreated
                                }
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {taskCreated ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Clock3 className="h-4 w-4" />
                                )}

                                {creatingTask
                                  ? text.creatingTask
                                  : taskCreated
                                    ? text.taskCreated
                                    : text.createTask}
                              </button>
                            </div>
                          </div>

                          {selectedConversation
                            .advancedAnalysis
                            .analyzed_at && (
                            <p className="mt-4 text-[10px] text-neutral-400">
                              {text.lastAnalysis}:{" "}
                              {new Date(
                                selectedConversation
                                  .advancedAnalysis
                                  .analyzed_at
                              ).toLocaleString(
                                isEnglish
                                  ? "en-US"
                                  : "ar-EG"
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8f8f8] p-4 sm:p-6">
                      {selectedConversation.messages
                        .length === 0 ? (
                        <div className="flex h-full min-h-[350px] items-center justify-center">
                          <div className="text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-neutral-400 shadow-sm">
                              <MessageCircle className="h-5 w-5" />
                            </div>

                            <p className="mt-4 text-sm font-semibold text-neutral-600">
                              {isEnglish
                                ? "No messages yet"
                                : "لا توجد رسائل حتى الآن"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        selectedConversation.messages.map(
                          (item) => (
                            <div
                              key={item.id}
                              className={`flex ${
                                item.sender === "me"
                                  ? "justify-start"
                                  : "justify-end"
                              }`}
                            >
                              <div
                                className={`max-w-[92%] sm:max-w-[78%] ${
                                  item.sender === "me"
                                    ? "rounded-2xl rounded-ss-md bg-black text-white"
                                    : "rounded-2xl rounded-se-md bg-white text-neutral-900 shadow-sm"
                                } px-4 py-3`}
                              >
                                <div className="mb-1 flex items-center gap-2">
                                  <div
                                    className={`flex h-5 w-5 items-center justify-center rounded-md ${
                                      item.sender === "me"
                                        ? "bg-white/10"
                                        : "bg-neutral-100"
                                    }`}
                                  >
                                    {item.sender ===
                                    "me" ? (
                                      <Bot className="h-3 w-3" />
                                    ) : (
                                      <User className="h-3 w-3" />
                                    )}
                                  </div>

                                  <p className="text-[9px] font-medium opacity-60">
                                    {item.sender ===
                                    "me"
                                      ? text.businessOS
                                      : selectedConversation.customer}
                                  </p>
                                </div>

                                <p className="break-words text-sm leading-6">
                                  {item.text}
                                </p>

                                <p
                                  className={`mt-2 text-[9px] ${
                                    item.sender ===
                                    "me"
                                      ? "text-neutral-400"
                                      : "text-neutral-400"
                                  }`}
                                >
                                  {item.time}
                                </p>
                              </div>
                            </div>
                          )
                        )
                      )}

                      {isGenerating && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-ss-md bg-black px-4 py-3 text-white">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5" />

                              <p className="text-xs">
                                {text.aiWriting}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {isAdvancedAnalyzing && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Bot className="h-3.5 w-3.5 text-neutral-500" />

                              <p className="text-xs text-neutral-500">
                                {text.aiAnalyzing}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-neutral-100 bg-white p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          value={message}
                          onChange={(event) =>
                            setMessage(event.target.value)
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
                          disabled={
                            isGenerating ||
                            isAdvancedAnalyzing ||
                            creatingTask
                          }
                          placeholder={text.writeReply}
                          className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-neutral-100 disabled:bg-neutral-50"
                        />

                        <button
                          onClick={sendMessage}
                          disabled={
                            isGenerating ||
                            isAdvancedAnalyzing ||
                            creatingTask ||
                            !message.trim()
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {text.send}
                        </button>
                      </div>

                      <p className="mt-3 text-[10px] text-neutral-400">
                        {text.manualOrAI}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <div className="text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                        <MessageCircle className="h-6 w-6" />
                      </div>

                      <p className="mt-4 text-sm font-semibold text-neutral-600">
                        {text.noSelectedConversation}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CircleDotIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className || ""}`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
    </span>
  );
}

function InsightCard({
  title,
  value,
  icon,
  type = "default",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  type?: "default" | "amber" | "green";
}) {
  const iconStyles = {
    default: "bg-neutral-100 text-neutral-500",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-neutral-100 bg-[#fafafa] p-4 transition hover:bg-white hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-neutral-500">
            {title}
          </p>

          <p className="mt-3 text-2xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconStyles[type]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  type = "default",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  type?: "default" | "amber";
}) {
  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_8px_35px_rgba(0,0,0,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,.07)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            type === "amber"
              ? "bg-amber-50 text-amber-600"
              : "bg-black text-white"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function AnalysisItem({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-3 ${
        fullWidth ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[10px] font-semibold text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-sm leading-6 text-neutral-700">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  text,
}: {
  status: ConversationStatus;
  text: {
    statusNew: string;
    statusActive: string;
    statusClosed: string;
  };
}) {
  const styles: Record<
    ConversationStatus,
    string
  > = {
    جديدة: "bg-neutral-100 text-neutral-600",
    "قيد المتابعة":
      "bg-amber-50 text-amber-700",
    مغلقة: "bg-black text-white",
  };

  const labels: Record<
    ConversationStatus,
    string
  > = {
    جديدة: text.statusNew,
    "قيد المتابعة": text.statusActive,
    مغلقة: text.statusClosed,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "مغلقة"
            ? "bg-white"
            : status === "قيد المتابعة"
              ? "bg-amber-500"
              : "bg-neutral-400"
        }`}
      />

      {labels[status]}
    </span>
  );
}