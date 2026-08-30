"use client";

import { useEffect, useState } from "react";

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

const STORAGE_KEY = "businessos-ai-messages";
const KNOWLEDGE_KEY = "businessos-knowledge";

const defaultMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "مرحبًا 👋 أنا مساعد BusinessOS الذكي. اكتب سؤالك وسأساعدك.",
  },
];

const defaultKnowledge: KnowledgeData = {
  companyName: "شركتي",
  businessInfo: "شركة تقدم خدمات رقمية وحلول تقنية للعملاء.",
  services:
    "تصميم المواقع الإلكترونية\nتطوير الأنظمة\nالاستشارات التقنية",
  pricing:
    "تصميم المواقع يبدأ من 2500 جنيه.\nالاستشارات تبدأ من 500 جنيه.",
  policies:
    "يتم تحديد مدة التنفيذ حسب نوع المشروع.\nيتم الاتفاق على التفاصيل قبل بدء العمل.",
  faq:
    "س: كم تستغرق الخدمة؟\nج: تختلف المدة حسب نوع الخدمة وحجم المشروع.\n\nس: هل يمكن طلب تعديل؟\nج: نعم، يمكن طلب التعديلات حسب الاتفاق.",
};

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
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
        "حدث خطأ أثناء تحميل المحادثة:",
        error
      );
      setMessages(defaultMessages);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages)
    );
  }, [messages, isLoaded]);

  function getKnowledge(): KnowledgeData {
    try {
      const savedKnowledge =
        localStorage.getItem(KNOWLEDGE_KEY);

      if (savedKnowledge) {
        const parsed = JSON.parse(savedKnowledge);

        if (parsed && typeof parsed === "object") {
          return {
            ...defaultKnowledge,
            ...parsed,
          };
        }
      }
    } catch (error) {
      console.error(
        "حدث خطأ أثناء تحميل قاعدة المعرفة:",
        error
      );
    }

    return defaultKnowledge;
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text || isTyping) return;

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
          knowledge,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "حدث خطأ في API"
        );
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          data.reply || "لم يصل رد من المساعد.",
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
        content:
          "حدث خطأ أثناء الاتصال بالمساعد. تأكد من أن السيرفر يعمل.",
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
      "هل تريد حذف المحادثة؟"
    );

    if (!confirmed) return;

    setMessages(defaultMessages);
  }

  if (!isLoaded) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <p className="text-sm text-slate-500">
          جاري تحميل المساعد...
        </p>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-8 text-slate-900"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            مساعد الذكاء الاصطناعي 🤖
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            مساعدك الذكي داخل BusinessOS
          </p>
        </div>

        <button
          onClick={clearConversation}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          مسح المحادثة
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-slate-900 p-6 text-white">
        <h2 className="text-lg font-bold">
          BusinessOS AI
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          المساعد متصل الآن بقاعدة معرفة شركتك وواجهة الذكاء الاصطناعي.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="min-h-[500px] space-y-5 bg-slate-50 p-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user"
                  ? "justify-start"
                  : "justify-end"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                  message.role === "user"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white"
                }`}
              >
                <p className="mb-2 text-xs font-medium opacity-60">
                  {message.role === "user"
                    ? "أنت"
                    : "BusinessOS AI"}
                </p>

                <p className="whitespace-pre-line text-sm leading-7">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-end">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-sm text-slate-500">
                  المساعد يكتب...
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white p-5">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              disabled={isTyping}
              placeholder="اكتب سؤالك هنا..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
            />

            <button
              onClick={sendMessage}
              disabled={isTyping || !input.trim()}
              className="rounded-xl bg-slate-900 px-7 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTyping ? "جاري الإرسال..." : "إرسال"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            اضغط Enter لإرسال الرسالة
          </p>
        </div>
      </div>
    </main>
  );
}