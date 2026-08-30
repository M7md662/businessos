"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside
      dir="rtl"
      className="fixed right-0 top-0 z-50 flex h-screen w-72 flex-col border-l border-slate-200 bg-white"
    >
      <div className="border-b border-slate-200 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
            B
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-900">
              BusinessOS
            </h1>

            <p className="text-xs text-slate-500">
              نظام إدارة الأعمال الذكي
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
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
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">
                {item.icon}
              </span>

              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-900">
            Devora
          </p>

          <p className="mt-1 text-xs text-slate-500">
            حساب الشركة
          </p>
        </div>
      </div>
    </aside>
  );
}