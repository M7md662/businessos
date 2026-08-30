"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderStatus = "جديد" | "قيد المتابعة" | "مكتمل" | "ملغي";

type Order = {
  id: number;
  customer: string;
  service: string;
  amount: string;
  status: OrderStatus;
  date: string;
};

type TaskStatus = "جديدة" | "قيد التنفيذ" | "مكتملة";

type Task = {
  id: number;
  title: string;
  assignee: string;
  dueDate: string;
  priority: "منخفضة" | "متوسطة" | "عالية";
  status: TaskStatus;
};

type Conversation = {
  id: number;
  customer: string;
  lastMessage: string;
  status: "جديدة" | "قيد المتابعة" | "مغلقة";
  unread: boolean;
};

type Customer = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
};

const ORDERS_KEY = "businessos-orders";
const TASKS_KEY = "businessos-tasks";
const CONVERSATIONS_KEY = "businessos-conversations";
const CUSTOMERS_KEY = "businessos-customers";

const defaultOrders: Order[] = [
  {
    id: 1,
    customer: "أحمد محمد",
    service: "تصميم موقع إلكتروني",
    amount: "2500",
    status: "قيد المتابعة",
    date: "2026-08-25",
  },
  {
    id: 2,
    customer: "سارة علي",
    service: "استشارة تقنية",
    amount: "800",
    status: "جديد",
    date: "2026-08-26",
  },
  {
    id: 3,
    customer: "محمد خالد",
    service: "تطوير نظام",
    amount: "5000",
    status: "مكتمل",
    date: "2026-08-20",
  },
];

const defaultTasks: Task[] = [
  {
    id: 1,
    title: "متابعة طلب أحمد محمد",
    assignee: "محمد",
    dueDate: "2026-08-28",
    priority: "عالية",
    status: "قيد التنفيذ",
  },
  {
    id: 2,
    title: "تحديث قاعدة المعرفة",
    assignee: "سارة",
    dueDate: "2026-08-30",
    priority: "متوسطة",
    status: "جديدة",
  },
  {
    id: 3,
    title: "مراجعة الطلبات الجديدة",
    assignee: "محمد",
    dueDate: "2026-08-27",
    priority: "منخفضة",
    status: "مكتملة",
  },
];

const defaultConversations: Conversation[] = [
  {
    id: 1,
    customer: "أحمد محمد",
    lastMessage: "أريد معرفة تفاصيل الخدمة الجديدة",
    status: "قيد المتابعة",
    unread: true,
  },
  {
    id: 2,
    customer: "سارة علي",
    lastMessage: "كم سعر الباقة الأساسية؟",
    status: "جديدة",
    unread: true,
  },
  {
    id: 3,
    customer: "محمد خالد",
    lastMessage: "شكرًا لك",
    status: "مغلقة",
    unread: false,
  },
];

