"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Users,
  UserPlus,
  Trash2,
  X,
  Mail,
  Phone,
  Search,
  MessageSquare,
  ShoppingBag,
  CheckSquare,
  ArrowLeft,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Role = "owner" | "employee";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes?: string | null;
  created_at?: string;
};

type Conversation = {
  id: string;
  channel: string;
  status: string;
  last_message: string | null;
  last_message_at: string | null;
  ai_summary: string | null;
  ai_intent: string | null;
  ai_priority: string | null;
  ai_is_lead: boolean | null;
};

type Order = {
  id: string;
  total: number;
  status: string;
  service: string | null;
  notes: string | null;
  created_at: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
};

export default function CustomersPage() {
  const t = useTranslations("customers");
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [isLoaded, setIsLoaded] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isOwner = role === "owner";

  async function loadCustomers() {
    try {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(t("loginRequired"));
        setIsLoaded(true);
        return;
      }

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id, role, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

      if (membershipError) {
        console.error("Company membership error:", membershipError);
        setError(t("companyError"));
        setIsLoaded(true);
        return;
      }

      const membership = memberships?.[0];

      if (!membership?.company_id) {
        setError(t("companyNotFound"));
        setIsLoaded(true);
        return;
      }

      setCompanyId(membership.company_id);

      const normalizedRole =
        membership.role === "owner" ? "owner" : "employee";

      setRole(normalizedRole);

      const { data, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email, notes, created_at")
        .eq("company_id", membership.company_id)
        .order("created_at", { ascending: false });

      if (customersError) {
        console.error("Customers fetch error:", customersError);
        setError(t("loadError"));
        setIsLoaded(true);
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error("Customers loading error:", error);
      setError(t("loadError"));
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomerDetails(customer: Customer) {
    if (!companyId) return;

    setSelectedCustomer(customer);
    setDetailsLoading(true);
    setError("");

    try {
      const [conversationResult, orderResult, taskResult] =
        await Promise.all([
          supabase
            .from("conversations")
            .select(
              "id, channel, status, last_message, last_message_at, ai_summary, ai_intent, ai_priority, ai_is_lead"
            )
            .eq("company_id", companyId)
            .eq("customer_id", customer.id)
            .order("last_message_at", { ascending: false }),

          supabase
            .from("orders")
            .select(
              "id, total, status, service, notes, created_at"
            )
            .eq("company_id", companyId)
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("tasks")
            .select(
              "id, title, description, status, priority, due_date, created_at"
            )
            .eq("company_id", companyId)
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false }),
        ]);

      if (conversationResult.error) {
        console.error(
          "Customer conversations error:",
          conversationResult.error
        );
      }

      if (orderResult.error) {
        console.error("Customer orders error:", orderResult.error);
      }

      if (taskResult.error) {
        console.error("Customer tasks error:", taskResult.error);
      }

      setConversations(conversationResult.data || []);
      setOrders(orderResult.data || []);
      setTasks(taskResult.data || []);
    } catch (error) {
      console.error("Customer details error:", error);
      setError(
        isEnglish
          ? "Unable to load customer details."
          : "تعذر تحميل تفاصيل العميل."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function addCustomer() {
    if (!name.trim()) {
      alert(t("enterName"));
      return;
    }

    if (!companyId) {
      alert(t("companyNotFound"));
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { data, error: insertError } = await supabase
        .from("customers")
        .insert({
          company_id: companyId,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
        })
        .select("id, name, phone, email, notes, created_at")
        .single();

      if (insertError) {
        console.error("Customer insert error:", insertError);
        setError(t("saveError"));
        return;
      }

      if (data) {
        setCustomers((current) => [data, ...current]);
      }

      setName("");
      setPhone("");
      setEmail("");
      setShowForm(false);
    } catch (error) {
      console.error("Customer add error:", error);
      setError(t("addError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: string) {
    if (!isOwner) {
      setError(
        isEnglish
          ? "Only the company owner can delete customers."
          : "فقط مالك الشركة يمكنه حذف العملاء."
      );
      return;
    }

    const confirmed = window.confirm(t("deleteConfirm"));

    if (!confirmed) return;

    try {
      setError("");

      const { error: deleteError } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Customer delete error:", deleteError);
        setError(t("deleteError"));
        return;
      }

      setCustomers((current) =>
        current.filter((customer) => customer.id !== id)
      );

      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
        setConversations([]);
        setOrders([]);
        setTasks([]);
      }
    } catch (error) {
      console.error("Customer delete error:", error);
      setError(t("deleteError"));
    }
  }

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  const totalOrderValue = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const activeConversations = conversations.filter(
    (conversation) =>
      conversation.status !== "closed" &&
      conversation.status !== "resolved"
  ).length;

  const openTasks = tasks.filter(
    (task) =>
      task.status !== "completed" &&
      task.status !== "done"
  ).length;

  const directionIcon = isEnglish ? (
    <ArrowRight className="h-4 w-4" />
  ) : (
    <ArrowLeft className="h-4 w-4" />
  );

  if (!isLoaded) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-40px)] items-center justify-center bg-[#f3f3f3]"
      >
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
          {t("loading")}
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-[calc(100vh-40px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto max-w-[1600px]">
        <header className="rounded-[24px] bg-white px-5 py-6 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                  <Users className="h-4 w-4" />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  BusinessOS CRM
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                {t("title")}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                {isEnglish
                  ? "Manage customers and see their complete business relationship in one place."
                  : "إدارة العملاء وعرض العلاقة الكاملة مع كل عميل في مكان واحد."}
              </p>
            </div>

            <button
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  {t("addCustomer")}
                </>
              )}
            </button>
          </div>
        </header>

        <div className="mt-5 space-y-5">
          {error && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-red-600 shadow-[0_5px_25px_rgba(0,0,0,.03)]">
              {error}
            </div>
          )}

          {showForm && (
            <section className="rounded-[24px] bg-white p-5 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:p-7">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                  CRM
                </p>

                <h2 className="mt-2 text-lg font-bold">
                  {t("newCustomer")}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  {t("newCustomerDescription")}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  label={t("customerName")}
                  value={name}
                  onChange={setName}
                  placeholder={t("namePlaceholder")}
                />

                <FormField
                  label={t("phone")}
                  value={phone}
                  onChange={setPhone}
                  placeholder={t("phonePlaceholder")}
                  type="tel"
                />

                <FormField
                  label={t("email")}
                  value={email}
                  onChange={setEmail}
                  placeholder={t("emailPlaceholder")}
                  type="email"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={addCustomer}
                  disabled={saving}
                  className="h-11 rounded-xl bg-black px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving ? t("saving") : t("saveCustomer")}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  className="h-11 rounded-xl border border-neutral-200 bg-white px-6 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
                >
                  {t("cancel")}
                </button>
              </div>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title={isEnglish ? "Customers" : "العملاء"}
              value={customers.length}
              icon={<Users className="h-4 w-4" />}
            />

            <MetricCard
              title={isEnglish ? "Conversations" : "المحادثات"}
              value={
                selectedCustomer
                  ? conversations.length
                  : customers.length > 0
                    ? "—"
                    : 0
              }
              icon={<MessageSquare className="h-4 w-4" />}
            />

            <MetricCard
              title={isEnglish ? "Orders" : "الطلبات"}
              value={selectedCustomer ? orders.length : "—"}
              icon={<ShoppingBag className="h-4 w-4" />}
            />

            <MetricCard
              title={isEnglish ? "Open Tasks" : "المهام المفتوحة"}
              value={selectedCustomer ? openTasks : "—"}
              icon={<CheckSquare className="h-4 w-4" />}
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.05)]">
              <div className="border-b border-neutral-100 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                      CRM
                    </p>

                    <h2 className="mt-2 text-lg font-bold">
                      {isEnglish ? "Customers" : "العملاء"}
                    </h2>
                  </div>

                  <span className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-600">
                    {filteredCustomers.length}
                  </span>
                </div>

                <div className="relative mt-5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 rtl:right-3 rtl:left-auto" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      isEnglish
                        ? "Search customers..."
                        : "ابحث عن عميل..."
                    }
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-[#fafafa] px-10 text-sm outline-none transition focus:border-black focus:bg-white"
                  />
                </div>
              </div>

              <div className="max-h-[650px] overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="px-5 py-16 text-center">
                    <Users className="mx-auto h-7 w-7 text-neutral-300" />

                    <p className="mt-4 text-sm font-semibold">
                      {isEnglish
                        ? "No customers found"
                        : "لا يوجد عملاء"}
                    </p>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => {
                    const selected =
                      selectedCustomer?.id === customer.id;

                    return (
                      <button
                        key={customer.id}
                        onClick={() =>
                          loadCustomerDetails(customer)
                        }
                        className={`w-full border-b border-neutral-100 p-4 text-start transition ${
                          selected
                            ? "bg-black text-white"
                            : "bg-white hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                              selected
                                ? "bg-white text-black"
                                : "bg-black text-white"
                            }`}
                          >
                            {customer.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {customer.name}
                            </p>

                            <p
                              className={`mt-1 truncate text-xs ${
                                selected
                                  ? "text-neutral-300"
                                  : "text-neutral-400"
                              }`}
                            >
                              {customer.email ||
                                customer.phone ||
                                (isEnglish
                                  ? "No contact information"
                                  : "لا توجد بيانات اتصال")}
                            </p>
                          </div>

                          {directionIcon}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="min-w-0">
              {!selectedCustomer ? (
                <div className="flex min-h-[500px] items-center justify-center rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.05)]">
                  <div className="max-w-sm px-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white">
                      <Users className="h-7 w-7" />
                    </div>

                    <h2 className="mt-5 text-xl font-bold">
                      {isEnglish
                        ? "Select a customer"
                        : "اختر عميلًا"}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      {isEnglish
                        ? "Select a customer to view conversations, orders, tasks and AI insights."
                        : "اختر عميلًا لعرض المحادثات والطلبات والمهام وتحليلات الذكاء الاصطناعي."}
                    </p>
                  </div>
                </div>
              ) : (
                <CustomerDetails
                  customer={selectedCustomer}
                  conversations={conversations}
                  orders={orders}
                  tasks={tasks}
                  loading={detailsLoading}
                  totalOrderValue={totalOrderValue}
                  activeConversations={activeConversations}
                  isEnglish={isEnglish}
                  isOwner={isOwner}
                  onDelete={() =>
                    deleteCustomer(selectedCustomer.id)
                  }
                  onClose={() => {
                    setSelectedCustomer(null);
                    setConversations([]);
                    setOrders([]);
                    setTasks([]);
                  }}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CustomerDetails({
  customer,
  conversations,
  orders,
  tasks,
  loading,
  totalOrderValue,
  activeConversations,
  isEnglish,
  isOwner,
  onDelete,
  onClose,
}: {
  customer: Customer;
  conversations: Conversation[];
  orders: Order[];
  tasks: Task[];
  loading: boolean;
  totalOrderValue: number;
  activeConversations: number;
  isEnglish: boolean;
  isOwner: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[24px] bg-white p-5 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-xl font-bold text-white">
              {customer.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                Customer 360
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {customer.name}
              </h2>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
                {customer.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span dir="ltr">{customer.phone}</span>
                  </span>
                )}

                {customer.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-black"
              title={isEnglish ? "Close" : "إغلاق"}
            >
              <X className="h-4 w-4" />
            </button>

            {isOwner && (
              <button
                onClick={onDelete}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 transition hover:border-black hover:bg-black hover:text-white"
                title={isEnglish ? "Delete" : "حذف"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {customer.notes && (
          <div className="mt-6 rounded-2xl bg-[#f7f7f7] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              {isEnglish ? "Notes" : "ملاحظات"}
            </p>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {customer.notes}
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MiniStat
          title={isEnglish ? "Active Conversations" : "المحادثات النشطة"}
          value={activeConversations}
        />

        <MiniStat
          title={isEnglish ? "Orders" : "الطلبات"}
          value={orders.length}
        />

        <MiniStat
          title={isEnglish ? "Order Value" : "قيمة الطلبات"}
          value={`${totalOrderValue.toLocaleString()} EGP`}
        />
      </section>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.05)]">
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
            {isEnglish
              ? "Loading customer data..."
              : "جاري تحميل بيانات العميل..."}
          </div>
        </div>
      ) : (
        <>
          <DataSection
            title={isEnglish ? "Conversations" : "المحادثات"}
            icon={<MessageSquare className="h-4 w-4" />}
            count={conversations.length}
          >
            {conversations.length === 0 ? (
              <EmptySection
                text={
                  isEnglish
                    ? "No conversations for this customer yet."
                    : "لا توجد محادثات لهذا العميل حتى الآن."
                }
              />
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="border-b border-neutral-100 p-5 last:border-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-black px-2.5 py-1 text-[10px] font-semibold text-white">
                          {conversation.channel}
                        </span>

                        <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                          {conversation.status}
                        </span>

                        {conversation.ai_is_lead && (
                          <span className="rounded-lg border border-black px-2.5 py-1 text-[10px] font-semibold">
                            Lead
                          </span>
                        )}
                      </div>

                      {conversation.last_message && (
                        <p className="mt-3 text-sm leading-6 text-neutral-700">
                          {conversation.last_message}
                        </p>
                      )}

                      {conversation.ai_summary && (
                        <div className="mt-3 rounded-xl bg-[#f7f7f7] p-3">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Summary
                          </div>

                          <p className="mt-2 text-xs leading-5 text-neutral-600">
                            {conversation.ai_summary}
                          </p>
                        </div>
                      )}
                    </div>

                    {conversation.last_message_at && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-neutral-400">
                        <Clock className="h-3 w-3" />
                        {new Date(
                          conversation.last_message_at
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {(conversation.ai_intent ||
                    conversation.ai_priority) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {conversation.ai_intent && (
                        <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] text-neutral-600">
                          {isEnglish ? "Intent" : "النية"}:{" "}
                          <strong>
                            {conversation.ai_intent}
                          </strong>
                        </span>
                      )}

                      {conversation.ai_priority && (
                        <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] text-neutral-600">
                          {isEnglish ? "Priority" : "الأولوية"}:{" "}
                          <strong>
                            {conversation.ai_priority}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </DataSection>

          <DataSection
            title={isEnglish ? "Orders" : "الطلبات"}
            icon={<ShoppingBag className="h-4 w-4" />}
            count={orders.length}
          >
            {orders.length === 0 ? (
              <EmptySection
                text={
                  isEnglish
                    ? "No orders for this customer yet."
                    : "لا توجد طلبات لهذا العميل حتى الآن."
                }
              />
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 border-b border-neutral-100 p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {order.service ||
                        (isEnglish ? "Order" : "طلب")}
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                      {new Date(
                        order.created_at
                      ).toLocaleDateString()}{" "}
                      · {order.status}
                    </p>

                    {order.notes && (
                      <p className="mt-2 text-xs text-neutral-500">
                        {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-sm font-bold">
                    {Number(order.total || 0).toLocaleString()} EGP
                  </div>
                </div>
              ))
            )}
          </DataSection>

          <DataSection
            title={isEnglish ? "Tasks" : "المهام"}
            icon={<CheckSquare className="h-4 w-4" />}
            count={tasks.length}
          >
            {tasks.length === 0 ? (
              <EmptySection
                text={
                  isEnglish
                    ? "No tasks for this customer yet."
                    : "لا توجد مهام لهذا العميل حتى الآن."
                }
              />
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="border-b border-neutral-100 p-5 last:border-0"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {task.title}
                      </p>

                      {task.description && (
                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                        {task.status}
                      </span>

                      <span className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  {task.due_date && (
                    <p className="mt-3 flex items-center gap-1.5 text-[10px] text-neutral-400">
                      <Clock className="h-3 w-3" />
                      {isEnglish ? "Due" : "موعد التنفيذ"}:{" "}
                      {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </DataSection>
        </>
      )}
    </div>
  );
}

function DataSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.05)]">
      <div className="flex items-center justify-between border-b border-neutral-100 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
            {icon}
          </div>

          <h3 className="text-sm font-bold">{title}</h3>
        </div>

        <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-500">
          {count}
        </span>
      </div>

      {children}
    </section>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="p-10 text-center text-sm text-neutral-400">
      {text}
    </div>
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
    <div className="rounded-[20px] bg-white p-5 shadow-[0_8px_35px_rgba(0,0,0,.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-neutral-100 bg-white p-5">
      <p className="text-xs text-neutral-500">{title}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-neutral-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-neutral-100"
      />
    </div>
  );
}
