"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  Users,
  Package,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
};

type Subscription = {
  id: string;
  company_id: string;
  status: string;
  subscription_type: string;
  end_date: string | null;
  plan_id: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
};

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/ar/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) {
        console.error(adminError);
        setError("حدث خطأ أثناء التحقق من صلاحيات المدير.");
        return;
      }

      if (!admin) {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);

      const [companiesResult, subscriptionsResult, plansResult] =
        await Promise.all([
          supabase
            .from("companies")
            .select("id, name")
            .order("created_at", { ascending: false }),

          supabase
            .from("subscriptions")
            .select(
              "id, company_id, status, subscription_type, end_date, plan_id"
            )
            .order("created_at", { ascending: false }),

          supabase
            .from("plans")
            .select("id, name, price")
            .eq("is_active", true)
            .order("price", { ascending: true }),
        ]);

      if (companiesResult.error) {
        console.error(companiesResult.error);
        throw new Error("تعذر تحميل الشركات.");
      }

      if (subscriptionsResult.error) {
        console.error(subscriptionsResult.error);
        throw new Error("تعذر تحميل الاشتراكات.");
      }

      if (plansResult.error) {
        console.error(plansResult.error);
        throw new Error("تعذر تحميل الخطط.");
      }

      setCompanies((companiesResult.data || []) as Company[]);
      setSubscriptions((subscriptionsResult.data || []) as Subscription[]);
      setPlans((plansResult.data || []) as Plan[]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active"
  );

  const expiredSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "expired"
  );

  const paidSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === "active" &&
      subscription.subscription_type === "paid"
  );

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-white flex items-center justify-center"
      >
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جاري تحميل لوحة الإدارة...</span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-white flex items-center justify-center px-6"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            غير مصرح بالدخول
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            هذا القسم مخصص لحسابات Super Admin فقط.
          </p>

          <button
            onClick={() => router.push("/ar")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            العودة إلى BusinessOS
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6"
      >
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="h-7 w-7" />
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            حدث خطأ
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            {error}
          </p>

          <button
            onClick={loadAdminData}
            className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Super Admin
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              لوحة الإدارة
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              إدارة الشركات والخطط والاشتراكات في BusinessOS.
            </p>
          </div>

          <button
            onClick={() => router.push("/ar")}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            BusinessOS
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Building2 className="h-5 w-5" />}
            title="الشركات"
            value={companies.length}
          />

          <StatCard
            icon={<CreditCard className="h-5 w-5" />}
            title="الاشتراكات النشطة"
            value={activeSubscriptions.length}
          />

          <StatCard
            icon={<Users className="h-5 w-5" />}
            title="الاشتراكات المدفوعة"
            value={paidSubscriptions.length}
          />

          <StatCard
            icon={<Package className="h-5 w-5" />}
            title="الخطط"
            value={plans.length}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  إدارة الاشتراكات
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  إدارة خطط الشركات وفترات الاشتراك.
                </p>
              </div>

              <button
                onClick={() =>
                  router.push("/ar/admin/subscriptions")
                }
                className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                إدارة الاشتراكات
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400">
                    <th className="pb-3 font-semibold">الشركة</th>
                    <th className="pb-3 font-semibold">الحالة</th>
                    <th className="pb-3 font-semibold">النوع</th>
                    <th className="pb-3 font-semibold">الانتهاء</th>
                  </tr>
                </thead>

                <tbody>
                  {companies.slice(0, 6).map((company) => {
                    const subscription = subscriptions.find(
                      (item) =>
                        item.company_id === company.id &&
                        item.status === "active"
                    );

                    return (
                      <tr
                        key={company.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="py-4">
                          <div className="font-semibold text-slate-800">
                            {company.name || "بدون اسم"}
                          </div>
                        </td>

                        <td className="py-4">
                          {subscription ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              نشط
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              بدون اشتراك
                            </span>
                          )}
                        </td>

                        <td className="py-4 text-sm text-slate-600">
                          {subscription?.subscription_type === "paid"
                            ? "مدفوع"
                            : subscription?.subscription_type === "trial"
                            ? "تجريبي"
                            : subscription
                            ? "مجاني"
                            : "—"}
                        </td>

                        <td className="py-4 text-sm text-slate-500">
                          {subscription?.end_date
                            ? new Date(
                                subscription.end_date
                              ).toLocaleDateString("ar-EG")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {companies.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  لا توجد شركات حاليًا.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              حالة النظام
            </h2>

            <div className="mt-6 space-y-4">
              <StatusRow
                label="الشركات"
                value={`${companies.length}`}
              />

              <StatusRow
                label="الاشتراكات النشطة"
                value={`${activeSubscriptions.length}`}
              />

              <StatusRow
                label="الاشتراكات المنتهية"
                value={`${expiredSubscriptions.length}`}
              />

              <StatusRow
                label="الخطط المتاحة"
                value={`${plans.length}`}
              />
            </div>

            <div className="mt-7 rounded-xl bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">
                Super Admin
              </div>

              <div className="mt-1 text-xs leading-5 text-slate-500">
                لديك صلاحية إدارة اشتراكات الشركات والخطط.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-950">
          {value}
        </span>
      </div>

      <div className="mt-4 text-sm font-semibold text-slate-600">
        {title}
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}
