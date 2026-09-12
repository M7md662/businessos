"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Brain,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  Lock,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import { hasFeature } from "@/lib/plan-permissions";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type KnowledgeData = {
  companyName: string;
  businessInfo: string;
  services: string;
  pricing: string;
  policies: string;
  faq: string;
};

type AccessState =
  | "loading"
  | "allowed"
  | "denied"
  | "error";

const STORAGE_KEY = "businessos-ai-messages";
const KNOWLEDGE_KEY = "businessos-knowledge";

const defaultMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Ù…Ø±Ø­Ø¨Ù‹Ø§ ðŸ‘‹ Ø£Ù†Ø§ Ù…Ø³Ø§Ø¹Ø¯ BusinessOS Ø§Ù„Ø°ÙƒÙŠ. Ø§ÙƒØªØ¨ Ø³Ø¤Ø§Ù„Ùƒ ÙˆØ³Ø£Ø³Ø§Ø¹Ø¯Ùƒ.",
  },
];

const defaultKnowledge: KnowledgeData = {
  companyName: "Ø´Ø±ÙƒØªÙŠ",
  businessInfo:
    "Ø´Ø±ÙƒØ© ØªÙ‚Ø¯Ù… Ø®Ø¯Ù…Ø§Øª Ø±Ù‚Ù…ÙŠØ© ÙˆØ­Ù„ÙˆÙ„ ØªÙ‚Ù†ÙŠØ© Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡.",
  services:
    "ØªØµÙ…ÙŠÙ… Ø§Ù„Ù…ÙˆØ§Ù‚Ø¹ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ©\nØªØ·ÙˆÙŠØ± Ø§Ù„Ø£Ù†Ø¸Ù…Ø©\nØ§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª Ø§Ù„ØªÙ‚Ù†ÙŠØ©",
  pricing:
    "ØªØµÙ…ÙŠÙ… Ø§Ù„Ù…ÙˆØ§Ù‚Ø¹ ÙŠØ¨Ø¯Ø£ Ù…Ù† 2500 Ø¬Ù†ÙŠÙ‡.\nØ§Ù„Ø§Ø³ØªØ´Ø§Ø±Ø§Øª ØªØ¨Ø¯Ø£ Ù…Ù† 500 Ø¬Ù†ÙŠÙ‡.",
  policies:
    "ÙŠØªÙ… ØªØ­Ø¯ÙŠØ¯ Ù…Ø¯Ø© Ø§Ù„ØªÙ†ÙÙŠØ° Ø­Ø³Ø¨ Ù†ÙˆØ¹ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹.\nÙŠØªÙ… Ø§Ù„Ø§ØªÙØ§Ù‚ Ø¹Ù„Ù‰ Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ù‚Ø¨Ù„ Ø¨Ø¯Ø¡ Ø§Ù„Ø¹Ù…Ù„.",
  faq:
    "Ø³: ÙƒÙ… ØªØ³ØªØºØ±Ù‚ Ø§Ù„Ø®Ø¯Ù…Ø©ØŸ\nØ¬: ØªØ®ØªÙ„Ù Ø§Ù„Ù…Ø¯Ø© Ø­Ø³Ø¨ Ù†ÙˆØ¹ Ø§Ù„Ø®Ø¯Ù…Ø© ÙˆØ­Ø¬Ù… Ø§Ù„Ù…Ø´Ø±ÙˆØ¹.\n\nØ³: Ù‡Ù„ ÙŠÙ…ÙƒÙ† Ø·Ù„Ø¨ ØªØ¹Ø¯ÙŠÙ„Ø§ØªØŸ\nØ¬: Ù†Ø¹Ù…ØŒ ÙŠÙ…ÙƒÙ† Ø·Ù„Ø¨ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø­Ø³Ø¨ Ø§Ù„Ø§ØªÙØ§Ù‚.",
};

