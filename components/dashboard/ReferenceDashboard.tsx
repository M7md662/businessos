"use client";

import React from "react";

type ChartBar = {
  day: string;
  value: number;
  height: number;
};

type RecentOrder = {
  id: string;
  customer_name: string | null;
  service: string | null;
  total: number | null;
  status: string | null;
  created_at: string;
};

type ReferenceDashboardProps = {
  isEnglish: boolean;
  loading: boolean;
  error: string;
  customersCount: number;
  ordersCount: number;
  revenue: number;
  completedOrders: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  orderCompletionRate: number;
  averageOrderValue: number;
  newCustomers: number;
  chartBars: ChartBar[];
  recentOrders: RecentOrder[];
  currentDate: string;
  formatNumber: (value: number) => string;
  formatMoney: (value: number) => string;
  formatDate: (value: string) => string;
};

function MiniLine() {
  return (
    <svg viewBox="0 0 100 35" className="h-10 w-full">
      <path
        d="M2 29 C15 24 17 27 28 18 S45 23 54 14 S70 18 79 8 S91 10 98 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function MiniBars() {
  const bars = [35, 55, 42, 75, 50, 90, 63, 100, 70, 84];

  return (
    <div className="flex h-10 items-end gap-1.5">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-1.5 bg-white/75"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const radius = 29;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg viewBox="0 0 76 76" className="h-20 w-20 -rotate-90">
      <circle
        cx="38"
        cy="38"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,.16)"
        strokeWidth="7"
      />

      <circle
        cx="38"
        cy="38"
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function Donut({ value }: { value: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth="12"
        />

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#111"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{value}%</span>
      </div>
    </div>
  );
}

export default function ReferenceDashboard({
  isEnglish,
  loading,
  error,
  customersCount,
  ordersCount,
  revenue,
  completedOrders,
  completedTasks,
  pendingTasks,
  completionRate,
  orderCompletionRate,
  averageOrderValue,
  newCustomers,
  chartBars,
  recentOrders,
  currentDate,
  formatNumber,
  formatMoney,
  formatDate,
}: ReferenceDashboardProps) {
  const labels = isEnglish
    ? {
        home: "Home",
        orders: "Orders",
        users: "Customers",
        search: "Search",
        revenue: "Total Revenue",
        totalOrders: "Total Orders",
        balance: "Balance",
        recent: "Recent Activities",
        history: "History",
        statistics: "Project Statistics",
        completed: "Completed",
        pending: "Pending",
        newCustomers: "New Customers",
        average: "Average Order",
        noData: "No recent activity",
        error: "Something went wrong",
      }
    : {
        home: "الرئيسية",
        orders: "الطلبات",
        users: "العملاء",
        search: "بحث",
        revenue: "إجمالي الإيرادات",
        totalOrders: "إجمالي الطلبات",
        balance: "الرصيد",
        recent: "آخر الأنشطة",
        history: "السجل",
        statistics: "إحصائيات المشروع",
        completed: "مكتمل",
        pending: "معلق",
        newCustomers: "عملاء جدد",
        average: "متوسط الطلب",
        noData: "لا توجد أنشطة حديثة",
        error: "حدث خطأ",
      };

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-[calc(100vh-24px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto min-h-[calc(100vh-24px)] max-w-[1500px] overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.06)]">
        <section className="min-w-0 bg-[#f8f8f8]">
          <header className="flex items-center gap-3 border-b border-neutral-100 bg-white px-4 py-4 sm:px-6">
            <div className="flex h-9 max-w-[390px] flex-1 items-center gap-2 rounded-xl bg-neutral-50 px-3 text-neutral-400">
              <span className="text-xs">⌕</span>

              <span className="text-[10px]">
                {labels.search}
              </span>
            </div>

            <button
              type="button"
              className="hidden h-9 w-9 rounded-xl border border-neutral-100 bg-white text-xs transition hover:bg-neutral-50 sm:block"
            >
              +
            </button>

            <button
              type="button"
              className="hidden h-9 w-9 rounded-xl border border-neutral-100 bg-white text-xs transition hover:bg-neutral-50 sm:block"
            >
              ♧
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
              B
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-neutral-400">
                  {currentDate}
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em]">
                  {labels.home}
                </h1>
              </div>
            </div>

            {error && (
              <div className="border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                {labels.error}: {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="min-h-[148px] rounded-2xl bg-black p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-white/50">
                      {labels.users}
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {loading
                        ? "-"
                        : formatNumber(customersCount)}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    ♙
                  </div>
                </div>

                <div className="mt-6 text-white/80">
                  <MiniLine />
                </div>
              </div>

              <div className="min-h-[148px] rounded-2xl bg-black p-5 text-white">
                <p className="text-[10px] text-white/50">
                  {labels.revenue}
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {loading ? "-" : formatMoney(revenue)}
                </p>

                <div className="mt-6">
                  <MiniBars />
                </div>
              </div>

              <div className="min-h-[148px] rounded-2xl bg-black p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/50">
                      {labels.totalOrders}
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {loading
                        ? "-"
                        : formatNumber(ordersCount)}
                    </p>
                  </div>

                  <Ring value={orderCompletionRate} />
                </div>

                <p className="mt-1 text-[9px] text-white/40">
                  {orderCompletionRate}% {labels.completed}
                </p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
              <div className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,.035)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-neutral-400">
                      {labels.balance}
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {loading
                        ? "-"
                        : formatMoney(revenue)}
                    </p>
                  </div>

                  <div className="text-[9px] text-neutral-400">
                    {labels.average}:{" "}
                    {loading
                      ? "-"
                      : formatMoney(averageOrderValue)}
                  </div>
                </div>

                <div className="mt-8 flex h-[220px] items-end gap-2 border-b border-neutral-100 px-1 sm:gap-4">
                  {chartBars.map((bar, index) => (
                    <div
                      key={`${bar.day}-${index}`}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="flex h-full w-full items-end justify-center gap-1">
                        <div
                          className="w-[38%] bg-neutral-200"
                          style={{
                            height: `${Math.max(
                              bar.height * 0.72,
                              6
                            )}%`,
                          }}
                        />

                        <div
                          className="w-[38%] bg-black"
                          style={{
                            height: `${Math.max(
                              bar.height,
                              8
                            )}%`,
                          }}
                        />
                      </div>

                      <span className="text-[8px] text-neutral-400">
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,.035)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">
                    {labels.recent}
                  </h2>

                  <span className="text-[9px] text-neutral-400">
                    •••
                  </span>
                </div>

                <p className="mt-1 text-[9px] text-neutral-400">
                  {currentDate}
                </p>

                <div className="mt-6 space-y-4">
                  {recentOrders.length === 0 ? (
                    <p className="py-8 text-center text-[10px] text-neutral-400">
                      {labels.noData}
                    </p>
                  ) : (
                    recentOrders
                      .slice(0, 4)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center gap-3"
                        >
                          <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-100" />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-semibold">
                              {order.customer_name ||
                                (isEnglish
                                  ? "Customer"
                                  : "عميل")}
                            </p>

                            <p className="truncate text-[8px] text-neutral-400">
                              {order.service ||
                                (isEnglish
                                  ? "New order"
                                  : "طلب جديد")}
                            </p>
                          </div>

                          <div className="text-end">
                            <p className="text-[9px] font-bold">
                              {formatMoney(
                                Number(order.total || 0)
                              )}
                            </p>

                            <p className="text-[8px] text-neutral-400">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
              <div className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,.035)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">
                    {labels.history}
                  </h2>

                  <span className="text-[9px] text-neutral-400">
                    {formatNumber(ordersCount)}
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  {recentOrders
                    .slice(0, 3)
                    .map((order, index) => (
                      <div
                        key={order.id}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                          index === 1
                            ? "bg-black text-white"
                            : "bg-neutral-50"
                        }`}
                      >
                        <div>
                          <p className="text-[10px] font-semibold">
                            {order.customer_name ||
                              (isEnglish
                                ? "Customer"
                                : "عميل")}
                          </p>

                          <p
                            className={`mt-1 text-[8px] ${
                              index === 1
                                ? "text-white/45"
                                : "text-neutral-400"
                            }`}
                          >
                            {order.service ||
                              (isEnglish
                                ? "Business service"
                                : "خدمة أعمال")}
                          </p>
                        </div>

                        <span className="text-[9px] font-bold">
                          {formatMoney(
                            Number(order.total || 0)
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(0,0,0,.035)]">
                <h2 className="text-sm font-bold">
                  {labels.statistics}
                </h2>

                <div className="mt-5 flex items-center justify-center">
                  <Donut value={completionRate} />
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-[9px]">
                    <span className="flex items-center gap-2 text-neutral-500">
                      <span className="h-2 w-2 rounded-full bg-black" />
                      {labels.completed}
                    </span>

                    <strong>
                      {formatNumber(completedTasks)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-[9px]">
                    <span className="flex items-center gap-2 text-neutral-500">
                      <span className="h-2 w-2 rounded-full bg-neutral-300" />
                      {labels.pending}
                    </span>

                    <strong>
                      {formatNumber(pendingTasks)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-[9px]">
                    <span className="flex items-center gap-2 text-neutral-500">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {labels.newCustomers}
                    </span>

                    <strong>
                      {formatNumber(newCustomers)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-neutral-500">
                      {labels.completed} {labels.orders}
                    </span>

                    <strong>
                      {formatNumber(completedOrders)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}