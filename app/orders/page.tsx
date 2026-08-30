"use client";

import { useEffect, useState } from "react";

type OrderStatus = "جديد" | "قيد المتابعة" | "مكتمل" | "ملغي";

type Order = {
  id: number;
  customer: string;
  service: string;
  amount: string;
  status: OrderStatus;
  date: string;
};

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

const STORAGE_KEY = "businessos-orders";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [customer, setCustomer] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<OrderStatus>("جديد");

  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem(STORAGE_KEY);

      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders);

        if (Array.isArray(parsedOrders)) {
          setOrders(parsedOrders);
        } else {
          setOrders(defaultOrders);
        }
      } else {
        setOrders(defaultOrders);
      }
    } catch (error) {
      console.error("حدث خطأ أثناء تحميل الطلبات:", error);
      setOrders(defaultOrders);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error("حدث خطأ أثناء حفظ الطلبات:", error);
    }
  }, [orders, isLoaded]);

  function addOrder() {
    if (!customer.trim() || !service.trim()) {
      alert("يرجى إدخال اسم العميل والخدمة");
      return;
    }

    const newOrder: Order = {
      id: Date.now(),
      customer: customer.trim(),
      service: service.trim(),
      amount: amount.trim(),
      status,
      date: new Date().toISOString().split("T")[0],
    };

    setOrders((currentOrders) => [
      ...currentOrders,
      newOrder,
    ]);

    setCustomer("");
    setService("");
    setAmount("");
    setStatus("جديد");
    setShowForm(false);
  }

  function deleteOrder(id: number) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا الطلب؟"
    );

    if (!confirmed) return;

    setOrders((currentOrders) =>
      currentOrders.filter((order) => order.id !== id)
    );
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
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <p className="text-sm text-slate-500">
          جاري تحميل الطلبات...
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
              إدارة الطلبات
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              الطلبات
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              إدارة طلبات العملاء ومتابعة حالة كل طلب.
            </p>
          </div>

          <button
            onClick={() => setShowForm((value) => !value)}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + إضافة طلب
          </button>
        </div>
      </header>

      <div className="p-8">
        {showForm && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold">
                إضافة طلب جديد
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                أدخل بيانات الطلب الأساسية.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <FormField
                label="اسم العميل"
                value={customer}
                onChange={setCustomer}
                placeholder="مثال: أحمد محمد"
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  الحالة
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as OrderStatus)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="جديد">جديد</option>
                  <option value="قيد المتابعة">
                    قيد المتابعة
                  </option>
                  <option value="مكتمل">مكتمل</option>
                  <option value="ملغي">ملغي</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={addOrder}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                حفظ الطلب
              </button>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </section>
        )}

        <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="إجمالي الطلبات"
            value={orders.length}
            icon="📦"
          />

          <StatCard
            title="طلبات جديدة"
            value={newOrders.length}
            icon="✦"
          />

          <StatCard
            title="قيد المتابعة"
            value={activeOrders.length}
            icon="◷"
          />

          <StatCard
            title="طلبات مكتملة"
            value={completedOrders.length}
            icon="✓"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div>
              <h2 className="text-lg font-bold">
                قائمة الطلبات
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                جميع الطلبات المسجلة في النظام.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              {orders.length} طلب
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                📦
              </div>

              <p className="mt-5 font-semibold">
                لا توجد طلبات حتى الآن
              </p>

              <p className="mt-2 text-sm text-slate-500">
                أضف أول طلب لبدء متابعة أعمالك.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-right">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      العميل
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      الخدمة
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      المبلغ
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      الحالة
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      التاريخ
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      إجراء
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                            {order.customer.charAt(0)}
                          </div>

                          <p className="text-sm font-semibold">
                            {order.customer}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {order.service}
                      </td>

                      <td className="px-6 py-5 text-sm font-semibold">
                        {order.amount
                          ? `${order.amount} جنيه`
                          : "-"}
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-500">
                        {order.date}
                      </td>

                      <td className="px-6 py-5">
                        <button
                          onClick={() =>
                            deleteOrder(order.id)
                          }
                          className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {cancelledOrders.length > 0 && (
          <section className="mt-6 rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  الطلبات الملغاة
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  الطلبات التي تم إلغاؤها.
                </p>
              </div>

              <div className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
                {cancelledOrders.length}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg">
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
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const styles: Record<OrderStatus, string> = {
    جديد: "bg-blue-50 text-blue-700",
    "قيد المتابعة": "bg-amber-50 text-amber-700",
    مكتمل: "bg-emerald-50 text-emerald-700",
    ملغي: "bg-red-50 text-red-700",
  };

  const dots: Record<OrderStatus, string> = {
    جديد: "bg-blue-500",
    "قيد المتابعة": "bg-amber-500",
    مكتمل: "bg-emerald-500",
    ملغي: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[status]}`}
      />

      {status}
    </span>
  );
}