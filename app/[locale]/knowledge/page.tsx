"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  Building2,
  Brain,
  Check,
  CircleHelp,
  FileText,
  Loader2,
  Lock,
  Package,
  Save,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import { hasFeature } from "@/lib/plan-permissions";

type KnowledgeData = {
  companyName: string;
  businessInfo: string;
  services: string;
  pricing: string;
  policies: string;
  faq: string;
};

type AccessState = "loading" | "allowed" | "denied" | "error";

const defaultKnowledge: KnowledgeData = {
  companyName: "شركتي",
  businessInfo:
    "شركة تقدم خدمات رقمية وحلول تقنية للعملاء.",
  services:
    "تصميم المواقع الإلكترونية\nتطوير الأنظمة\nالاستشارات التقنية",
  pricing:
    "تصميم الموقع يبدأ من 2500 جنيه.\nالاستشارات تبدأ من 500 جنيه.",
  policies:
    "يتم تحديد مدة التنفيذ حسب نوع المشروع.\nيتم الاتفاق على التفاصيل قبل بدء العمل.",
  faq:
    "س: كم تستغرق الخدمة\nج: تختلف المدة حسب نوع الخدمة وحجم المشروع.\n\nس: هل يمكن طلب تعديلات\nج: نعم يمكن طلب التعديلات حسب الاتفاق.",
};

const STORAGE_KEY = "businessos-knowledge";