export default function AIPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const labels = isEnglish
    ? {
        loading: "Checking AI assistant access...",
        accessTitle: "AI Assistant",
        accessDescription:
          "The AI Assistant is available on Pro and Enterprise plans.",
        accessHint:
          "Upgrade your plan to use the AI assistant inside BusinessOS.",
        currentPlan: "Current plan",
        errorTitle: "Unable to load AI Assistant",
        errorDescription:
          "There was a problem while checking your account or subscription.",
        title: "AI Assistant",
        subtitle:
          "Your intelligent assistant inside BusinessOS",
        clear: "Clear conversation",
        clearConfirm:
          "Do you want to delete this conversation?",
        connected: "Connected",
        connectedTitle: "BusinessOS AI",
        connectedDescription:
          "The assistant is connected to your company knowledge base and AI interface.",
        knowledgeConnected: "Knowledge connected",
        smartResponses: "Smart responses",
        ready: "Ready",
        you: "You",
        assistant: "BusinessOS AI",
        typing: "AI is thinking...",
        placeholder: "Ask your question here...",
        sending: "Sending...",
        send: "Send",
        enterHint: "Press Enter to send",
        reset: "Reset",
        conversation: "Conversation",
        messages: "messages",
        secure: "BusinessOS AI",
        powered: "Powered by your business knowledge",
      }
    : {
        loading: "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯...",
        accessTitle: "Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ",
        accessDescription:
          "Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ Ù…ØªØ§Ø­ ÙÙŠ Ø®Ø·ØªÙŠ Pro ÙˆEnterprise.",
        accessHint:
          "ØªØ­ØªØ§Ø¬ Ø¥Ù„Ù‰ ØªØ±Ù‚ÙŠØ© Ø®Ø·ØªÙƒ Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ Ø¯Ø§Ø®Ù„ BusinessOS.",
        currentPlan: "Ø®Ø·ØªÙƒ Ø§Ù„Ø­Ø§Ù„ÙŠØ©",
        errorTitle: "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ",
        errorDescription:
          "Ø­Ø¯Ø«Øª Ù…Ø´ÙƒÙ„Ø© Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø­Ø³Ø§Ø¨Ùƒ Ø£Ùˆ Ø§Ø´ØªØ±Ø§ÙƒÙƒ.",
        title: "Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ",
        subtitle: "Ù…Ø³Ø§Ø¹Ø¯Ùƒ Ø§Ù„Ø°ÙƒÙŠ Ø¯Ø§Ø®Ù„ BusinessOS",
        clear: "Ù…Ø³Ø­ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©",
        clearConfirm: "Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©ØŸ",
        connected: "Ù…ØªØµÙ„",
        connectedTitle: "BusinessOS AI",
        connectedDescription:
          "Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ù…ØªØµÙ„ Ø§Ù„Ø¢Ù† Ø¨Ù‚Ø§Ø¹Ø¯Ø© Ù…Ø¹Ø±ÙØ© Ø´Ø±ÙƒØªÙƒ ÙˆÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ.",
        knowledgeConnected: "Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ù…Ø¹Ø±ÙØ© Ù…ØªØµÙ„Ø©",
        smartResponses: "Ø±Ø¯ÙˆØ¯ Ø°ÙƒÙŠØ©",
        ready: "Ø¬Ø§Ù‡Ø²",
        you: "Ø£Ù†Øª",
        assistant: "BusinessOS AI",
        typing: "Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ ÙŠÙÙƒØ±...",
        placeholder: "Ø§ÙƒØªØ¨ Ø³Ø¤Ø§Ù„Ùƒ Ù‡Ù†Ø§...",
        sending: "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...",
        send: "Ø¥Ø±Ø³Ø§Ù„",
        enterHint: "Ø§Ø¶ØºØ· Enter Ù„Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø©",
        reset: "Ø¥Ø¹Ø§Ø¯Ø© Ø¶Ø¨Ø·",
        conversation: "Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©",
        messages: "Ø±Ø³Ø§Ø¦Ù„",
        secure: "BusinessOS AI",
        powered: "Ù…Ø¯Ø¹ÙˆÙ… Ø¨Ù‚Ø§Ø¹Ø¯Ø© Ù…Ø¹Ø±ÙØ© Ø´Ø±ÙƒØªÙƒ",
      };

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [accessState, setAccessState] =
    useState<AccessState>("loading");

  const [planName, setPlanName] = useState("");

  useEffect(() => {
    async function checkAccessAndLoad() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAccessState("denied");
          setIsLoaded(true);
          return;
        }

        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError || !membership) {
          console.error(
            "Membership lookup error:",
            membershipError
          );

          setAccessState("error");
          setIsLoaded(true);
          return;
        }

        const {
          data: subscription,
          error: subscriptionError,
        } = await supabase
          .from("subscriptions")
          .select("plan_id, status, end_date")
          .eq("company_id", membership.company_id)
          .eq("status", "active")
          .maybeSingle();

        if (subscriptionError || !subscription) {
          console.error(
            "Subscription lookup error:",
            subscriptionError
          );

          setAccessState("denied");
          setIsLoaded(true);
          return;
        }

        if (
          subscription.end_date &&
          new Date(subscription.end_date).getTime() <=
            Date.now()
        ) {
          setAccessState("denied");
          setIsLoaded(true);
          return;
        }

        const { data: plan, error: planError } =
          await supabase
            .from("plans")
            .select("name")
            .eq("id", subscription.plan_id)
            .eq("is_active", true)
            .maybeSingle();

        if (planError || !plan) {
          console.error(
            "Plan lookup error:",
            planError
          );

          setAccessState("error");
          setIsLoaded(true);
          return;
        }

        setPlanName(plan.name);

        if (!hasFeature(plan.name, "ai")) {
          setAccessState("denied");
          setIsLoaded(true);
          return;
        }

        setAccessState("allowed");

        try {
          const savedMessages =
            localStorage.getItem(STORAGE_KEY);

          if (savedMessages) {
            const parsed = JSON.parse(savedMessages);

            if (Array.isArray(parsed)) {
              setMessages(parsed);
            } else {
              setMessages(defaultMessages);
            }
          } else {
            setMessages(defaultMessages);
          }
        } catch (error) {
          console.error(
            "Error loading AI conversation:",
            error
          );

          setMessages(defaultMessages);
        }
      } catch (error) {
        console.error(
          "AI access loading error:",
          error
        );

        setAccessState("error");
      } finally {
        setIsLoaded(true);
      }
    }

    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (
      !isLoaded ||
      accessState !== "allowed"
    ) {
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages)
    );
  }, [
    messages,
    isLoaded,
    accessState,
  ]);

  function getKnowledge(): KnowledgeData {
    try {
      const savedKnowledge =
        localStorage.getItem(KNOWLEDGE_KEY);

      if (savedKnowledge) {
        const parsed = JSON.parse(savedKnowledge);

        if (
          parsed &&
          typeof parsed === "object"
        ) {
          return {
            ...defaultKnowledge,
            ...parsed,
          };
        }
      }
    } catch (error) {
      console.error(
        "Error loading knowledge base:",
        error
      );
    }

    return defaultKnowledge;
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text || isTyping) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: text,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");
    setIsTyping(true);

    try {
      const knowledge = getKnowledge();

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          locale,
          knowledge,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "AI API error"
        );
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          data.reply ||
          (isEnglish
            ? "No response was received."
            : "Ù„Ù… ÙŠØµÙ„ Ø±Ø¯ Ù…Ù† Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯."),
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("AI Error:", error);

      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: isEnglish
          ? "An error occurred while connecting to the assistant. Make sure the server is running."
          : "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯. ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù† Ø§Ù„Ø®Ø§Ø¯Ù… ÙŠØ¹Ù…Ù„.",
      };

      setMessages((current) => [
        ...current,
        errorMessage,
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function clearConversation() {
    const confirmed = window.confirm(
      labels.clearConfirm
    );

    if (!confirmed) {
      return;
    }

    setMessages([
      {
        ...defaultMessages[0],
        content: isEnglish
          ? "Hello ðŸ‘‹ I am the BusinessOS AI assistant. Ask me anything and I will help you."
          : defaultMessages[0].content,
      },
    ]);
  }

  if (
    !isLoaded ||
    accessState === "loading"
  ) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[#f3f3f3] text-[#111]"
      >
        <div className="flex flex-col items-center rounded-[24px] bg-white px-10 py-9 text-center shadow-[0_10px_45px_rgba(0,0,0,.06)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <Sparkles className="h-5 w-5" />
          </div>

          <Loader2 className="mb-3 h-5 w-5 animate-spin text-neutral-400" />

          <p className="text-sm font-medium text-neutral-500">
            {labels.loading}
          </p>
        </div>
      </main>
    );
  }

  if (accessState === "denied") {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[#f3f3f3] px-4 text-[#111]"
      >
        <div className="w-full max-w-lg rounded-[24px] border border-neutral-100 bg-white p-8 text-center shadow-[0_10px_45px_rgba(0,0,0,.06)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
            <Lock className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            {labels.accessTitle}
          </h1>

          <p className="mt-3 text-sm leading-7 text-neutral-500">
            {labels.accessDescription}
          </p>

          <p className="mt-2 text-xs leading-6 text-neutral-400">
            {labels.accessHint}
          </p>

          {planName && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-600">
              <span>{labels.currentPlan}:</span>

              <span className="font-semibold text-black">
                {planName}
              </span>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (accessState === "error") {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[#f3f3f3] px-4 text-[#111]"
      >
        <div className="w-full max-w-lg rounded-[24px] border border-neutral-100 bg-white p-8 text-center shadow-[0_10px_45px_rgba(0,0,0,.06)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
            <span className="text-xl font-bold">
              !
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            {labels.errorTitle}
          </h1>

          <p className="mt-3 text-sm leading-7 text-neutral-500">
            {labels.errorDescription}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-[calc(100vh-24px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto min-h-[calc(100vh-24px)] max-w-[1500px] overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.06)]">
        <section className="min-w-0 bg-[#f8f8f8]">
          <header className="border-b border-neutral-100 bg-white px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                      {labels.title}
                    </h1>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {labels.connected}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 sm:text-sm">
                    {labels.subtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={clearConversation}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 hover:text-black"
              >
                <Trash2 className="h-4 w-4" />
                {labels.clear}
              </button>
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            <section className="overflow-hidden rounded-[20px] border border-neutral-100 bg-white shadow-sm">
              <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                    <Bot className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold tracking-tight">
                        {labels.connectedTitle}
                      </h2>

                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[9px] font-semibold text-neutral-500">
                        AI
                      </span>
                    </div>

                    <p className="mt-1 max-w-2xl text-xs leading-6 text-neutral-500 sm:text-sm">
                      {labels.connectedDescription}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                  <StatusItem
                    icon={<Brain className="h-3.5 w-3.5" />}
                    label={labels.knowledgeConnected}
                  />

                  <StatusItem
                    icon={
                      <Sparkles className="h-3.5 w-3.5" />
                    }
                    label={labels.smartResponses}
                  />

                  <StatusItem
                    icon={<Check className="h-3.5 w-3.5" />}
                    label={labels.ready}
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[20px] border border-neutral-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
                    <MessageSquare className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold">
                      {labels.conversation}
                    </h2>

                    <p className="text-[10px] text-neutral-400">
                      {messages.length} {labels.messages}
                    </p>
                  </div>
                </div>

                <button
                  onClick={clearConversation}
                  className="hidden items-center gap-1.5 text-[10px] font-medium text-neutral-400 transition hover:text-black sm:flex"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {labels.reset}
                </button>
              </div>

              <div className="min-h-[500px] space-y-5 bg-[#f8f8f8] p-4 sm:p-6 lg:min-h-[560px] lg:p-8">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[92%] items-start gap-3 sm:max-w-[78%] ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          message.role === "user"
                            ? "bg-black text-white"
                            : "bg-white text-black shadow-sm"
                        }`}
                      >
                        {message.role === "user" ? (
                          <span className="text-[10px] font-bold">
                            {isEnglish ? "Y" : "Ø£"}
                          </span>
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>

                      <div
                        className={`min-w-0 rounded-[18px] px-4 py-3.5 sm:px-5 sm:py-4 ${
                          message.role === "user"
                            ? "rounded-tr-md bg-black text-white"
                            : "rounded-tl-md border border-neutral-100 bg-white text-[#111] shadow-sm"
                        }`}
                      >
                        <p
                          className={`mb-1.5 text-[9px] font-semibold uppercase tracking-wide ${
                            message.role === "user"
                              ? "text-neutral-400"
                              : "text-neutral-400"
                          }`}
                        >
                          {message.role === "user"
                            ? labels.you
                            : labels.assistant}
                        </p>

                        <p className="whitespace-pre-line text-sm leading-7">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Bot className="h-4 w-4" />
                      </div>

                      <div className="rounded-[18px] rounded-tl-md border border-neutral-100 bg-white px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />

                          <span className="text-xs text-neutral-500">
                            {labels.typing}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-100 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <input
                      value={input}
                      onChange={(e) =>
                        setInput(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey
                        ) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={isTyping}
                      placeholder={
                        labels.placeholder
                      }
                      className="h-12 w-full rounded-xl border border-neutral-200 bg-[#fafafa] px-4 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <button
                    onClick={sendMessage}
                    disabled={
                      isTyping ||
                      !input.trim()
                    }
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isTyping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}

                    <span>
                      {isTyping
                        ? labels.sending
                        : labels.send}
                    </span>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <ChevronDown className="h-3 w-3" />
                    {labels.enterHint}
                  </p>

                  <p className="hidden items-center gap-1.5 text-[10px] text-neutral-400 sm:flex">
                    <Clock3 className="h-3 w-3" />
                    {labels.powered}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-neutral-50 px-3 py-2 text-[9px] font-medium text-neutral-500">
      <span className="text-neutral-700">
        {icon}
      </span>

      <span className="hidden sm:inline">
        {label}
      </span>
    </div>
  );
}


