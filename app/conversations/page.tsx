"use client";

import { useEffect, useState } from "react";

type ConversationStatus = "جديدة" | "قيد المتابعة" | "مغلقة";

type Message = {
  id: number;
  sender: "customer" | "me";
  text: string;
  time: string;
};

type Conversation = {
  id: number;
  customer: string;
  lastMessage: string;
  status: ConversationStatus;
  unread: boolean;
  messages: Message[];
};

type KnowledgeData = {
  companyName: string;
  businessInfo: string;
  services: string;
  pricing: string;
  policies: string;
  faq: string;
};

const STORAGE_KEY = "businessos-conversations";
const KNOWLEDGE_KEY = "businessos-knowledge";

const defaultConversations: Conversation[] = [
  {
    id: 1,
    customer: "أحمد محمد",
    lastMessage: "أريد معرفة تفاصيل الخدمة الجديدة",
    status: "قيد المتابعة",
    unread: true,
    messages: [
      {
        id: 1,
        sender: "customer",
        text: "مرحبًا، أريد معرفة تفاصيل الخدمة الجديدة.",
        time: "10:30",
      },
      {
        id: 2,
        sender: "me",
        text: "أهلًا بك أحمد، بالتأكيد سأساعدك.",
        time: "10:32",
      },
      {
        id: 3,
        sender: "customer",
        text: "ممتاز، أريد معرفة السعر أيضًا.",
        time: "10:34",
      },
    ],
  },
  {
    id: 2,
    customer: "سارة علي",
    lastMessage: "كم سعر الباقة الأساسية؟",
    status: "جديدة",
    unread: true,
    messages: [
      {
        id: 1,
        sender: "customer",
        text: "مرحبًا، كم سعر الباقة الأساسية؟",
        time: "11:15",
      },
    ],
  },
  {
    id: 3,
    customer: "محمد خالد",
    lastMessage: "شكرًا لك",
    status: "مغلقة",
    unread: false,
    messages: [
      {
        id: 1,
        sender: "customer",
        text: "تم استلام الطلب، شكرًا لك.",
        time: "09:20",
      },
      {
        id: 2,
        sender: "me",
        text: "على الرحب والسعة.",
        time: "09:25",
      },
      {
        id: 3,
        sender: "customer",
        text: "شكرًا لك.",
        time: "09:26",
      },
    ],
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

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setConversations(parsed);
        } else {
          setConversations(defaultConversations);
        }
      } else {
        setConversations(defaultConversations);
      }
    } catch {
      setConversations(defaultConversations);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(conversations)
      );
    } catch {}
  }, [conversations, isLoaded]);

  useEffect(() => {
    if (conversations.length > 0 && selectedId === null) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selectedConversation =
    conversations.find(
      (conversation) => conversation.id === selectedId
    ) ?? null;

  const unreadCount = conversations.filter(
    (conversation) => conversation.unread
  ).length;

  const activeCount = conversations.filter(
    (conversation) => conversation.status === "قيد المتابعة"
  ).length;

  function selectConversation(id: number) {
    setSelectedId(id);

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              unread: false,
            }
          : conversation
      )
    );
  }

  function getKnowledge(): KnowledgeData {
    try {
      const saved = localStorage.getItem(KNOWLEDGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed && typeof parsed === "object") {
          return {
            ...defaultKnowledge,
            ...parsed,
          };
        }
      }
    } catch {}

    return defaultKnowledge;
  }

  function sendMessage() {
    const text = message.trim();

    if (!text || !selectedConversation || isGenerating) {
      return;
    }

    const newMessage: Message = {
      id: Date.now(),
      sender: "me",
      text,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              lastMessage: text,
              status: "قيد المتابعة",
              messages: [
                ...conversation.messages,
                newMessage,
              ],
            }
          : conversation
      )
    );

    setMessage("");
  }

  async function generateAIReply() {
    if (!selectedConversation || isGenerating) {
      return;
    }

    const lastCustomerMessage =
      [...selectedConversation.messages]
        .reverse()
        .find((item) => item.sender === "customer");

    if (!lastCustomerMessage) {
      alert("لا توجد رسالة من العميل.");
      return;
    }

    setIsGenerating(true);

    try {
      const knowledge = getKnowledge();

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastCustomerMessage.text,
          knowledge,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "حدث خطأ في API"
        );
      }

      const reply = String(data?.reply || "").trim();

      if (!reply) {
        throw new Error("لم يصل رد من الذكاء الاصطناعي");
      }

      const aiMessage: Message = {
        id: Date.now(),
        sender: "me",
        text: reply,
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                lastMessage: reply,
                status: "قيد المتابعة",
                unread: false,
                messages: [
                  ...conversation.messages,
                  aiMessage,
                ],
              }
            : conversation
        )
      );
    } catch (error) {
      console.error("AI Conversation Error:", error);

      alert(
        "حدث خطأ أثناء إنشاء رد الذكاء الاصطناعي."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function changeStatus(status: ConversationStatus) {
    if (!selectedConversation) return;

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              status,
            }
          : conversation
      )
    );
  }

  if (!isLoaded) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <p className="text-sm text-slate-500">
          جاري تحميل المحادثات...
        </p>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-xl text-white">
              💬
            </div>

            <div>
              <h1 className="text-3xl font-bold">
                المحادثات
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                إدارة محادثات العملاء والرد باستخدام الذكاء الاصطناعي
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <StatCard
            title="إجمالي المحادثات"
            value={conversations.length}
          />

          <StatCard
            title="غير مقروءة"
            value={unreadCount}
          />

          <StatCard
            title="قيد المتابعة"
            value={activeCount}
          />
        </div>

        <div className="grid min-h-[650px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
          <aside className="border-l border-slate-200">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-bold">
                المحادثات
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                اختر محادثة لعرض الرسائل
              </p>
            </div>

            <div>
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() =>
                    selectConversation(conversation.id)
                  }
                  className={`w-full border-b border-slate-100 p-5 text-right transition ${
                    selectedId === conversation.id
                      ? "bg-slate-100"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {conversation.customer}
                      </p>

                      <p className="mt-2 truncate text-xs text-slate-500">
                        {conversation.lastMessage}
                      </p>
                    </div>

                    {conversation.unread && (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900" />
                    )}
                  </div>

                  <div className="mt-3">
                    <StatusBadge
                      status={conversation.status}
                    />
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[650px] flex-col">
            {selectedConversation ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                  <div>
                    <h2 className="font-bold">
                      {selectedConversation.customer}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      محادثة العميل
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateAIReply}
                      disabled={isGenerating}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGenerating
                        ? "جاري إنشاء الرد..."
                        : "رد بالذكاء الاصطناعي"}
                    </button>

                    <select
                      value={selectedConversation.status}
                      onChange={(event) =>
                        changeStatus(
                          event.target.value as ConversationStatus
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-900"
                    >
                      <option value="جديدة">
                        جديدة
                      </option>

                      <option value="قيد المتابعة">
                        قيد المتابعة
                      </option>

                      <option value="مغلقة">
                        مغلقة
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
                  {selectedConversation.messages.map(
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
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            item.sender === "me"
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white"
                          }`}
                        >
                          <p className="mb-1 text-[10px] font-medium opacity-60">
                            {item.sender === "me"
                              ? "BusinessOS"
                              : selectedConversation.customer}
                          </p>

                          <p className="text-sm leading-6">
                            {item.text}
                          </p>

                          <p
                            className={`mt-2 text-[10px] ${
                              item.sender === "me"
                                ? "text-slate-300"
                                : "text-slate-400"
                            }`}
                          >
                            {item.time}
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {isGenerating && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-sm text-slate-500">
                          BusinessOS AI يكتب الرد...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 bg-white p-5">
                  <div className="flex gap-3">
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
                      disabled={isGenerating}
                      placeholder="اكتب ردك هنا..."
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 disabled:bg-slate-50"
                    />

                    <button
                      onClick={sendMessage}
                      disabled={
                        isGenerating || !message.trim()
                      }
                      className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      إرسال
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    يمكنك إرسال رد يدوي أو استخدام الذكاء الاصطناعي.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-slate-500">
                  اختر محادثة من القائمة
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ConversationStatus;
}) {
  const styles: Record<
    ConversationStatus,
    string
  > = {
    جديدة: "bg-slate-100 text-slate-700",
    "قيد المتابعة": "bg-slate-200 text-slate-800",
    مغلقة: "bg-slate-900 text-white",
  };

  return (
    <span
      className={`rounded-lg px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}