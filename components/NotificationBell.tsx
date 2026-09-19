"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";

export default function NotificationBell() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [unreadCount, setUnreadCount] = useState(0);

  async function loadUnreadCount() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUnreadCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Notification count error:", error);
        return;
      }

      setUnreadCount(count ?? 0);
    } catch (error) {
      console.error("Notification loading error:", error);
    }
  }

  useEffect(() => {
    loadUnreadCount();

    const handleFocus = () => {
      loadUnreadCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadUnreadCount();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    const channel = supabase
      .channel("notifications-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Link
      href={`/${locale}/notifications`}
      aria-label={
        isEnglish ? "Notifications" : "الإشعارات"
      }
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-black transition hover:bg-neutral-100"
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>

      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
