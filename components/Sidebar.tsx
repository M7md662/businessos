"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Role = "owner" | "employee";

const navigation = [
  {
    sectionKey: "main",
    items: [
      {
        nameKey: "dashboard",
        href: "/",
        icon: "dashboard",
      },
    ],
  },
  {
    sectionKey: "workManagement",
    items: [
      {
        nameKey: "customers",
        href: "/customers",
        icon: "users",
      },
      {
        nameKey: "orders",
        href: "/orders",
        icon: "orders",
      },
      {
        nameKey: "tasks",
        href: "/tasks",
        icon: "tasks",
      },
    ],
  },
  {
    sectionKey: "communicationAI",
    items: [
      {
        nameKey: "conversations",
        href: "/conversations",
        icon: "chat",
      },
      {
        nameKey: "knowledgeBase",
        href: "/knowledge",
        icon: "book",
      },
      {
        nameKey: "aiAssistant",
        href: "/ai",
        icon: "spark",
        ai: true,
      },
    ],
  },
];

function Icon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "team":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21v-1.5a5.5 5.5 0 0 1 11 0V21" />
          <path d="M18 11a3 3 0 0 1 3 3v1" />
          <path d="M19 21v-1.5a4 4 0 0 0-2-3.46" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V19.6h-2v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.04H7.75v-2h.09A1.7 1.7 0 0 0 9.4 10.9a1.7 1.7 0 0 0-.34-1.88L9 8.96l1.41-1.41.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.04-1.56V6.3h2v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.09v2h-.09A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
      );

    case "orders":
      return (
        <svg {...common}>
          <path d="M6 2h9l4 4v16H6z" />
          <path d="M14 2v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      );

    case "tasks":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );

    case "chat":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.2 9.2 0 0 1-4-.9L3 21l1.7-4.2A8.2 8.2 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
          <path d="M8 12h.01" />
          <path d="M12 12h.01" />
          <path d="M16 12h.01" />
        </svg>
      );

    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22Z" />
          <path d="M4 5.5V22" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path d="m12 3-1.3 5.7L5 10l5.7 1.3L12 17l1.3-5.7L19 10l-5.7-1.3Z" />
          <path d="m19 16-.6 2.4L16 19l2.4.6L19 22l.6-2.4Z" />
        </svg>
      );

    default:
      return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const isEnglish = locale === "en";
  const isOwner = role === "owner";

  function getLocalizedPath(path: string) {
    return `/${locale}${path === "/" ? "" : path}`;
  }

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    setLoadingAccount(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setLoadingAccount(false);
        return;
      }

      const metadataName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : "";

      setUserName(
        metadataName ||
          user.email?.split("@")[0] ||
          (isEnglish ? "User" : "المستخدم")
      );

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id, role, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

      if (membershipError) {
        throw membershipError;
      }

      const membership = memberships?.[0];

      if (!membership?.company_id) {
        setRole(null);
        setCompanyName("");
        return;
      }

      setRole(
        membership.role === "owner"
          ? "owner"
          : "employee"
      );

      const { data: company, error: companyError } =
        await supabase
          .from("companies")
          .select("name")
          .eq("id", membership.company_id)
          .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      setCompanyName(
        company?.name ||
          (isEnglish ? "My Company" : "شركتي")
      );
    } catch (error) {
      console.error("Sidebar account loading error:", error);
    } finally {
      setLoadingAccount(false);
    }
  }

  function switchLanguage() {
    const nextLocale = isEnglish ? "ar" : "en";

    const pathWithoutLocale =
      pathname.replace(/^\/(ar|en)/, "") || "/";

    window.location.href =
      `/${nextLocale}${
        pathWithoutLocale === "/" ? "" : pathWithoutLocale
      }`;
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
      return;
    }

    window.location.href = `/${locale}/login`;
  }

  return (
    <>
      {/* Mobile menu */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isEnglish ? "Open menu" : "فتح القائمة"}
        className={`fixed ${
          isEnglish ? "left-4" : "right-4"
        } top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-black md:hidden`}
      >
        <span className="text-xl">☰</span>
      </button>

      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label={isEnglish ? "Close menu" : "إغلاق القائمة"}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        dir={isEnglish ? "ltr" : "rtl"}
        className={`fixed ${
          isEnglish ? "left-0 border-r" : "right-0 border-l"
        } top-0 z-50 flex h-dvh w-[272px] max-w-[88vw] flex-col border-neutral-200 bg-white transition-transform duration-300 md:w-[272px] md:translate-x-0 ${
          open
            ? "translate-x-0 shadow-2xl"
            : isEnglish
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="border-b border-neutral-100 px-5 py-5">
          <Link
            href={getLocalizedPath("/")}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-sm font-black text-white">
              B
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-extrabold tracking-tight text-black">
                  BusinessOS
                </span>

                <span className="rounded-md bg-black px-1.5 py-0.5 text-[8px] font-bold text-white">
                  PRO
                </span>
              </div>

              <p className="mt-0.5 truncate text-[9px] text-neutral-400">
                {t("smartBusinessManagement")}
              </p>
            </div>
          </Link>
        </div>

        {/* Workspace */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-xs font-black text-white">
              {companyName
                ? companyName.charAt(0).toUpperCase()
                : "B"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-black">
                {loadingAccount
                  ? "..."
                  : companyName ||
                    (isEnglish ? "My Company" : "شركتي")}
              </p>

              <p className="mt-0.5 truncate text-[9px] text-neutral-400">
                {t("workspace")}
              </p>
            </div>

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-neutral-400"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-6">
          {navigation.map((section) => (
            <div
              key={section.sectionKey}
              className="mb-6 last:mb-0"
            >
              <p className="mb-2 px-3 text-[9px] font-bold tracking-wide text-neutral-400">
                {t(section.sectionKey)}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const localizedHref =
                    getLocalizedPath(item.href);

                  const isActive =
                    item.href === "/"
                      ? pathname === localizedHref
                      : pathname.startsWith(localizedHref);

                  if (item.ai) {
                    return (
                      <Link
                        key={item.href}
                        href={localizedHref}
                        onClick={() => setOpen(false)}
                        className={`group flex min-h-[50px] items-center gap-3 rounded-xl px-3 transition-all ${
                          isActive
                            ? "bg-black text-white"
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            isActive
                              ? "bg-white text-black"
                              : "bg-neutral-100 text-black"
                          }`}
                        >
                          <Icon name="spark" size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold">
                            {t(item.nameKey)}
                          </p>

                          <p
                            className={`mt-0.5 truncate text-[9px] ${
                              isActive
                                ? "text-neutral-300"
                                : "text-neutral-400"
                            }`}
                          >
                            {t("aiBusinessAssistant")}
                          </p>
                        </div>

                        <span
                          className={`rounded-md px-1.5 py-1 text-[8px] font-bold ${
                            isActive
                              ? "bg-white text-black"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          AI
                        </span>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={localizedHref}
                      onClick={() => setOpen(false)}
                      className={`group flex h-[48px] items-center gap-3 rounded-xl px-3 transition-all ${
                        isActive
                          ? "bg-black text-white"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                          isActive
                            ? "bg-white text-black"
                            : "bg-neutral-100 text-neutral-500 group-hover:bg-white group-hover:text-black"
                        }`}
                      >
                        <Icon name={item.icon} size={18} />
                      </div>

                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                        {t(item.nameKey)}
                      </span>

                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Owner Navigation */}
          {isOwner && (
            <div className="mb-6">
              <p className="mb-2 px-3 text-[9px] font-bold tracking-wide text-neutral-400">
                {isEnglish ? "Administration" : "الإدارة"}
              </p>

              <div className="space-y-1">
                <Link
                  href={getLocalizedPath("/team")}
                  onClick={() => setOpen(false)}
                  className={`group flex h-[48px] items-center gap-3 rounded-xl px-3 transition-all ${
                    pathname.startsWith(getLocalizedPath("/team"))
                      ? "bg-black text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      pathname.startsWith(getLocalizedPath("/team"))
                        ? "bg-white text-black"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-white group-hover:text-black"
                    }`}
                  >
                    <Icon name="team" size={18} />
                  </div>

                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                    {isEnglish ? "Team" : "الفريق"}
                  </span>

                  {pathname.startsWith(
                    getLocalizedPath("/team")
                  ) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </Link>

                <Link
                  href={getLocalizedPath("/settings")}
                  onClick={() => setOpen(false)}
                  className={`group flex h-[48px] items-center gap-3 rounded-xl px-3 transition-all ${
                    pathname.startsWith(
                      getLocalizedPath("/settings")
                    )
                      ? "bg-black text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      pathname.startsWith(
                        getLocalizedPath("/settings")
                      )
                        ? "bg-white text-black"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-white group-hover:text-black"
                    }`}
                  >
                    <Icon name="settings" size={18} />
                  </div>

                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                    {isEnglish ? "Settings" : "الإعدادات"}
                  </span>

                  {pathname.startsWith(
                    getLocalizedPath("/settings")
                  ) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Language */}
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={switchLanguage}
            className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-neutral-600 transition hover:bg-neutral-50 hover:text-black"
          >
            <span>{t("language")}</span>

            <span className="rounded-lg bg-neutral-100 px-2 py-1 text-[9px] font-bold text-neutral-700">
              {isEnglish ? "🇬🇧 English" : "🇸🇦 العربية"}
            </span>
          </button>
        </div>

        {/* AI */}
        <div className="px-4 pb-3">
          <Link
            href={getLocalizedPath("/ai")}
            onClick={() => setOpen(false)}
            className="group block rounded-xl bg-black p-4 text-white transition hover:-translate-y-0.5 hover:bg-neutral-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
                <Icon name="spark" size={16} />
              </div>

              <span className="flex items-center gap-1.5 text-[9px] font-semibold text-neutral-300">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {t("connected")}
              </span>
            </div>

            <p className="mt-3 text-[12px] font-bold">
              BusinessOS AI
            </p>

            <p className="mt-1 text-[9px] leading-5 text-neutral-300">
              {t("aiDescription")}
            </p>

            <div className="mt-3 flex items-center justify-between text-[9px] font-semibold">
              <span className="text-neutral-300">
                {t("openAssistant")}
              </span>

              <span>{isEnglish ? "→" : "←"}</span>
            </div>
          </Link>
        </div>

        {/* Account */}
        <div className="border-t border-neutral-100 px-4 py-4">
          <div className="relative">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                {userName
                  ? userName.charAt(0).toUpperCase()
                  : "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-black">
                  {loadingAccount
                    ? "..."
                    : userName ||
                      (isEnglish ? "User" : "المستخدم")}
                </p>

                <p className="mt-0.5 truncate text-[9px] text-neutral-400">
                  {isOwner
                    ? isEnglish
                      ? "Owner"
                      : "مالك"
                    : role === "employee"
                      ? isEnglish
                        ? "Employee"
                        : "موظف"
                      : ""}
                </p>
              </div>

              <button
                type="button"
                aria-label={
                  isEnglish
                    ? "Account options"
                    : "خيارات الحساب"
                }
                onClick={() =>
                  setAccountOpen((value) => !value)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-black"
              >
                ⋯
              </button>
            </div>

            {accountOpen && (
              <div
                className={`absolute bottom-14 ${
                  isEnglish ? "right-0" : "left-0"
                } z-50 w-48 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl`}
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-base">↪</span>

                  <span>
                    {loggingOut
                      ? isEnglish
                        ? "Signing out..."
                        : "جاري تسجيل الخروج..."
                      : isEnglish
                        ? "Sign out"
                        : "تسجيل الخروج"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}