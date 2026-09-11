"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  ShoppingBag,
  Users,
  CheckSquare,
  MessageSquare,
  BookOpen,
  Sparkles,
  Settings,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type MainNavigationProps = {
  locale: string;
};

export default function MainNavigation({
  locale,
}: MainNavigationProps) {
  const pathname = usePathname();
  const isEnglish = locale === "en";

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setIsAdmin(false);
            setCheckingAdmin(false);
          }
          return;
        }

        const { data: admin, error } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Admin permission check failed:", error);

          if (mounted) {
            setIsAdmin(false);
          }
        } else if (mounted) {
          setIsAdmin(Boolean(admin));
        }
      } catch (error) {
        console.error("Admin permission check failed:", error);

        if (mounted) {
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          setCheckingAdmin(false);
        }
      }
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, []);

  const labels = isEnglish
    ? {
        home: "Home",
        orders: "Orders",
        customers: "Customers",
        tasks: "Tasks",
        conversations: "Conversations",
        knowledge: "Knowledge",
        ai: "AI Assistant",
        analytics: "Analytics",
        admin: "Administration",
        settings: "Settings",
        workspace: "Workspace",
        workspaceSub: "Professional workspace",
        pro: "BusinessOS PRO",
      }
    : {
        home: "الرئيسية",
        orders: "الطلبات",
        customers: "العملاء",
        tasks: "المهام",
        conversations: "المحادثات",
        knowledge: "المعرفة",
        ai: "المساعد الذكي",
        analytics: "التحليلات",
        admin: "الإدارة",
        settings: "الإعدادات",
        workspace: "مساحة العمل",
        workspaceSub: "مساحة العمل الاحترافية",
        pro: "BusinessOS PRO",
      };

  const navigation = [
    {
      label: labels.home,
      href: `/${locale}`,
      icon: Home,
    },
    {
      label: labels.orders,
      href: `/${locale}/orders`,
      icon: ShoppingBag,
    },
    {
      label: labels.customers,
      href: `/${locale}/customers`,
      icon: Users,
    },
    {
      label: labels.tasks,
      href: `/${locale}/tasks`,
      icon: CheckSquare,
    },
    {
      label: labels.conversations,
      href: `/${locale}/conversations`,
      icon: MessageSquare,
    },
    {
      label: labels.knowledge,
      href: `/${locale}/knowledge`,
      icon: BookOpen,
    },
    {
      label: labels.ai,
      href: `/${locale}/ai`,
      icon: Sparkles,
    },
    {
      label: labels.analytics,
      href: `/${locale}/analytics`,
      icon: BarChart3,
    },
  ];

  const secondaryNavigation = [
    ...(isAdmin
      ? [
          {
            label: labels.admin,
            href: `/${locale}/admin`,
            icon: ShieldCheck,
          },
        ]
      : []),
    {
      label: labels.settings,
      href: `/${locale}/settings`,
      icon: Settings,
    },
  ];

  function isActive(href: string) {
    if (href === `/${locale}`) {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Desktop navigation */}
      <aside className="fixed inset-y-3 start-3 z-50 hidden w-[205px] overflow-hidden rounded-[24px] border border-neutral-100 bg-white shadow-[0_10px_45px_rgba(0,0,0,.06)] lg:flex lg:flex-col">
        <div className="p-5">
          <Link
            href={`/${locale}`}
            className="mb-9 flex items-center gap-2 px-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-xs font-bold text-white">
              B
            </div>

            <div>
              <div className="text-sm font-bold tracking-tight">
                BusinessOS
              </div>

              <div className="text-[9px] text-neutral-400">
                Business Suite
              </div>
            </div>
          </Link>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-9 items-center gap-3 rounded-xl px-3 text-[11px] transition ${
                    active
                      ? "bg-black font-semibold text-white"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-black"
                  }`}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.8}
                  />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-7 border-t border-neutral-100 pt-5">
            <nav className="space-y-1">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-9 items-center gap-3 rounded-xl px-3 text-[11px] transition ${
                      active
                        ? "bg-black font-semibold text-white"
                        : "text-neutral-500 hover:bg-neutral-50 hover:text-black"
                    }`}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0"
                      strokeWidth={1.8}
                    />

                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-auto border-t border-neutral-100 p-5">
          <div className="px-2 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
            {labels.workspace}
          </div>

          <div className="mt-3 rounded-xl bg-neutral-50 p-3">
            <div className="text-[10px] font-semibold">
              {labels.pro}
            </div>

            <div className="mt-1 text-[8px] text-neutral-400">
              {labels.workspaceSub}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile navigation */}
      <nav className="fixed inset-x-3 bottom-3 z-50 flex h-16 items-center justify-around rounded-2xl border border-neutral-100 bg-white/95 px-2 shadow-[0_10px_40px_rgba(0,0,0,.10)] backdrop-blur lg:hidden">
        {navigation.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 transition ${
                active
                  ? "bg-black text-white"
                  : "text-neutral-400 hover:bg-neutral-50 hover:text-black"
              }`}
            >
              <Icon
                className="h-4 w-4"
                strokeWidth={1.8}
              />

              <span className="max-w-14 truncate text-[8px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}