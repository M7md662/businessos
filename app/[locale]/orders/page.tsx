"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Trash2,
  X,
  Clock3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type OrderStatus = "جديد" | "قيد المتابعة" | "مكتمل" | "ملغي";

type Customer = {
  id: string;
  name: string;
};

type Order = {
  id: string;
  customerId: string | null;
  customer: string;
  service: string;
  amount: string;
  status: OrderStatus;
  date: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<OrderStatus>("جديد");

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadOrders() {
    try {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("يجب تسجيل الدخول أولًا.");
        setIsLoaded(true);
        return;
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (membershipError) {
        console.error("Company membership error:", membershipError);
        setError("تعذر تحديد الشركة الخاصة بحسابك.");
        setIsLoaded(true);
        return;
      }

      if (!membership?.company_id) {
        setError("لا توجد شركة مرتبطة بهذا الحساب.");
        setIsLoaded(true);
        return;
      }

      const currentCompanyId = membership.company_id;

      setCompanyId(currentCompanyId);

      const { data: customersData, error: customersError } =
        await supabase
          .from("customers")
          .select("id, name")
          .eq("company_id", currentCompanyId)
          .order("created_at", { ascending: false });

      if (customersError) {
        console.error("Customers fetch error:", customersError);
        setError("حدث خطأ أثناء تحميل العملاء.");
        setIsLoaded(true);
        return;
      }

      setCustomers(
        (customersData || []).map((customer) => ({
          id: String(customer.id),
          name: customer.name || "عميل غير محدد",
        }))
      );

      const { data, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id, customer_id, customer_name, service, total, status, created_at"
        )
        .eq("company_id", currentCompanyId)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Orders fetch error:", ordersError);
        setError("حدث خطأ أثناء تحميل الطلبات.");
        setIsLoaded(true);
        return;
      }

      const formattedOrders: Order[] = (data || []).map((order) => ({
        id: String(order.id),
        customerId: order.customer_id
          ? String(order.customer_id)
          : null,
        customer: order.customer_name || "عميل غير محدد",
        service: order.service || "",
        amount:
          order.total !== null && order.total !== undefined
            ? String(order.total)
            : "",
        status: isValidOrderStatus(order.status)
          ? order.status
          : "جديد",
        date: order.created_at
          ? new Date(order.created_at).toISOString().split("T")[0]
          : "",
      }));

      setOrders(formattedOrders);
    } catch (error) {
      console.error("حدث خطأ أثناء تحميل الطلبات:", error);
      setError("حدث خطأ أثناء تحميل الطلبات.");
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function addOrder() {
    if (!customerId) {
      alert("يرجى اختيار العميل.");
      return;
    }

    if (!service.trim()) {
      alert("يرجى إدخال الخدمة.");
      return;
    }

    if (!companyId) {
      alert("لم يتم العثور على الشركة الخاصة بحسابك.");
      return;
    }

    const selectedCustomer = customers.find(
      (customer) => customer.id === customerId
    );

    if (!selectedCustomer) {
      alert("العميل المحدد غير موجود.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const parsedAmount = amount.trim() ? Number(amount) : 0;

      if (
        amount.trim() &&
        (Number.isNaN(parsedAmount) || parsedAmount < 0)
      ) {
        alert("يرجى إدخال مبلغ صحيح.");
        setSaving(false);
        return;
      }

      const { data, error: insertError } = await supabase
        .from("orders")
        .insert({
          company_id: companyId,
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          service: service.trim(),
          total: parsedAmount,
          status,
        })
        .select(
          "id, customer_id, customer_name, service, total, status, created_at"
        )
        .single();

      if (insertError) {
        console.error("Order insert error:", insertError);
        setError("حدث خطأ أثناء حفظ الطلب.");
        return;
      }

      if (data) {
        const newOrder: Order = {
          id: String(data.id),
          customerId: data.customer_id
            ? String(data.customer_id)
            : selectedCustomer.id,
          customer: data.customer_name || selectedCustomer.name,
          service: data.service || service.trim(),
          amount:
            data.total !== null && data.total !== undefined
              ? String(data.total)
              : "",
          status: isValidOrderStatus(data.status)
            ? data.status
            : status,
          date: data.created_at
            ? new Date(data.created_at).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        };

        setOrders((currentOrders) => [newOrder, ...currentOrders]);
      }

      setCustomerId("");
      setService("");
      setAmount("");
      setStatus("جديد");
      setShowForm(false);
    } catch (error) {
      console.error("حدث خطأ أثناء إضافة الطلب:", error);
      setError("حدث خطأ أثناء إضافة الطلب.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(id: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا الطلب؟"
    );

    if (!confirmed) return;

    try {
      setError("");

      const { error: deleteError } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Order delete error:", deleteError);
        setError("حدث خطأ أثناء حذف الطلب.");
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== id)
      );
    } catch (error) {
      console.error("حدث خطأ أثناء حذف الطلب:", error);
      setError("حدث خطأ أثناء حذف الطلب.");
    }
  }

  const newOrders = orders.filter(
    (order) => order.status === "جديد"
  );

  const activeOrders = orders.filter(
    (order) => order.status === "قيد المتابعة"
  );

  const completedOrders = orders.filter(
    (order) => order.status === "مكتمل"
  );

  const cancelledOrders = orders.filter(
    (order) => order.status === "ملغي"
  );

  if (!isLoaded) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[calc(100vh-40px)] items-center justify-center rounded-[24px] bg-[#f8f8f8]"
      >
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
          جاري تحميل الطلبات...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-[calc(100vh-40px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <header className="rounded-[24px] bg-white px-5 py-6 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                  <Package className="h-4 w-4" strokeWidth={1.8} />
                </div>

                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  BusinessOS
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                الطلبات
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                إدارة طلبات العملاء ومتابعة حالة كل طلب من مكان واحد.
              </p>
            </div>

            <button
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4" />
                  إغلاق
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  إضافة طلب
                </>
              )}
            </button>
          </div>
        </header>

        <div className="mt-5 space-y-5">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-white p-4 text-sm text-red-600 shadow-[0_5px_25px_rgba(0,0,0,.03)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Order Form */}
          {showForm && (
            <section className="rounded-[24px] bg-white p-5 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                    New Order
                  </p>

                  <h2 className="mt-2 text-lg font-bold">
                    إضافة طلب جديد
                  </h2>

                  <p className="mt-1 text-xs text-neutral-500">
                    أدخل البيانات الأساسية للطلب.
                  </p>
                </div>

                <button
                  onClick={() => setShowForm(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 text-neutral-400 transition hover:bg-neutral-100 hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FormFieldSelect
                  label="اسم العميل"
                  value={customerId}
                  onChange={setCustomerId}
                  options={customers.map((customer) => ({
                    value: customer.id,
                    label: customer.name,
                  }))}
                  placeholder="اختر العميل"
                />

                <FormField
                  label="الخدمة"
                  value={service}
                  onChange={setService}
                  placeholder="مثال: تصميم موقع"
                />

                <FormField
                  label="المبلغ"
                  value={amount}
                  onChange={setAmount}
                  placeholder="مثال: 2500"
                  type="number"
                />

                <FormFieldSelect
                  label="الحالة"
                  value={status}
                  onChange={(value) =>
                    setStatus(value as OrderStatus)
                  }
                  options={[
                    { value: "جديد", label: "جديد" },
                    {
                      value: "قيد المتابعة",
                      label: "قيد المتابعة",
                    },
                    { value: "مكتمل", label: "مكتمل" },
                    { value: "ملغي", label: "ملغي" },
                  ]}
                />
              </div>

              {customers.length === 0 && (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  لا يوجد عملاء حاليًا. أضف عميلًا أولًا من صفحة العملاء.
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={addOrder}
                  disabled={saving}
                  className="h-11 rounded-xl bg-black px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "حفظ الطلب"}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="h-11 rounded-xl border border-neutral-200 bg-white px-6 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </section>
          )}

          {/* Statistics */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="إجمالي الطلبات"
              value={orders.length}
              icon={<Package className="h-4 w-4" />}
            />

            <StatCard
              title="طلبات جديدة"
              value={newOrders.length}
              icon={<AlertCircle className="h-4 w-4" />}
            />

            <StatCard
              title="قيد المتابعة"
              value={activeOrders.length}
              icon={<Clock3 className="h-4 w-4" />}
            />

            <StatCard
              title="طلبات مكتملة"
              value={completedOrders.length}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </section>

          {/* Orders */}
          <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.05)]">
            <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                  Orders
                </p>

                <h2 className="mt-2 text-lg font-bold">
                  قائمة الطلبات
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  جميع الطلبات المسجلة في شركتك.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-600">
                  {orders.length} طلب
                </div>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="px-5 py-20 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                  <Package className="h-6 w-6" strokeWidth={1.6} />
                </div>

                <p className="mt-5 font-semibold">
                  لا توجد طلبات حتى الآن
                </p>

                <p className="mt-2 text-sm text-neutral-500">
                  أضف أول طلب لبدء متابعة أعمالك.
                </p>

                <button
                  onClick={() => setShowForm(true)}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة أول طلب
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-[#fafafa]">
                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        العميل
                      </th>

                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        الخدمة
                      </th>

                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        المبلغ
                      </th>

                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        الحالة
                      </th>

                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        التاريخ
                      </th>

                      <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        إجراء
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-neutral-100 last:border-0 transition hover:bg-[#fafafa]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-xs font-bold text-white">
                              {order.customer.charAt(0)}
                            </div>

                            <div>
                              <p className="text-sm font-semibold">
                                {order.customer}
                              </p>

                              <p className="mt-0.5 text-[10px] text-neutral-400">
                                عميل
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-neutral-600">
                          {order.service || "-"}
                        </td>

                        <td className="px-6 py-5">
                          <span className="text-sm font-semibold">
                            {order.amount
                              ? `${order.amount} جنيه`
                              : "-"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="px-6 py-5 text-xs text-neutral-500">
                          {order.date}
                        </td>

                        <td className="px-6 py-5">
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                            title="حذف الطلب"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              strokeWidth={1.8}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Cancelled */}
          {cancelledOrders.length > 0 && (
            <section className="rounded-[24px] bg-white p-5 shadow-[0_10px_45px_rgba(0,0,0,.04)] sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    الطلبات الملغاة
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    الطلبات التي تم إلغاؤها.
                  </p>
                </div>

                <div className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-red-50 px-3 text-sm font-bold text-red-600">
                  {cancelledOrders.length}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function isValidOrderStatus(
  value: string | null
): value is OrderStatus {
  return (
    value === "جديد" ||
    value === "قيد المتابعة" ||
    value === "مكتمل" ||
    value === "ملغي"
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
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

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
          {icon}
        </div>
      </div>
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
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-neutral-100"
      />
    </div>
  );
}

function FormFieldSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-neutral-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-neutral-100"
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const styles: Record<OrderStatus, string> = {
    جديد: "bg-neutral-100 text-neutral-700",
    "قيد المتابعة": "bg-amber-50 text-amber-700",
    مكتمل: "bg-emerald-50 text-emerald-700",
    ملغي: "bg-red-50 text-red-700",
  };

  const dots: Record<OrderStatus, string> = {
    جديد: "bg-black",
    "قيد المتابعة": "bg-amber-500",
    مكتمل: "bg-emerald-500",
    ملغي: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[status]}`}
      />

      {status}
    </span>
  );
}