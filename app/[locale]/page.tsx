"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import ReferenceDashboard from "@/components/dashboard/ReferenceDashboard";

type Customer = {
  id: string;
  name: string;
  created_at: string;
};

type Order = {
  id: string;
  customer_name: string | null;
  service: string | null;
  total: number | null;
  status: string | null;
  created_at: string;
};

type Task = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  created_at: string;
};

function isCompleted(value: string | null) {
  if (!value) return false;

  const normalized = value.toLowerCase();

  return (
    normalized.includes("completed") ||
    normalized.includes("complete") ||
    normalized.includes("done")
  );
}

function isPending(value: string | null) {
  if (!value) return false;

  const normalized = value.toLowerCase();

  return (
    normalized.includes("pending") ||
    normalized.includes("progress") ||
    normalized.includes("waiting")
  );
}

export default function Dashboard() {
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const isEnglish = locale === "en";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(isEnglish ? "en-US" : "ar-EG").format(value);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat(isEnglish ? "en-US" : "ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(isEnglish ? "en-US" : "ar-EG", {
      day: "numeric",
      month: "short",
    }).format(new Date(value));

  const currentDate = new Intl.DateTimeFormat(
    isEnglish ? "en-US" : "ar-EG",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date());

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log(
        "BUSINESSOS CURRENT USER:",
        user?.id
      );

      console.log(
        "BUSINESSOS AUTH USER ERROR:",
        userError
      );

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(t("loginRequired"));
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();

      console.log(
        "BUSINESSOS MEMBERSHIP:",
        membership
      );

      console.log(
        "BUSINESSOS MEMBERSHIP ERROR:",
        membershipError
      );

      if (membershipError) {
        throw membershipError;
      }

      if (!membership?.company_id) {
        throw new Error(t("companyNotFound"));
      }

      const companyId = membership.company_id;

      console.log(
        "BUSINESSOS COMPANY ID:",
        companyId
      );

      const [customersResult, ordersResult, tasksResult] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id, name, created_at")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false }),

          supabase
            .from("orders")
            .select(
              "id, customer_name, service, total, status, created_at"
            )
            .eq("company_id", companyId)
            .order("created_at", { ascending: false }),

          supabase
            .from("tasks")
            .select(
              "id, title, status, priority, due_date, created_at"
            )
            .eq("company_id", companyId)
            .order("created_at", { ascending: false }),
        ]);

      if (customersResult.error) {
        throw customersResult.error;
      }

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      if (tasksResult.error) {
        throw tasksResult.error;
      }

      setCustomers(customersResult.data || []);
      setOrders(ordersResult.data || []);
      setTasks(tasksResult.data || []);
    } catch (err) {
      console.error(
        "Dashboard loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : t("dashboardLoadError")
      );
    } finally {
      setLoading(false);
    }
  }

  const revenue = useMemo(() => {
    return orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter((order) =>
      isCompleted(order.status)
    ).length;
  }, [orders]);

  const completedTasks = useMemo(() => {
    return tasks.filter((task) =>
      isCompleted(task.status)
    ).length;
  }, [tasks]);

  const pendingTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        !isCompleted(task.status) &&
        isPending(task.status)
    ).length;
  }, [tasks]);

  const completionRate =
    tasks.length > 0
      ? Math.round(
          (completedTasks / tasks.length) * 100
        )
      : 0;

  const orderCompletionRate =
    orders.length > 0
      ? Math.round(
          (completedOrders / orders.length) * 100
        )
      : 0;

  const newCustomers = useMemo(() => {
    const weekAgo = new Date();

    weekAgo.setDate(
      weekAgo.getDate() - 7
    );

    return customers.filter(
      (customer) =>
        new Date(customer.created_at) >= weekAgo
    ).length;
  }, [customers]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 5);
  }, [orders]);

  const chartBars = useMemo(() => {
    const days = Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date();

        date.setHours(0, 0, 0, 0);

        date.setDate(
          date.getDate() - (6 - index)
        );

        const year = date.getFullYear();

        const month = String(
          date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
          date.getDate()
        ).padStart(2, "0");

        const key =
          `${year}-${month}-${day}`;

        const value = orders
          .filter((order) => {
            const orderDate =
              new Date(order.created_at);

            const orderYear =
              orderDate.getFullYear();

            const orderMonth = String(
              orderDate.getMonth() + 1
            ).padStart(2, "0");

            const orderDay = String(
              orderDate.getDate()
            ).padStart(2, "0");

            return (
              `${orderYear}-${orderMonth}-${orderDay}` ===
              key
            );
          })
          .reduce(
            (sum, order) =>
              sum + Number(order.total || 0),
            0
          );

        return {
          day: new Intl.DateTimeFormat(
            isEnglish
              ? "en-US"
              : "ar-EG",
            {
              weekday: "short",
            }
          ).format(date),
          value,
        };
      }
    );

    const max = Math.max(
      ...days.map(
        (item) => item.value
      ),
      1
    );

    return days.map((item) => ({
      ...item,
      height: Math.max(
        (item.value / max) * 100,
        item.value ? 10 : 4
      ),
    }));
  }, [orders, isEnglish]);

  const averageOrderValue =
    orders.length > 0
      ? Math.round(
          revenue / orders.length
        )
      : 0;

  return (
    <ReferenceDashboard
      isEnglish={isEnglish}
      loading={loading}
      error={error}
      customersCount={customers.length}
      ordersCount={orders.length}
      revenue={revenue}
      completedOrders={completedOrders}
      completedTasks={completedTasks}
      pendingTasks={pendingTasks}
      completionRate={completionRate}
      orderCompletionRate={orderCompletionRate}
      averageOrderValue={averageOrderValue}
      newCustomers={newCustomers}
      chartBars={chartBars}
      recentOrders={recentOrders}
      currentDate={currentDate}
      formatNumber={formatNumber}
      formatMoney={formatMoney}
      formatDate={formatDate}
    />
  );
}