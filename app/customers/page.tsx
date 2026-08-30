"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: "نشط" | "غير نشط";
};

const defaultCustomers: Customer[] = [
  {
    id: 1,
    name: "أحمد محمد",
    phone: "01012345678",
    email: "ahmed@example.com",
    status: "نشط",
  },
  {
    id: 2,
    name: "سارة علي",
    phone: "01123456789",
    email: "sara@example.com",
    status: "نشط",
  },
  {
    id: 3,
    name: "محمد خالد",
    phone: "01234567890",
    email: "mohamed@example.com",
    status: "غير نشط",
  },
];

const STORAGE_KEY = "businessos-customers";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const savedCustomers = localStorage.getItem(STORAGE_KEY);

      if (savedCustomers) {
        const parsedCustomers = JSON.parse(savedCustomers);

        if (Array.isArray(parsedCustomers)) {
          setCustomers(parsedCustomers);
        } else {
          setCustomers(defaultCustomers);
        }
      } else {
        setCustomers(defaultCustomers);
      }
    } catch (error) {
      console.error("حدث خطأ أثناء تحميل العملاء:", error);
      setCustomers(defaultCustomers);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    } catch (error) {
      console.error("حدث خطأ أثناء حفظ العملاء:", error);
    }
  }, [customers, isLoaded]);

  function addCustomer() {
    if (!name.trim()) {
      alert("يرجى إدخال اسم العميل");
      return;
    }

    const newCustomer: Customer = {
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      status: "نشط",
    };

    setCustomers((currentCustomers) => [
      ...currentCustomers,
      newCustomer,
    ]);

    setName("");
    setPhone("");
    setEmail("");
    setShowForm(false);
  }

  function deleteCustomer(id: number) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا العميل؟"
    );

    if (!confirmed) return;

    setCustomers((currentCustomers) =>
      currentCustomers.filter((customer) => customer.id !== id)
    );
  }

  const activeCustomers = customers.filter(
    (customer) => customer.status === "نشط"
  );

  const inactiveCustomers = customers.filter(
    (customer) => customer.status === "غير نشط"
  );

  if (!isLoaded) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <p className="text-sm text-slate-500">
          جاري تحميل العملاء...
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
              إدارة العملاء
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              العملاء
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              إدارة عملاء شركتك ومعلومات التواصل معهم.
            </p>
          </div>

          <button
            onClick={() => setShowForm((value) => !value)}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + إضافة عميل
          </button>
        </div>
      </header>

      <div className="p-8">
        {showForm && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold">
                إضافة عميل جديد
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                أضف بيانات العميل الأساسية إلى قاعدة عملائك.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <FormField
                label="اسم العميل"
                value={name}
                onChange={setName}
                placeholder="مثال: أحمد علي"
              />

              <FormField
                label="رقم الهاتف"
                value={phone}
                onChange={setPhone}
                placeholder="01012345678"
              />

              <FormField
                label="البريد الإلكتروني"
                value={email}
                onChange={setEmail}
                placeholder="example@email.com"
                type="email"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={addCustomer}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                حفظ العميل
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

        <section className="mb-8 grid gap-5 md:grid-cols-3">
          <StatCard
            title="إجمالي العملاء"
            value={customers.length}
            icon="👥"
          />

          <StatCard
            title="العملاء النشطون"
            value={activeCustomers.length}
            icon="✓"
          />

          <StatCard
            title="غير النشطين"
            value={inactiveCustomers.length}
            icon="○"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div>
              <h2 className="text-lg font-bold">
                قائمة العملاء
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                جميع العملاء المسجلين في النظام.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              {customers.length} عميل
            </div>
          </div>

          {customers.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                👥
              </div>

              <p className="mt-5 font-semibold">
                لا يوجد عملاء حتى الآن
              </p>

              <p className="mt-2 text-sm text-slate-500">
                أضف أول عميل لبدء إدارة قاعدة عملائك.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-right">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      العميل
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      الهاتف
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      البريد الإلكتروني
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      الحالة
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      إجراء
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                            {customer.name.charAt(0)}
                          </div>

                          <div>
                            <p className="text-sm font-semibold">
                              {customer.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              عميل BusinessOS
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {customer.phone || "-"}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {customer.email || "-"}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                            customer.status === "نشط"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              customer.status === "نشط"
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />

                          {customer.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <button
                          onClick={() =>
                            deleteCustomer(customer.id)
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