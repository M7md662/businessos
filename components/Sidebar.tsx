"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { name: "لوحة التحكم", href: "/", icon: "⌂" },
  { name: "العملاء", href: "/customers", icon: "♙" },
  { name: "الطلبات", href: "/orders", icon: "▣" },
  { name: "المهام", href: "/tasks", icon: "✓" },
  { name: "المحادثات", href: "/conversations", icon: "◌" },
  { name: "قاعدة المعرفة", href: "/knowledge", icon: "▤" },
  { name: "مساعد الذكاء الاصطناعي", href: "/ai", icon: "✦" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function closeSidebar() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح القائمة"
        className="fixed right-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-900 shadow-sm md:hidden"
      >
        ☰
      </button>

      {open && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
        />
      )}

      <aside
        dir="rtl"
        className={`fixed right-0 top-0 z-50 flex h-dvh w-[280px] max-w-[85vw] flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 md:w-72 md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex min-w-0 items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
              B
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900">
                BusinessOS
              </h1>

              <p className="truncate text-xs text-slate-500">
                نظام إدارة الأعمال الذكي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSidebar}
            aria-label="إغلاق القائمة"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-slate-500 hover:bg-slate-100 md:hidden"
          >
            ×
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-xs font-semibold text-slate-400">
            القائمة الرئيسية
          </p>

          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="min-w-0 truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-900">Devora</p>

            <p className="mt-1 text-xs text-slate-500">حساب الشركة</p>
          </div>
        </div>
      </aside>
    </>
  );
}