"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import { hasFeature } from "@/lib/plan-permissions";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type ProposedAction = {
  type: "create_task" | "create_order";
  title?: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status?: string;
  customer_id: string | null;
  customer_name: string | null;
  service?: string;
  total?: number;
  notes?: string;
};

type AccessState = "loading" | "allowed" | "denied" | "error";

const STORAGE_KEY_PREFIX = "businessos-ai-messages";

export default function AIPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [messages, setMessages] = useState<Message[]>([]);
  const [proposedAction, setProposedAction] =
    useState<ProposedAction | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessState, setAccessState] =
    useState<AccessState>("loading");
  const [planName, setPlanName] = useState("");
  const [error, setError] = useState("");

  const [storageKey, setStorageKey] = useState(
    `${STORAGE_KEY_PREFIX}-unknown`
  );

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (accessState === "allowed") {
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        } catch {
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [accessState, storageKey]);

  useEffect(() => {
    if (accessState === "allowed") {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, accessState, storageKey]);

  async function checkAccess() {
    setAccessState("loading");
    setError("");

    try {
      const {
        data: debugSession,
        error: debugSessionError,
      } = await supabase.auth.getSession();

      console.log("AI SESSION DEBUG:", {
        hasSession: !!debugSession.session,
        userId: debugSession.session?.user?.id ?? null,
        error: debugSessionError,
      });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError(
          isEnglish
            ? "Please log in first."
            : "يرجى تسجيل الدخول أولاً."
        );
        setAccessState("denied");
        return;
      }

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("company_members")
        .select("company_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (membershipError) {
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        setError(
          isEnglish
            ? "You are not connected to a company."
            : "حسابك غير مرتبط بأي شركة."
        );
        setAccessState("denied");
        return;
      }

      const membership = memberships[0];

      setStorageKey(
        `${STORAGE_KEY_PREFIX}-${user.id}-${membership.company_id}`
      );

      const {
        data: subscriptions,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .select("plan_id, status, end_date, created_at")
        .eq("company_id", membership.company_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (subscriptionError) {
        throw subscriptionError;
      }

      if (!subscriptions || subscriptions.length === 0) {
        setError(
          isEnglish
            ? "Your company does not have an active subscription."
            : "لا يوجد اشتراك نشط للشركة."
        );
        setAccessState("denied");
        return;
      }

      const subscription = subscriptions[0];

      if (
        subscription.end_date &&
        new Date(subscription.end_date) < new Date()
      ) {
        setError(
          isEnglish
            ? "Your subscription has expired."
            : "انتهى اشتراك الشركة."
        );
        setAccessState("denied");
        return;
      }

      const {
        data: plan,
        error: planError,
      } = await supabase
        .from("plans")
        .select("name")
        .eq("id", subscription.plan_id)
        .eq("is_active", true)
        .maybeSingle();

      if (planError) {
        throw planError;
      }

      if (!plan) {
        setError(
          isEnglish
            ? "Active plan not found."
            : "لم يتم العثور على الخطة النشطة."
        );
        setAccessState("denied");
        return;
      }

      setPlanName(plan.name);

      if (!hasFeature(plan.name, "ai")) {
        setError(
          isEnglish
            ? "AI Assistant is not available on your current plan."
            : "المساعد الذكي غير متاح في خطتك الحالية."
        );
        setAccessState("denied");
        return;
      }

      setAccessState("allowed");
    } catch (err) {
      console.error("AI access error:", err);

      setError(
        err instanceof Error
          ? err.message
          : isEnglish
            ? "Something went wrong."
            : "حدث خطأ غير متوقع."
      );

      setAccessState("error");
    }
  }

  async function confirmProposedAction() {
    if (!proposedAction) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (proposedAction.type === "create_task") {
        const response = await fetch("/api/ai/actions/task", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: proposedAction.title,
            description: proposedAction.description,
            due_date: proposedAction.due_date,
            priority: proposedAction.priority,
            status: proposedAction.status,
            customer_id: proposedAction.customer_id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              (isEnglish
                ? "Failed to create the task."
                : "فشل إنشاء المهمة.")
          );
        }

        const successMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isEnglish
            ? "The task was created successfully."
            : "تم إنشاء المهمة بنجاح.",
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [
          ...current,
          successMessage,
        ]);

        setProposedAction(null);
      }

      if (proposedAction.type === "create_order") {
        const response = await fetch("/api/ai/actions/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_id: proposedAction.customer_id,
            customer_name: proposedAction.customer_name,
            service: proposedAction.service,
            total: proposedAction.total,
            status: proposedAction.status,
            notes: proposedAction.notes,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              (isEnglish
                ? "Failed to create the order."
                : "فشل إنشاء الطلب.")
          );
        }

        const successMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isEnglish
            ? "The order was created successfully."
            : "تم إنشاء الطلب بنجاح.",
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [
          ...current,
          successMessage,
        ]);

        setProposedAction(null);
      }
    } catch (err) {
      console.error("AI action confirmation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : isEnglish
            ? "Failed to execute the action."
            : "تعذر تنفيذ الإجراء."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");
    setError("");
    setLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEnglish
              ? "AI request failed."
              : "فشل طلب المساعد الذكي.")
        );
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        created_at: new Date().toISOString(),
      };

      if (data.action) {
        setProposedAction(data.action);
      } else {
        setProposedAction(null);
      }

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (err) {
      console.error("AI message error:", err);

      setError(
        err instanceof Error
          ? err.message
          : isEnglish
            ? "Failed to get AI response."
            : "تعذر الحصول على رد من المساعد الذكي."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setMessages([]);
    localStorage.removeItem(storageKey);
  }

  if (accessState === "loading") {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="min-h-screen bg-white text-black"
      >
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }

  if (
    accessState === "denied" ||
    accessState === "error"
  ) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="min-h-screen bg-white text-black"
      >
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold">
              {isEnglish
                ? "AI Assistant"
                : "المساعد الذكي"}
            </h1>

            <p className="mt-3 text-sm text-black/60">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-screen bg-white text-black"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                <Bot className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  {isEnglish
                    ? "AI Assistant"
                    : "المساعد الذكي"}
                </h1>

                <p className="text-sm text-black/50">
                  {isEnglish
                    ? "BusinessOS intelligent assistant"
                    : "المساعد الذكي لمنصة BusinessOS"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium">
              {planName}
            </span>

            <button
              type="button"
              onClick={clearMessages}
              className="flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
              {isEnglish ? "Clear" : "مسح"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="min-h-[55vh] space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
                <Sparkles className="mb-4 h-10 w-10" />

                <h2 className="text-xl font-semibold">
                  {isEnglish
                    ? "How can I help you?"
                    : "كيف يمكنني مساعدتك؟"}
                </h2>

                <p className="mt-2 max-w-md text-sm text-black/50">
                  {isEnglish
                    ? "Ask about your business, customers, orders, tasks, or other available BusinessOS data."
                    : "اسألني عن نشاطك التجاري أو العملاء أو الطلبات أو المهام أو بيانات BusinessOS المتاحة."}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                      message.role === "user"
                        ? "bg-black text-white"
                        : "border border-black/10 bg-black/[0.03] text-black"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEnglish
                    ? "Thinking..."
                    : "جاري التفكير..."}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-black/10 px-4 py-3 text-sm text-black/70">
              {error}
            </div>
          )}

          {proposedAction && (
            <div className="border-t border-black/10 bg-black/[0.02] p-4">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold">
                    {proposedAction.type === "create_order"
                      ? isEnglish
                        ? "Proposed order"
                        : "طلب مقترح"
                      : isEnglish
                        ? "Proposed action"
                        : "إجراء مقترح"}
                  </p>

                  <p className="mt-1 text-xs text-black/50">
                    {proposedAction.type === "create_order"
                      ? isEnglish
                        ? "Review the order details before confirming."
                        : "راجع تفاصيل الطلب قبل تأكيد إنشائه."
                      : isEnglish
                        ? "Review the task details before confirming."
                        : "راجع تفاصيل المهمة قبل تأكيد إنشائها."}
                  </p>
                </div>

                {proposedAction.type === "create_order" ? (
                  <div className="space-y-3 text-sm">
                    {proposedAction.customer_name && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish ? "Customer" : "العميل"}
                        </p>
                        <p className="mt-1 font-medium">
                          {proposedAction.customer_name}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-black/50">
                        {isEnglish ? "Service" : "الخدمة"}
                      </p>
                      <p className="mt-1 font-medium">
                        {proposedAction.service || "-"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish ? "Total" : "الإجمالي"}
                        </p>
                        <p className="mt-1 font-medium">
                          {Number(
                            proposedAction.total || 0
                          ).toLocaleString(
                            isEnglish ? "en-US" : "ar-EG"
                          )}{" "}
                          {isEnglish ? "EGP" : "جنيه"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish ? "Status" : "الحالة"}
                        </p>
                        <p className="mt-1 font-medium">
                          {proposedAction.status || "-"}
                        </p>
                      </div>
                    </div>

                    {proposedAction.notes && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish ? "Notes" : "ملاحظات"}
                        </p>
                        <p className="mt-1">
                          {proposedAction.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-black/50">
                        {isEnglish ? "Title" : "العنوان"}
                      </p>
                      <p className="mt-1 font-medium">
                        {proposedAction.title}
                      </p>
                    </div>

                    {proposedAction.customer_name && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish ? "Customer" : "العميل"}
                        </p>
                        <p className="mt-1 font-medium">
                          {proposedAction.customer_name}
                        </p>
                      </div>
                    )}

                    {proposedAction.description && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish ? "Description" : "الوصف"}
                        </p>
                        <p className="mt-1">
                          {proposedAction.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Due date"
                            : "تاريخ الاستحقاق"}
                        </p>
                        <p className="mt-1">
                          {proposedAction.due_date || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Priority"
                            : "الأولوية"}
                        </p>
                        <p className="mt-1">
                          {proposedAction.priority || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish ? "Status" : "الحالة"}
                        </p>
                        <p className="mt-1">
                          {proposedAction.status || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={confirmProposedAction}
                    disabled={loading}
                    className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? isEnglish
                        ? "Creating..."
                        : "جاري الإنشاء..."
                      : proposedAction.type === "create_order"
                        ? isEnglish
                          ? "Confirm and create order"
                          : "تأكيد وإنشاء الطلب"
                        : isEnglish
                          ? "Confirm and create task"
                          : "تأكيد وإنشاء المهمة"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setProposedAction(null)}
                    disabled={loading}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEnglish ? "Cancel" : "إلغاء"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form
            onSubmit={sendMessage}
            className="border-t border-black/10 p-4"
          >
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                disabled={loading}
                placeholder={
                  isEnglish
                    ? "Ask BusinessOS AI..."
                    : "اسأل مساعد BusinessOS..."
                }
                className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                <span className="hidden sm:inline">
                  {isEnglish ? "Send" : "إرسال"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}