const defaultCustomers: Customer[] = [
  {
    id: 1,
    name: "أحمد محمد",
  },
  {
    id: 2,
    name: "سارة علي",
  },
  {
    id: 3,
    name: "محمد خالد",
  },
];

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(
      ORDERS_KEY,
      JSON.stringify(orders)
    );

    localStorage.setItem(
      TASKS_KEY,
      JSON.stringify(tasks)
    );

    localStorage.setItem(
      CONVERSATIONS_KEY,
      JSON.stringify(conversations)
    );

    localStorage.setItem(
      CUSTOMERS_KEY,
      JSON.stringify(customers)
    );
  }, [
    orders,
    tasks,
    conversations,
    customers,
    isLoaded,
  ]);

  function loadDashboardData() {
    try {
      const savedOrders = localStorage.getItem(
        ORDERS_KEY
      );

      const savedTasks = localStorage.getItem(
        TASKS_KEY
      );

      const savedConversations =
        localStorage.getItem(CONVERSATIONS_KEY);

      const savedCustomers = localStorage.getItem(
        CUSTOMERS_KEY
      );

      setOrders(
        parseArray<Order>(
          savedOrders,
          defaultOrders
        )
      );

      setTasks(
        parseArray<Task>(
          savedTasks,
          defaultTasks
        )
      );

      setConversations(
        parseArray<Conversation>(
          savedConversations,
          defaultConversations
        )
      );

      setCustomers(
        parseArray<Customer>(
          savedCustomers,
          defaultCustomers
        )
      );
    } catch (error) {
      console.error(
        "حدث خطأ أثناء تحميل بيانات لوحة التحكم:",
        error
      );

      setOrders(defaultOrders);
      setTasks(defaultTasks);
      setConversations(defaultConversations);
      setCustomers(defaultCustomers);
    }

    setIsLoaded(true);
  }

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "جديد" ||
          order.status === "قيد المتابعة"
      ),
    [orders]
  );

  const newOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status === "جديد"
      ),
    [orders]
  );

  const unreadConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) => conversation.unread
      ),
    [conversations]
  );

  const activeTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === "جديدة" ||
          task.status === "قيد التنفيذ"
      ),
    [tasks]
  );

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const dueTodayTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.dueDate === today &&
          task.status !== "مكتملة"
      ),
    [tasks, today]
  );

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        return (
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
        );
      })
      .slice(0, 5);
  }, [orders]);

  if (!isLoaded) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <p className="text-sm text-slate-500">
          جاري تحميل لوحة التحكم...
        </p>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-8 py-5">
          <div>
            <p className="text-sm font-medium text-blue-600">
              BusinessOS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              لوحة التحكم
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              نظرة عامة على نشاط شركتك وأهم العمليات.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 sm:block">
              النظام متصل
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              م
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
        <section className="mb-8 overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              منصة إدارة الأعمال الذكية
            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              مرحبًا بك في BusinessOS 👋
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              أدر العملاء والطلبات والمهام والمحادثات
              وقاعدة المعرفة من مكان واحد، واستفد من
              مساعد الذكاء الاصطناعي لتحسين إدارة عملك.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/ai"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                فتح مساعد AI
              </Link>

              <Link
                href="/customers"
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                عرض العملاء
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="إجمالي العملاء"
            value={customers.length}
            description="العملاء المسجلون في النظام"
            icon="👥"
          />

          <StatCard
            title="الطلبات النشطة"
            value={activeOrders.length}
            description={`${newOrders.length} طلب جديد`}
            icon="📦"
          />

          <StatCard
            title="المحادثات"
            value={conversations.length}
            description={`${unreadConversations.length} غير مقروءة`}
            icon="💬"
          />

          <StatCard
            title="المهام النشطة"
            value={activeTasks.length}
            description={`${dueTodayTasks.length} مستحقة اليوم`}
            icon="✓"
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  آخر الطلبات
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  أحدث العمليات داخل النظام
                </p>
              </div>

              <Link
                href="/orders"
                className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
              >
                عرض الكل
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {recentOrders.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    لا توجد طلبات حتى الآن.
                  </p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <OrderItem
                    key={order.id}
                    customer={order.customer}
                    request={order.service}
                    status={order.status}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-lg text-white">
                ✦
              </div>

              <div>
                <h3 className="font-bold">
                  مساعد الذكاء الاصطناعي
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  BusinessOS AI
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold">
                المساعد جاهز للعمل 🤖
              </p>

              <p className="mt-2 text-xs leading-6 text-slate-500">
                المساعد متصل بقاعدة المعرفة ويمكنه
                استخدام معلومات الخدمات والأسعار
                والسياسات للإجابة عن الأسئلة.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span className="text-xs text-slate-500">
                حالة النظام
              </span>

              <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                متصل
              </span>
            </div>

            <Link
              href="/ai"
              className="mt-5 block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              فتح المساعد
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <QuickAction
            href="/customers"
            icon="👥"
            title="إدارة العملاء"
            description="عرض وتنظيم بيانات العملاء"
          />

          <QuickAction
            href="/tasks"
            icon="✓"
            title="متابعة المهام"
            description="راجع المهام والمواعيد القادمة"
          />

          <QuickAction
            href="/knowledge"
            icon="🧠"
            title="قاعدة المعرفة"
            description="حدّث معلومات شركتك"
          />
        </section>
      </div>
    </main>
  );
}

function parseArray<T>(
  value: string | null,
  fallback: T[]
): T[] {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500">
        {description}
      </p>
    </div>
  );
}

function OrderItem({
  customer,
  request,
  status,
}: {
  customer: string;
  request: string;
  status: OrderStatus;
}) {
  const statusClasses: Record<
    OrderStatus,
    string
  > = {
    جديد: "bg-blue-50 text-blue-700",
    "قيد المتابعة":
      "bg-amber-50 text-amber-700",
    مكتمل:
      "bg-emerald-50 text-emerald-700",
    ملغي:
      "bg-red-50 text-red-700",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
          {customer.charAt(0)}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {customer}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {request}
          </p>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${statusClasses[status]}`}
      >
        {status}
      </span>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg transition group-hover:bg-slate-900 group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-5 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        {description}
      </p>

      <p className="mt-4 text-xs font-semibold text-blue-600">
        فتح القسم ←
      </p>
    </Link>
  );
}