export default function KnowledgePage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const labels = isEnglish
    ? {
        loading: "Loading knowledge base...",
        accessTitle: "Knowledge Base",
        accessDescription:
          "The Knowledge Base is available on Pro and Enterprise plans.",
        accessHint:
          "Upgrade your plan to connect company information with the AI assistant.",
        currentPlan: "Current plan",
        errorTitle: "Unable to load knowledge base",
        errorDescription:
          "There was a problem while checking your account or subscription.",
        title: "Knowledge Base",
        subtitle:
          "Add your company information, services, pricing, policies, and FAQs so BusinessOS can understand your business and provide more accurate answers.",
        aiCenter: "AI Knowledge Center",
        save: "Save changes",
        saving: "Saving...",
        savedTitle: "Knowledge base saved",
        savedDescription:
          "The updated information is now available to the system.",
        companyCard: "Company information",
        companyCardDesc:
          "Define your business and basic company information.",
        aiCard: "AI understanding",
        aiCardDesc:
          "Your information helps the assistant understand your business.",
        accuracyCard: "Better responses",
        accuracyCardDesc:
          "Give customers more accurate and relevant answers.",
        companySection: "Company information",
        companySectionDesc:
          "The basic information BusinessOS needs to understand your company.",
        companyName: "Company name",
        companyNamePlaceholder:
          "Example: My Technology Company",
        businessInfo: "Business information",
        businessInfoPlaceholder:
          "Write a short description of your company and business...",
        servicesSection: "Products & services",
        servicesSectionDesc:
          "Tell the assistant about the services and products you offer.",
        services: "Services and products",
        servicesPlaceholder:
          "Write each service or product on a separate line...",
        pricingSection: "Pricing",
        pricingSectionDesc:
          "Add prices and packages to help the assistant answer customer questions.",
        pricing: "Price list",
        pricingPlaceholder:
          "Example: Website design starts from 2,500 EGP...",
        policiesSection: "Policies",
        policiesSectionDesc:
          "Add execution, revision, refund, and other important company policies.",
        policies: "Company policies",
        policiesPlaceholder:
          "Write your company policies here...",
        faqSection: "Frequently asked questions",
        faqSectionDesc:
          "Add common questions and answers to make customer support easier.",
        faq: "Questions and answers",
        faqPlaceholder: "Q: What is the service price?\nA: ...",
        readyTitle: "Ready to update your information?",
        readyDescription:
          "Save your changes so the AI assistant can use the latest information.",
        saveKnowledge: "Save knowledge base",
      }
    : {
        loading: "جاري تحميل قاعدة المعرفة...",
        accessTitle: "قاعدة المعرفة",
        accessDescription:
          "قاعدة المعرفة متاحة في خطتي Pro وEnterprise.",
        accessHint:
          "تحتاج إلى ترقية خطتك لربط معلومات شركتك بالمساعد الذكي.",
        currentPlan: "خطتك الحالية",
        errorTitle: "تعذر تحميل قاعدة المعرفة",
        errorDescription:
          "حدثت مشكلة أثناء التحقق من حسابك أو اشتراكك.",
        title: "قاعدة المعرفة",
        subtitle:
          "أضف معلومات شركتك وخدماتك وأسعارك وسياساتك والأسئلة الشائعة ليتمكن BusinessOS من فهم نشاطك وتقديم إجابات أكثر دقة.",
        aiCenter: "مركز معرفة الذكاء الاصطناعي",
        save: "حفظ التغييرات",
        saving: "جاري الحفظ...",
        savedTitle: "تم حفظ قاعدة المعرفة",
        savedDescription:
          "أصبحت المعلومات الجديدة متاحة للنظام.",
        companyCard: "معلومات الشركة",
        companyCardDesc:
          "عرّف نشاط شركتك ومعلوماتها الأساسية.",
        aiCard: "فهم المساعد",
        aiCardDesc:
          "المعلومات تساعد المساعد الذكي على فهم نشاطك.",
        accuracyCard: "ردود أدق",
        accuracyCardDesc:
          "إجابات أفضل وأكثر ارتباطًا بخدماتك.",
        companySection: "معلومات الشركة",
        companySectionDesc:
          "المعلومات الأساسية التي يحتاجها BusinessOS لفهم شركتك.",
        companyName: "اسم الشركة",
        companyNamePlaceholder:
          "مثال: شركتي للتقنية",
        businessInfo: "معلومات النشاط",
        businessInfoPlaceholder:
          "اكتب نبذة عن شركتك ونشاطها...",
        servicesSection: "المنتجات والخدمات",
        servicesSectionDesc:
          "عرّف المساعد بالخدمات والمنتجات التي تقدمها.",
        services: "الخدمات والمنتجات",
        servicesPlaceholder:
          "اكتب كل خدمة أو منتج في سطر منفصل...",
        pricingSection: "الأسعار",
        pricingSectionDesc:
          "أضف الأسعار والباقات لمساعدة المساعد على الإجابة عن أسئلة العملاء.",
        pricing: "قائمة الأسعار",
        pricingPlaceholder:
          "مثال: تصميم الموقع يبدأ من 2500 جنيه...",
        policiesSection: "السياسات",
        policiesSectionDesc:
          "أضف سياسات التنفيذ والتعديلات والاسترجاع وأي قواعد مهمة.",
        policies: "سياسات الشركة",
        policiesPlaceholder:
          "اكتب سياسات شركتك هنا...",
        faqSection: "الأسئلة الشائعة",
        faqSectionDesc:
          "أضف الأسئلة المتكررة وإجاباتها لتسهيل الرد على العملاء.",
        faq: "الأسئلة والإجابات",
        faqPlaceholder: "س: ما سعر الخدمة؟\nج: ...",
        readyTitle: "جاهز لتحديث معلوماتك؟",
        readyDescription:
          "احفظ التغييرات حتى يستخدمها المساعد الذكي.",
        saveKnowledge: "حفظ قاعدة المعرفة",
      };

  const [knowledge, setKnowledge] =
    useState<KnowledgeData>(defaultKnowledge);

  const [isLoaded, setIsLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [accessState, setAccessState] =
    useState<AccessState>("loading");

  const [planName, setPlanName] = useState("");

  useEffect(() => {
    async function loadKnowledge() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAccessState("denied");
          setIsLoaded(true);
          return;
        }

        const { data: membership, error: membershipError } =
          await supabase
            .from("company_members")
            .select("company_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

        if (membershipError || !membership) {
          console.error(
            "Membership lookup error:",
            membershipError
          );

          setAccessState("error");
          setIsLoaded(true);
          return;
        }

        const {
          data: subscription,
          error: subscriptionError,
        } = await supabase
          .from("subscriptions")
          .select("plan_id, status, end_date")
          .eq("company_id", membership[0].company_id)
          .eq("status", "active")
          .maybeSingle();

        if (subscriptionError || !subscription) {
          console.error(
            "Subscription lookup error:",
            subscriptionError
          );

          setAccessState("denied");
          setIsLoaded(true);
          return;
        }

        if (
          subscription.end_date &&
          new Date(subscription.end_date).getTime() <=
            Date.now()
        ) {
          setAccessState("denied");
          setIsLoaded(true);
          return;
        }

        const { data: plan, error: planError } =
          await supabase
            .from("plans")
            .select("name")
            .eq("id", subscription.plan_id)
            .eq("is_active", true)
            .maybeSingle();

        if (planError || !plan) {
          console.error(
            "Plan lookup error:",
            planError
          );

          setAccessState("error");
          setIsLoaded(true);
          return;
        }

        setPlanName(plan.name);

        if (!hasFeature(plan.name, "knowledge")) {
          setAccessState("denied");
          setIsLoaded(true);
          return;
        }

        setAccessState("allowed");

        const {
          data: knowledgeRow,
          error: knowledgeError,
        } = await supabase
          .from("knowledge_base")
          .select(
            "company_name, business_info, services, pricing, policies, faq"
          )
          .eq("company_id", membership[0].company_id)
          .maybeSingle();

        if (knowledgeError) {
          console.error(
            "Knowledge lookup error:",
            knowledgeError
          );
        }

        if (knowledgeRow) {
          setKnowledge({
            companyName:
              knowledgeRow.company_name ||
              defaultKnowledge.companyName,
            businessInfo:
              knowledgeRow.business_info ||
              defaultKnowledge.businessInfo,
            services:
              knowledgeRow.services ||
              defaultKnowledge.services,
            pricing:
              knowledgeRow.pricing ||
              defaultKnowledge.pricing,
            policies:
              knowledgeRow.policies ||
              defaultKnowledge.policies,
            faq:
              knowledgeRow.faq ||
              defaultKnowledge.faq,
          });
        } else {
          const savedKnowledge =
            localStorage.getItem(STORAGE_KEY);

          if (savedKnowledge) {
            try {
              const parsed = JSON.parse(savedKnowledge);

              if (
                parsed &&
                typeof parsed === "object"
              ) {
                setKnowledge({
                  ...defaultKnowledge,
                  ...parsed,
                });
              }
            } catch {
              console.error(
                "Could not parse local knowledge data."
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "Knowledge loading error:",
          error
        );

        setAccessState("error");
      } finally {
        setIsLoaded(true);
      }
    }

    loadKnowledge();
  }, []);

  function updateField(
    field: keyof KnowledgeData,
    value: string
  ) {
    setKnowledge((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  }

  async function saveKnowledge() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: membership } =
        await supabase
          .from("company_members")
          .select("company_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!membership) {
        return;
      }

      const { data: subscription } =
        await supabase
          .from("subscriptions")
          .select("plan_id, status, end_date")
          .eq("company_id", membership[0].company_id)
          .eq("status", "active")
          .maybeSingle();

      if (!subscription) {
        return;
      }

      if (
        subscription.end_date &&
        new Date(subscription.end_date).getTime() <=
          Date.now()
      ) {
        return;
      }

      const { data: plan } =
        await supabase
          .from("plans")
          .select("name")
          .eq("id", subscription.plan_id)
          .eq("is_active", true)
          .maybeSingle();

      if (
        !plan ||
        !hasFeature(plan.name, "knowledge")
      ) {
        return;
      }

      const { error } = await supabase
        .from("knowledge_base")
        .upsert(
          {
            company_id: membership[0].company_id,
            company_name: knowledge.companyName,
            business_info: knowledge.businessInfo,
            services: knowledge.services,
            pricing: knowledge.pricing,
            policies: knowledge.policies,
            faq: knowledge.faq,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "company_id",
          }
        );

      if (error) {
        console.error(
          "Knowledge save error:",
          error
        );

        return;
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(knowledge)
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Knowledge save error:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    !isLoaded ||
    accessState === "loading"
  ) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[#f3f3f3] text-[#111]"
      >
        <div className="flex flex-col items-center rounded-[24px] bg-white px-10 py-9 text-center shadow-[0_10px_45px_rgba(0,0,0,.06)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <Brain className="h-5 w-5" />
          </div>

          <Loader2 className="mb-3 h-5 w-5 animate-spin text-neutral-400" />

          <p className="text-sm font-medium text-neutral-500">
            {labels.loading}
          </p>
        </div>
      </main>
    );
  }

  if (accessState === "denied") {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[#f3f3f3] px-4 text-[#111]"
      >
        <div className="w-full max-w-lg rounded-[24px] border border-neutral-100 bg-white p-8 text-center shadow-[0_10px_45px_rgba(0,0,0,.06)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
            <Lock className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            {labels.accessTitle}
          </h1>

          <p className="mt-3 text-sm leading-7 text-neutral-500">
            {labels.accessDescription}
          </p>

          <p className="mt-2 text-xs leading-6 text-neutral-400">
            {labels.accessHint}
          </p>

          {planName && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-600">
              <span>{labels.currentPlan}:</span>
              <span className="font-semibold text-black">
                {planName}
              </span>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (accessState === "error") {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-24px)] items-center justify-center bg-[#f3f3f3] px-4 text-[#111]"
      >
        <div className="w-full max-w-lg rounded-[24px] border border-neutral-100 bg-white p-8 text-center shadow-[0_10px_45px_rgba(0,0,0,.06)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
            <span className="text-xl font-bold">!</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            {labels.errorTitle}
          </h1>

          <p className="mt-3 text-sm leading-7 text-neutral-500">
            {labels.errorDescription}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-[calc(100vh-24px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto min-h-[calc(100vh-24px)] max-w-[1500px] overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.06)]">
        <section className="min-w-0 bg-[#f8f8f8]">
          <header className="border-b border-neutral-100 bg-white px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                  <Brain className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                      {labels.title}
                    </h1>

                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
                      {labels.aiCenter}
                    </span>
                  </div>

                  <p className="max-w-3xl text-xs leading-6 text-neutral-500 sm:text-sm">
                    {labels.subtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={saveKnowledge}
                disabled={saving}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                <span>
                  {saving
                    ? labels.saving
                    : labels.save}
                </span>
              </button>
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            {saved && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <Check className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {labels.savedTitle}
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    {labels.savedDescription}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={<Building2 className="h-5 w-5" />}
                title={labels.companyCard}
                description={labels.companyCardDesc}
              />

              <InfoCard
                icon={<Sparkles className="h-5 w-5" />}
                title={labels.aiCard}
                description={labels.aiCardDesc}
              />

              <InfoCard
                icon={<Brain className="h-5 w-5" />}
                title={labels.accuracyCard}
                description={labels.accuracyCardDesc}
              />
            </div>

            <div className="space-y-5">
              <KnowledgeSection
                icon={<Building2 className="h-5 w-5" />}
                title={labels.companySection}
                description={labels.companySectionDesc}
              >
                <div className="grid gap-5">
                  <FieldLabel label={labels.companyName}>
                    <input
                      value={knowledge.companyName}
                      onChange={(e) =>
                        updateField(
                          "companyName",
                          e.target.value
                        )
                      }
                      placeholder={
                        labels.companyNamePlaceholder
                      }
                      className="input-style"
                    />
                  </FieldLabel>

                  <FieldLabel label={labels.businessInfo}>
                    <textarea
                      value={knowledge.businessInfo}
                      onChange={(e) =>
                        updateField(
                          "businessInfo",
                          e.target.value
                        )
                      }
                      rows={5}
                      placeholder={
                        labels.businessInfoPlaceholder
                      }
                      className="textarea-style"
                    />
                  </FieldLabel>
                </div>
              </KnowledgeSection>

              <KnowledgeSection
                icon={<Package className="h-5 w-5" />}
                title={labels.servicesSection}
                description={labels.servicesSectionDesc}
              >
                <FieldLabel label={labels.services}>
                  <textarea
                    value={knowledge.services}
                    onChange={(e) =>
                      updateField(
                        "services",
                        e.target.value
                      )
                    }
                    rows={7}
                    placeholder={
                      labels.servicesPlaceholder
                    }
                    className="textarea-style"
                  />
                </FieldLabel>
              </KnowledgeSection>

              <KnowledgeSection
                icon={<WalletCards className="h-5 w-5" />}
                title={labels.pricingSection}
                description={labels.pricingSectionDesc}
              >
                <FieldLabel label={labels.pricing}>
                  <textarea
                    value={knowledge.pricing}
                    onChange={(e) =>
                      updateField(
                        "pricing",
                        e.target.value
                      )
                    }
                    rows={6}
                    placeholder={
                      labels.pricingPlaceholder
                    }
                    className="textarea-style"
                  />
                </FieldLabel>
              </KnowledgeSection>

              <KnowledgeSection
                icon={<FileText className="h-5 w-5" />}
                title={labels.policiesSection}
                description={labels.policiesSectionDesc}
              >
                <FieldLabel label={labels.policies}>
                  <textarea
                    value={knowledge.policies}
                    onChange={(e) =>
                      updateField(
                        "policies",
                        e.target.value
                      )
                    }
                    rows={6}
                    placeholder={
                      labels.policiesPlaceholder
                    }
                    className="textarea-style"
                  />
                </FieldLabel>
              </KnowledgeSection>

              <KnowledgeSection
                icon={<CircleHelp className="h-5 w-5" />}
                title={labels.faqSection}
                description={labels.faqSectionDesc}
              >
                <FieldLabel label={labels.faq}>
                  <textarea
                    value={knowledge.faq}
                    onChange={(e) =>
                      updateField(
                        "faq",
                        e.target.value
                      )
                    }
                    rows={10}
                    placeholder={
                      labels.faqPlaceholder
                    }
                    className="textarea-style"
                  />
                </FieldLabel>
              </KnowledgeSection>
            </div>

            <div className="flex flex-col gap-5 rounded-[20px] border border-neutral-100 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-bold tracking-tight">
                  {labels.readyTitle}
                </p>

                <p className="mt-1 text-sm text-neutral-500">
                  {labels.readyDescription}
                </p>
              </div>

              <button
                onClick={saveKnowledge}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-7 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving
                  ? labels.saving
                  : labels.saveKnowledge}
              </button>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .input-style {
          width: 100%;
          border-radius: 14px;
          border: 1px solid #e5e5e5;
          background: #fafafa;
          padding: 12px 14px;
          font-size: 14px;
          color: #111;
          outline: none;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .input-style::placeholder {
          color: #a3a3a3;
        }

        .input-style:focus {
          border-color: #111;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
        }

        .textarea-style {
          width: 100%;
          resize: vertical;
          border-radius: 14px;
          border: 1px solid #e5e5e5;
          background: #fafafa;
          padding: 13px 14px;
          font-size: 14px;
          line-height: 1.8;
          color: #111;
          outline: none;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .textarea-style::placeholder {
          color: #a3a3a3;
        }

        .textarea-style:focus {
          border-color: #111;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[18px] border border-neutral-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-black">
        {icon}
      </div>

      <h2 className="text-sm font-bold tracking-tight">
        {title}
      </h2>

      <p className="mt-2 text-xs leading-6 text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function KnowledgeSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-neutral-100 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-black">
            {icon}
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight sm:text-lg">
              {title}
            </h2>

            <p className="mt-1 text-xs leading-6 text-neutral-500 sm:text-sm">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-neutral-700 sm:text-sm">
        {label}
      </label>

      {children}
    </div>
  );
}


