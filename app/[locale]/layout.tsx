import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import MainNavigation from "@/components/MainNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BusinessOS",
  description: "BusinessOS - Smart Business Management System",
};

const locales = ["ar", "en"];

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  const isEnglish = locale === "en";

  return (
    <NextIntlClientProvider messages={messages}>
      <div
        dir={isEnglish ? "ltr" : "rtl"}
        lang={isEnglish ? "en" : "ar"}
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#f3f3f3] text-[#111] antialiased`}
      >
        <MainNavigation locale={locale} />

        <div className="min-h-screen min-w-0 lg:ps-[221px]">
          <main className="min-h-screen min-w-0 p-3 sm:p-5">
            {children}
          </main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}