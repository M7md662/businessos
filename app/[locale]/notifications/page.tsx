"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Bell, Check, CheckCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error: notificationsError } = await supabase
        .from("notifications")
        .select(
          "id, company_id, user_id, type, title, message, task_id, is_read, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (notificationsError) {
        throw notificationsError;
      }

      setNotifications((data ?? []) as Notification[]);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isEnglish
          ? "Failed to load notifications."
          : "تعذر تحميل الإشعارات."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markAsRead(id: string) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (updateError) {
      setError(
        isEnglish
          ? "Failed to update notification."
          : "تعذر تحديث الإشعار."
      );
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification
      )
    );
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (updateError) {
        throw updateError;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isEnglish
          ? "Failed to mark notifications as read."
          : "تعذر تحديد الإشعارات كمقروءة."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      isEnglish ? "en-US" : "ar-EG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(date));
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
              <Bell className="h-5 w-5" strokeWidth={1.8} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isEnglish ? "Notifications" : "الإشعارات"}
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                {unreadCount > 0
                  ? isEnglish
                    ? `${unreadCount} unread notification${
                        unreadCount === 1 ? "" : "s"
                      }`
                    : `${unreadCount} إشعار غير مقروء`
                  : isEnglish
                  ? "All caught up"
                  : "لا توجد إشعارات غير مقروءة"}
              </p>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={markingAll}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />

            {markingAll
              ? isEnglish
                ? "Updating..."
                : "جارٍ التحديث..."
              : isEnglish
              ? "Mark all as read"
              : "تحديد الكل كمقروء"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          {isEnglish ? "Loading notifications..." : "جارٍ تحميل الإشعارات..."}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
            <Bell className="h-6 w-6 text-neutral-400" />
          </div>

          <h2 className="mt-4 text-base font-semibold">
            {isEnglish ? "No notifications" : "لا توجد إشعارات"}
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            {isEnglish
              ? "New task assignments and updates will appear here."
              : "ستظهر هنا تعيينات المهام والتحديثات الجديدة."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const notificationContent = (
              <div
                className={`group rounded-2xl border bg-white p-4 transition ${
                  notification.is_read
                    ? "border-neutral-200"
                    : "border-black shadow-sm"
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      notification.is_read
                        ? "bg-neutral-100 text-neutral-500"
                        : "bg-black text-white"
                    }`}
                  >
                    <Bell className="h-4 w-4" strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold">
                            {notification.title}
                          </h2>

                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-black" />
                          )}
                        </div>

                        <p className="mt-1 text-sm leading-6 text-neutral-600">
                          {notification.message}
                        </p>
                      </div>

                      <span className="shrink-0 text-[11px] text-neutral-400">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {notification.task_id && (
                        <Link
                          href={`/${locale}/tasks`}
                          onClick={() => {
                            if (!notification.is_read) {
                              markAsRead(notification.id);
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
                        >
                          {isEnglish ? "Open task" : "فتح المهمة"}

                          {isEnglish ? (
                            <ArrowRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowLeft className="h-3.5 w-3.5" />
                          )}
                        </Link>
                      )}

                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-black transition hover:bg-neutral-100"
                        >
                          <Check className="h-3.5 w-3.5" />

                          {isEnglish
                            ? "Mark as read"
                            : "تحديد كمقروء"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );

            return notification.task_id ? (
              <div key={notification.id}>{notificationContent}</div>
            ) : (
              <div key={notification.id}>{notificationContent}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
