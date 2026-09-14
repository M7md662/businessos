"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  DollarSign,
  Loader2,
  MessageCircle,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  status: string | null;
  total: number | null;
  created_at: string | null;
};

type Customer = {
  id: string;
  created_at: string | null;
};

type Task = {
  id: string;
  status: string | null;
  priority: string | null;
  created_at: string | null;
};

type Conversation = {
  id: string;
  status: string | null;
  ai_is_lead: boolean | null;
  ai_priority: string | null;
  created_at: string | null;
};

type LoadingState = "loading" | "ready" | "error";

export default function AnalyticsPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);

  const [state, setState] =
    useState<LoadingState>("loading");

  const [errorMessage, setErrorMessage] =
    useState("");

  const text = isEnglish
    ? {
        title: "Analytics",
        subtitle: "A clear overview of your business performance.",
        overview: "Business overview",
        overviewDescription: "Track the most important activity across your workspace.",
        revenue: "Total revenue",
        orders: "Orders",
        customers: "Customers",
        tasks: "Tasks",
        conversations: "Conversations",
        completedTasks: "Completed tasks",
        activeTasks: "Active tasks",
        pendingTasks: "Pending tasks",
        highPriority: "High priority",
        leads: "Potential leads",
        closedConversations: "Closed conversations",
        activeConversations: "Active conversations",
        performance: "Performance",
        performanceDescription: "Key operational indicators based on your current data.",
        taskCompletion: "Task completion",
        conversationResolution: "Conversation resolution",
        leadRate: "Lead rate",
        recentActivity: "Recent activity",
        recentActivityDescription: "A quick view of the latest business records.",
        latestOrder: "Latest order",
        latestCustomer: "Latest customer",
        noData: "No data available yet.",
        loading: "Loading analytics...",
        error: "An error occurred while loading analytics.",
        retry: "Try again",
        connected: "Live data",
        healthy: "Healthy",
      }
    : {
        title: "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a",
        subtitle: "\u0646\u0638\u0631\u0629 \u0648\u0627\u0636\u062d\u0629 \u0639\u0644\u0649 \u0623\u062f\u0627\u0621 \u0623\u0639\u0645\u0627\u0644\u0643 \u0648\u0646\u0634\u0627\u0637 \u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u0639\u0645\u0644.",
        overview: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
        overviewDescription: "\u062a\u0627\u0628\u0639 \u0623\u0647\u0645 \u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062a \u0648\u0627\u0644\u0646\u0634\u0627\u0637 \u062f\u0627\u062e\u0644 \u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u0639\u0645\u0644.",
        revenue: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a",
        orders: "\u0627\u0644\u0637\u0644\u0628\u0627\u062a",
        customers: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621",
        tasks: "\u0627\u0644\u0645\u0647\u0627\u0645",
        conversations: "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a",
        completedTasks: "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0643\u062a\u0645\u0644\u0629",
        activeTasks: "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0646\u0634\u0637\u0629",
        pendingTasks: "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u062c\u062f\u064a\u062f\u0629",
        highPriority: "\u0623\u0648\u0644\u0648\u064a\u0629 \u0639\u0627\u0644\u064a\u0629",
        leads: "\u0639\u0645\u0644\u0627\u0621 \u0645\u062d\u062a\u0645\u0644\u0648\u0646",
        closedConversations: "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0645\u063a\u0644\u0642\u0629",
        activeConversations: "\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629",
        performance: "\u0627\u0644\u0623\u062f\u0627\u0621",
        performanceDescription: "\u0645\u0624\u0634\u0631\u0627\u062a \u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0645\u0628\u0646\u064a\u0629 \u0639\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
        taskCompletion: "\u0625\u0646\u062c\u0627\u0632 \u0627\u0644\u0645\u0647\u0627\u0645",
        conversationResolution: "\u062d\u0644 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a",
        leadRate: "\u0646\u0633\u0628\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u064a\u0646",
        recentActivity: "\u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u0623\u062e\u064a\u0631",
        recentActivityDescription: "\u0646\u0638\u0631\u0629 \u0633\u0631\u064a\u0639\u0629 \u0639\u0644\u0649 \u0623\u062d\u062f\u062b \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0639\u0645\u0644.",
        latestOrder: "\u0623\u062d\u062f\u062b \u0637\u0644\u0628",
        latestCustomer: "\u0623\u062d\u062f\u062b \u0639\u0645\u064a\u0644",
        noData: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u062d\u062a\u0649 \u0627\u0644\u0622\u0646.",
        loading: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a...",
        error: "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a.",
        retry: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
        connected: "\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0628\u0627\u0634\u0631\u0629",
        healthy: "\u062c\u064a\u062f",
      };

  async function loadAnalytics() {
    setState("loading");
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
        throw new Error("User not found");
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
      const membership = memberships?.[0];

      if (!membership?.company_id) {
        throw new Error("Company not found");
      }

      if (!membership?.company_id) {
        throw new Error("Company not found");
      }

      const companyId = membership.company_id;

      const [
        ordersResult,
        customersResult,
        tasksResult,
        conversationsResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, status, total, created_at"
          )
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("customers")
          .select("id, created_at")
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("tasks")
          .select(
            "id, status, priority, created_at"
          )
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("conversations")
          .select(
            "id, status, ai_is_lead, ai_priority, created_at"
          )
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      if (customersResult.error) {
        throw customersResult.error;
      }

      if (tasksResult.error) {
        throw tasksResult.error;
      }

      if (conversationsResult.error) {
        throw conversationsResult.error;
      }

      setOrders(
        (ordersResult.data || []) as Order[]
      );

      setCustomers(
        (customersResult.data || []) as Customer[]
      );

      setTasks(
        (tasksResult.data || []) as Task[]
      );

      setConversations(
        (conversationsResult.data ||
          []) as Conversation[]
      );

      setState("ready");
    } catch (error) {
      console.error(
        "Analytics loading error:",
        error
      );

      setErrorMessage(text.error);
      setState("error");
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const metrics = useMemo(() => {
    const revenue = orders.reduce(
      (sum, order) =>
        sum + (Number(order.total) || 0),
      0
    );

    const completedTasks = tasks.filter(
      (task) =>
        task.status === "Ù…ÙƒØªÙ…Ù„Ø©" ||
        task.status === "completed" ||
        task.status === "Completed"
    ).length;

    const activeTasks = tasks.filter(
      (task) =>
        task.status === "Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°" ||
        task.status === "in_progress" ||
        task.status === "In Progress"
    ).length;

    const pendingTasks = tasks.filter(
      (task) =>
        task.status === "Ø¬Ø¯ÙŠØ¯Ø©" ||
        task.status === "new" ||
        task.status === "New"
    ).length;

    const highPriorityTasks = tasks.filter(
      (task) =>
        task.priority === "Ø¹Ø§Ù„ÙŠØ©" ||
        task.priority === "high" ||
        task.priority === "High"
    ).length;

    const closedConversations =
      conversations.filter(
        (conversation) =>
          conversation.status === "Ù…ØºÙ„Ù‚Ø©" ||
          conversation.status === "closed" ||
          conversation.status === "Closed"
      ).length;

    const leads = conversations.filter(
      (conversation) =>
        conversation.ai_is_lead === true
    ).length;

    const taskCompletion =
      tasks.length > 0
        ? Math.round(
            (completedTasks / tasks.length) *
              100
          )
        : 0;

    const conversationResolution =
      conversations.length > 0
        ? Math.round(
            (closedConversations /
              conversations.length) *
              100
          )
        : 0;

    const leadRate =
      conversations.length > 0
        ? Math.round(
            (leads / conversations.length) *
              100
          )
        : 0;

    return {
      revenue,
      completedTasks,
      activeTasks,
      pendingTasks,
      highPriorityTasks,
      closedConversations,
      leads,
      taskCompletion,
      conversationResolution,
      leadRate,
    };
  }, [orders, tasks, conversations]);

  const recentOrders = orders.slice(0, 5);
  const recentCustomers = customers.slice(0, 5);
  const recentTasks = tasks.slice(0, 5);
  const recentConversations =
    conversations.slice(0, 5);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat(
      isEnglish ? "en-US" : "ar-EG",
      {
        style: "currency",
        currency: "EGP",
        maximumFractionDigits: 0,
      }
    ).format(value);
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "â€”";
    }

    return new Intl.DateTimeFormat(
      isEnglish ? "en-US" : "ar-EG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(new Date(value));
  }

  if (state === "loading") {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[#f3f3f3] text-[#111]"
      >
        <div className="flex flex-col items-center rounded-[24px] bg-white px-10 py-9 text-center shadow-[0_10px_45px_rgba(0,0,0,.06)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <BarChart3 className="h-5 w-5" />
          </div>

          <Loader2 className="mb-3 h-5 w-5 animate-spin text-neutral-400" />

          <p className="text-sm font-medium text-neutral-500">
            {text.loading}
          </p>
        </div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[#f3f3f3] px-4 text-[#111]"
      >
        <div className="w-full max-w-lg rounded-[24px] bg-white p-8 text-center shadow-[0_10px_45px_rgba(0,0,0,.06)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-xl font-bold">
            {text.error}
          </h1>

          <button
            onClick={loadAnalytics}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-black px-5 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            {text.retry}
          </button>
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
                  <BarChart3 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                      {text.title}
                    </h1>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {text.connected}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 sm:text-sm">
                    {text.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2">
                <Activity className="h-4 w-4 text-neutral-500" />

                <span className="text-xs font-medium text-neutral-500">
                  {text.healthy}
                </span>
              </div>
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            <section className="rounded-[20px] border border-neutral-100 bg-white shadow-sm">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                    <TrendingUp className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-base font-bold">
                      {text.overview}
                    </h2>

                    <p className="mt-1 text-xs leading-6 text-neutral-500">
                      {text.overviewDescription}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title={text.revenue}
                    value={formatCurrency(
                      metrics.revenue
                    )}
                    icon={
                      <DollarSign className="h-4 w-4" />
                    }
                  />

                  <MetricCard
                    title={text.orders}
                    value={orders.length}
                    icon={
                      <ShoppingBag className="h-4 w-4" />
                    }
                  />

                  <MetricCard
                    title={text.customers}
                    value={customers.length}
                    icon={
                      <Users className="h-4 w-4" />
                    }
                  />

                  <MetricCard
                    title={text.conversations}
                    value={conversations.length}
                    icon={
                      <MessageCircle className="h-4 w-4" />
                    }
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MiniMetric
                title={text.completedTasks}
                value={metrics.completedTasks}
                total={tasks.length}
                icon={
                  <CheckCircle2 className="h-4 w-4" />
                }
                percentage={
                  metrics.taskCompletion
                }
              />

              <MiniMetric
                title={text.activeTasks}
                value={metrics.activeTasks}
                total={tasks.length}
                icon={
                  <Clock3 className="h-4 w-4" />
                }
              />

              <MiniMetric
                title={text.leads}
                value={metrics.leads}
                total={conversations.length}
                icon={
                  <Users className="h-4 w-4" />
                }
                percentage={metrics.leadRate}
                type="green"
              />

              <MiniMetric
                title={text.highPriority}
                value={metrics.highPriorityTasks}
                total={tasks.length}
                icon={
                  <AlertTriangle className="h-4 w-4" />
                }
                type="amber"
              />
            </section>

            <section className="rounded-[20px] border border-neutral-100 bg-white shadow-sm">
              <div className="border-b border-neutral-100 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                    <BarChart3 className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-base font-bold">
                      {text.performance}
                    </h2>

                    <p className="mt-1 text-xs text-neutral-500">
                      {text.performanceDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-3">
                <ProgressCard
                  title={text.taskCompletion}
                  value={metrics.taskCompletion}
                />

                <ProgressCard
                  title={
                    text.conversationResolution
                  }
                  value={
                    metrics.conversationResolution
                  }
                />

                <ProgressCard
                  title={text.leadRate}
                  value={metrics.leadRate}
                />
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <DataPanel
                title={text.recentActivity}
                description={
                  text.recentActivityDescription
                }
                icon={
                  <ShoppingBag className="h-4 w-4" />
                }
              >
                <div className="space-y-2">
                  {recentOrders.length === 0 ? (
                    <EmptyRow text={text.noData} />
                  ) : (
                    recentOrders.map((order) => (
                      <ActivityRow
                        key={order.id}
                        title={`${text.latestOrder} #${String(
                          order.id
                        ).slice(0, 8)}`}
                        date={formatDate(
                          order.created_at
                        )}
                        value={formatCurrency(
                          Number(order.total) || 0
                        )}
                        icon={
                          <ShoppingBag className="h-3.5 w-3.5" />
                        }
                      />
                    ))
                  )}
                </div>
              </DataPanel>

              <DataPanel
                title={text.customers}
                description={
                  text.recentActivityDescription
                }
                icon={
                  <Users className="h-4 w-4" />
                }
              >
                <div className="space-y-2">
                  {recentCustomers.length === 0 ? (
                    <EmptyRow text={text.noData} />
                  ) : (
                    recentCustomers.map(
                      (customer) => (
                        <ActivityRow
                          key={customer.id}
                          title={text.latestCustomer}
                          date={formatDate(
                            customer.created_at
                          )}
                          value={`#${String(
                            customer.id
                          ).slice(0, 8)}`}
                          icon={
                            <Users className="h-3.5 w-3.5" />
                          }
                        />
                      )
                    )
                  )}
                </div>
              </DataPanel>

              <DataPanel
                title={text.tasks}
                description={
                  text.recentActivityDescription
                }
                icon={
                  <CheckCircle2 className="h-4 w-4" />
                }
              >
                <div className="space-y-2">
                  {recentTasks.length === 0 ? (
                    <EmptyRow text={text.noData} />
                  ) : (
                    recentTasks.map((task) => (
                      <ActivityRow
                        key={task.id}
                        title={
                          task.status ||
                          text.pendingTasks
                        }
                        date={formatDate(
                          task.created_at
                        )}
                        value={
                          task.priority || "â€”"
                        }
                        icon={
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        }
                      />
                    ))
                  )}
                </div>
              </DataPanel>

              <DataPanel
                title={text.conversations}
                description={
                  text.recentActivityDescription
                }
                icon={
                  <MessageCircle className="h-4 w-4" />
                }
              >
                <div className="space-y-2">
                  {recentConversations.length === 0 ? (
                    <EmptyRow text={text.noData} />
                  ) : (
                    recentConversations.map(
                      (conversation) => (
                        <ActivityRow
                          key={conversation.id}
                          title={
                            conversation.status ||
                            text.conversations
                          }
                          date={formatDate(
                            conversation.created_at
                          )}
                          value={
                            conversation.ai_is_lead
                              ? text.leads
                              : conversation.ai_priority ||
                                "â€”"
                          }
                          icon={
                            <MessageCircle className="h-3.5 w-3.5" />
                          }
                        />
                      )
                    )
                  )}
                </div>
              </DataPanel>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
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

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  title,
  value,
  total,
  icon,
  percentage,
  type = "default",
}: {
  title: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  percentage?: number;
  type?: "default" | "amber" | "green";
}) {
  const iconStyles = {
    default: "bg-neutral-100 text-neutral-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_8px_35px_rgba(0,0,0,.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">
            {title}
          </p>

          <div className="mt-3 flex items-end gap-2">
            <p className="text-3xl font-bold tracking-tight">
              {value}
            </p>

            <span className="mb-1 text-[10px] text-neutral-400">
              / {total}
            </span>
          </div>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconStyles[type]}`}
        >
          {icon}
        </div>
      </div>

      {percentage !== undefined && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-black transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, percentage)
                )}%`,
              }}
            />
          </div>

          <p className="mt-2 text-[10px] font-medium text-neutral-400">
            {percentage}%
          </p>
        </div>
      )}
    </div>
  );
}

function ProgressCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-[#fafafa] p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold text-neutral-600">
          {title}
        </p>

        <span className="text-lg font-bold">
          {value}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, value)
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function DataPanel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
          {icon}
        </div>

        <div>
          <h2 className="text-sm font-bold">
            {title}
          </h2>

          <p className="mt-1 text-[10px] leading-5 text-neutral-400">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function ActivityRow({
  title,
  date,
  value,
  icon,
}: {
  title: string;
  date: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-[#fafafa] px-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-neutral-700">
          {title}
        </p>

        <p className="mt-1 text-[9px] text-neutral-400">
          {date}
        </p>
      </div>

      <span className="max-w-28 truncate rounded-full bg-white px-2.5 py-1 text-[9px] font-medium text-neutral-500 shadow-sm">
        {value}
      </span>
    </div>
  );
}

function EmptyRow({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 px-4 py-8 text-center text-xs text-neutral-400">
      {text}
    </div>
  );
}



