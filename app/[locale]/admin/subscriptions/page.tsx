"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
  is_active: boolean;
};

type Subscription = {
  id: string;
  company_id: string;
  plan_id: string;
  subscription_type: "free" | "trial" | "paid";
  status: "active" | "expired" | "cancelled" | "pending";
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  payment_provider: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

type DurationOption = 7 | 14 | 30 | 90 | "custom";

export default function AdminSubscriptionsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [subscriptionType, setSubscriptionType] = useState<
    "free" | "trial" | "paid"
  >("free");

  const [duration, setDuration] = useState<DurationOption>(30);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
        throw new Error("تعذر التحقق من صلاحيات Super Admin.");
      }

      if (!admin) {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);

      const [companiesResult, plansResult, subscriptionsResult] =
        await Promise.all([
          supabase
            .from("companies")
            .select("id, name")
            .order("created_at", { ascending: false }),

          supabase
            .from("plans")
            .select("*")
            .eq("is_active", true)
            .order("price", { ascending: true }),

          supabase
            .from("subscriptions")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

      if (companiesResult.error) {
        throw new Error("تعذر تحميل الشركات.");
      }

      if (plansResult.error) {
        throw new Error("تعذر تحميل الخطط.");
      }

      if (subscriptionsResult.error) {
        throw new Error("تعذر تحميل الاشتراكات.");
      }

      const loadedCompanies = (companiesResult.data || []) as Company[];
      const loadedPlans = (plansResult.data || []) as Plan[];
      const loadedSubscriptions =
        (subscriptionsResult.data || []) as Subscription[];

      setCompanies(loadedCompanies);
      setPlans(loadedPlans);
      setSubscriptions(loadedSubscriptions);

      setSelectedCompanyId((currentCompanyId) => {
        const companyStillExists = loadedCompanies.some(
          (company) => company.id === currentCompanyId
        );

        if (companyStillExists) {
          return currentCompanyId;
        }

        if (loadedCompanies.length > 0) {
          return loadedCompanies[0].id;
        }

        return "";
      });

      setSelectedPlanId((currentPlanId) => {
        const planStillExists = loadedPlans.some(
          (plan) => plan.id === currentPlanId
        );

        if (planStillExists) {
          return currentPlanId;
        }

        if (loadedPlans.length > 0) {
          const proPlan = loadedPlans.find(
            (plan) => plan.name.toLowerCase() === "pro"
          );

          return (proPlan || loadedPlans[0]).id;
        }

        return "";
      });
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

  const currentSubscription = useMemo(() => {
    return (
      subscriptions.find(
        (subscription) =>
          subscription.company_id === selectedCompanyId &&
          subscription.status === "active"
      ) || null
    );
  }, [subscriptions, selectedCompanyId]);

  const selectedCompany = useMemo(() => {
    return companies.find(
      (company) => company.id === selectedCompanyId
    );
  }, [companies, selectedCompanyId]);

  const selectedPlan = useMemo(() => {
    return plans.find((plan) => plan.id === selectedPlanId);
  }, [plans, selectedPlanId]);

  const remainingDays = useMemo(() => {
    if (!currentSubscription?.end_date) {
      return null;
    }

    const difference =
      new Date(currentSubscription.end_date).getTime() -
      Date.now();

    return Math.max(
      0,
      Math.ceil(difference / (1000 * 60 * 60 * 24))
    );
  }, [currentSubscription]);

  useEffect(() => {
    if (!currentSubscription) {
      setCustomStartDate("");
      setCustomEndDate("");
      return;
    }

    const start = new Date(currentSubscription.start_date);
    const end = currentSubscription.end_date
      ? new Date(currentSubscription.end_date)
      : null;

    setCustomStartDate(toDateInput(start));
    setCustomEndDate(end ? toDateInput(end) : "");
  }, [currentSubscription]);

  function toDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function calculateDates() {
    const start = new Date();

    if (duration === "custom") {
      return {
        start: customStartDate
          ? new Date(`${customStartDate}T00:00:00`)
          : start,
        end: customEndDate
          ? new Date(`${customEndDate}T23:59:59`)
          : null,
      };
    }

    const end = new Date(start);
    end.setDate(end.getDate() + duration);

    return {
      start,
      end,
    };
  }

  async function saveSubscription() {
    if (!selectedCompanyId) {
      setError("اختر شركة أولًا.");
      return;
    }

    if (!selectedPlanId) {
      setError("اختر خطة أولًا.");
      return;
    }

    const { start, end } = calculateDates();

    if (duration === "custom") {
      if (!customStartDate || !customEndDate) {
        setError("حدد تاريخ البداية وتاريخ الانتهاء.");
        return;
      }

      if (end && end.getTime() <= start.getTime()) {
        setError("تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية.");
        return;
      }
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (currentSubscription) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            plan_id: selectedPlanId,
            subscription_type: subscriptionType,
            status: "active",
            start_date: start.toISOString(),
            end_date: end ? end.toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentSubscription.id);

        if (updateError) {
          throw updateError;
        }

        setMessage("تم تحديث الاشتراك بنجاح.");
      } else {
        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            company_id: selectedCompanyId,
            plan_id: selectedPlanId,
            subscription_type: subscriptionType,
            status: "active",
            start_date: start.toISOString(),
            end_date: end ? end.toISOString() : null,
            auto_renew: false,
          });

        if (insertError) {
          throw insertError;
        }

        setMessage("تم إنشاء الاشتراك بنجاح.");
      }

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ الاشتراك."
      );
    } finally {
      setSaving(false);
    }
  }

  async function extendSubscription(days: number) {
    if (!currentSubscription) {
      setError("لا يوجد اشتراك نشط لهذه الشركة.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const currentEnd = currentSubscription.end_date
        ? new Date(currentSubscription.end_date)
        : new Date();

      const baseDate =
        currentEnd.getTime() > Date.now()
          ? currentEnd
          : new Date();

      const newEnd = new Date(baseDate);
      newEnd.setDate(newEnd.getDate() + days);

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          end_date: newEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSubscription.id);

      if (updateError) {
        throw updateError;
      }

      setMessage(`تم تمديد الاشتراك لمدة ${days} يوم.`);
      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "تعذر تمديد الاشتراك."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelSubscription() {
    if (!currentSubscription) {
      setError("لا يوجد اشتراك نشط لإلغائه.");
      return;
    }

    const confirmed = window.confirm(
      "هل أنت متأكد من إلغاء الاشتراك الحالي"
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          auto_renew: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSubscription.id);

      if (updateError) {
        throw updateError;
      }

      setMessage("تم إلغاء الاشتراك.");
      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "تعذر إلغاء الاشتراك."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#f8fafc] flex items-center justify-center"
      >
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>جاري تحميل الاشتراكات...</span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-950">
            غير مصرح بالدخول
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            هذه الصفحة متاحة لحسابات Super Admin فقط.
          </p>

          <button
            onClick={() => router.push("/ar/admin")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            العودة إلى Admin
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <CreditCard className="h-4 w-4" />
              Super Admin
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              إدارة الاشتراكات
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              إدارة خطط الشركات وفترات الاشتراك والحالة الحالية.
            </p>
          </div>

          <button
            onClick={() => router.push("/ar/admin")}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            العودة إلى Admin
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <XCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-950">
                إعداد الاشتراك
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                اختر الشركة والخطة ونوع الاشتراك.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  الشركة
                </label>

                <select
                  value={selectedCompanyId}
                  onChange={(event) =>
                    setSelectedCompanyId(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="">اختر الشركة</option>

                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  الخطة
                </label>

                <select
                  value={selectedPlanId}
                  onChange={(event) =>
                    setSelectedPlanId(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="">اختر الخطة</option>

                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — ${plan.price}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                نوع الاشتراك
              </label>

              <div className="grid grid-cols-3 gap-3">
                {[
                  ["free", "مجاني"],
                  ["trial", "تجريبي"],
                  ["paid", "مدفوع"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setSubscriptionType(
                        value as "free" | "trial" | "paid"
                      )
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      subscriptionType === value
                        ? "border-black bg-black text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                مدة الاشتراك
              </label>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  [7, "7 أيام"],
                  [14, "14 يوم"],
                  [30, "30 يوم"],
                  [90, "90 يوم"],
                  ["custom", "مخصص"],
                ].map(([value, label]) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() =>
                      setDuration(value as DurationOption)
                    }
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      duration === value
                        ? "border-black bg-black text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {duration === "custom" && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    تاريخ البداية
                  </label>

                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) =>
                      setCustomStartDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    تاريخ الانتهاء
                  </label>

                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) =>
                      setCustomEndDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={saveSubscription}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {currentSubscription
                  ? "تحديث الاشتراك"
                  : "إنشاء الاشتراك"}
              </button>

              <button
                onClick={() => loadData()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث البيانات
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              الاشتراك الحالي
            </h2>

            {selectedCompany ? (
              <div className="mt-5">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-400">
                    الشركة
                  </div>

                  <div className="mt-1 font-bold text-slate-900">
                    {selectedCompany.name}
                  </div>
                </div>

                {currentSubscription ? (
                  <div className="mt-4 space-y-4">
                    <InfoRow
                      label="الخطة"
                      value={
                        plans.find(
                          (plan) =>
                            plan.id === currentSubscription.plan_id
                        )?.name || "—"
                      }
                    />

                    <InfoRow
                      label="النوع"
                      value={
                        currentSubscription.subscription_type === "paid"
                          ? "مدفوع"
                          : currentSubscription.subscription_type ===
                            "trial"
                          ? "تجريبي"
                          : "مجاني"
                      }
                    />

                    <InfoRow
                      label="الحالة"
                      value="نشط"
                    />

                    <InfoRow
                      label="ينتهي في"
                      value={
                        currentSubscription.end_date
                          ? new Date(
                              currentSubscription.end_date
                            ).toLocaleDateString("ar-EG")
                          : "بدون تاريخ انتهاء"
                      }
                    />

                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="text-xs font-semibold text-slate-400">
                        الأيام المتبقية
                      </div>

                      <div className="mt-1 text-2xl font-bold text-slate-950">
                        {remainingDays === null
                          ? "∞"
                          : remainingDays}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="mb-3 text-sm font-semibold text-slate-700">
                        تمديد سريع
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[7, 30, 90, 365].map((days) => (
                          <button
                            key={days}
                            onClick={() =>
                              extendSubscription(days)
                            }
                            disabled={saving}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            +{days} يوم
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={cancelSubscription}
                      disabled={saving}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      إلغاء الاشتراك
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <CalendarDays className="mx-auto h-7 w-7 text-slate-400" />

                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      لا يوجد اشتراك نشط
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      يمكنك إنشاء اشتراك جديد من النموذج.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-400">
                اختر شركة لعرض الاشتراك.
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-slate-500" />

            <div>
              <h2 className="font-bold text-slate-950">
                الخطط المتاحة
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                الخطط الموجودة حاليًا في BusinessOS.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 ${
                  selectedPlanId === plan.id
                    ? "border-black"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">
                    {plan.name}
                  </h3>

                  {selectedPlanId === plan.id && (
                    <CheckCircle2 className="h-4 w-4 text-black" />
                  )}
                </div>

                <div className="mt-3 text-2xl font-bold text-slate-950">
                  ${plan.price}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  لمدة {plan.duration_days} يوم
                </div>

                <button
                  onClick={() => setSelectedPlanId(plan.id)}
                  className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  اختيار الخطة
                </button>
              </div>
            ))}
          </div>
        </section>

        {selectedPlan && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400">
                  الخطة المحددة
                </div>

                <div className="mt-1 text-lg font-bold text-slate-950">
                  {selectedPlan.name}
                </div>
              </div>

              <div className="text-sm text-slate-500">
                السعر الحالي:{" "}
                <span className="font-bold text-slate-900">
                  ${selectedPlan.price} {selectedPlan.currency}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}