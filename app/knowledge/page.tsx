"use client";

import { useEffect, useState } from "react";

type KnowledgeData = {
  companyName: string;
  businessInfo: string;
  services: string;
  pricing: string;
  policies: string;
  faq: string;
};

const defaultKnowledge: KnowledgeData = {
  companyName: "شركتي",
  businessInfo:
    "شركة تقدم خدمات رقمية وحلول تقنية للعملاء.",
  services:
    "تصميم المواقع الإلكترونية\nتطوير الأنظمة\nالاستشارات التقنية",
  pricing:
    "تصميم المواقع يبدأ من 2500 جنيه.\nالاستشارات تبدأ من 500 جنيه.",
  policies:
    "يتم تحديد مدة التنفيذ حسب نوع المشروع.\nيتم الاتفاق على التفاصيل قبل بدء العمل.",
  faq:
    "س: كم تستغرق الخدمة؟\nج: تختلف المدة حسب نوع الخدمة وحجم المشروع.\n\nس: هل يمكن طلب تعديل؟\nج: نعم، يمكن طلب التعديلات حسب الاتفاق.",
};

const STORAGE_KEY = "businessos-knowledge";

export default function KnowledgePage() {
  const [knowledge, setKnowledge] =
    useState<KnowledgeData>(defaultKnowledge);

  const [isLoaded, setIsLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const savedKnowledge =
        localStorage.getItem(STORAGE_KEY);

      if (savedKnowledge) {
        const parsed = JSON.parse(savedKnowledge);

        if (parsed && typeof parsed === "object") {
          setKnowledge({
            ...defaultKnowledge,
            ...parsed,
          });
        }
      }
    } catch (error) {
      console.error(
        "حدث خطأ أثناء تحميل قاعدة المعرفة:",
        error
      );
    }

    setIsLoaded(true);
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

  function saveKnowledge() {
    try {
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
        "حدث خطأ أثناء حفظ قاعدة المعرفة:",
        error
      );
    }
  }

  if (!isLoaded) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-950 text-white"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl">
            ✦
          </div>

          <p className="text-sm text-slate-300">
            جاري تحميل قاعدة المعرفة...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl">
                  ✦
                </div>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  AI Knowledge Center
                </span>
              </div>

              <h1 className="text-3xl font-bold md:text-4xl">
                قاعدة المعرفة
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                أضف معلومات شركتك وخدماتك وأسعارك وسياساتك،
                ليتمكن BusinessOS من فهم نشاطك وتقديم
                إجابات أكثر دقة للعملاء.
              </p>
            </div>

            <button
              onClick={saveKnowledge}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              حفظ التغييرات
            </button>
          </div>
        </header>

        {saved && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm text-white">
              ✓
            </div>

            <div>
              <p className="text-sm font-semibold">
                تم حفظ قاعدة المعرفة
              </p>

              <p className="mt-1 text-xs text-slate-500">
                أصبحت المعلومات الجديدة متاحة للنظام.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            icon="🏢"
            title="معلومات الشركة"
            description="تعريف نشاط شركتك ومعلوماتها الأساسية."
          />

          <InfoCard
            icon="🧠"
            title="ذكاء المساعد"
            description="المعلومات تساعد AI على فهم نشاطك."
          />

          <InfoCard
            icon="💬"
            title="ردود أدق"
            description="إجابات أفضل وأكثر ارتباطًا بخدماتك."
          />
        </div>

        <div className="space-y-6">
          <KnowledgeSection
            icon="🏢"
            title="معلومات الشركة"
            description="المعلومات الأساسية التي يحتاجها BusinessOS لفهم شركتك."
          >
            <div className="grid gap-5">
              <FieldLabel label="اسم الشركة">
                <input
                  value={knowledge.companyName}
                  onChange={(e) =>
                    updateField(
                      "companyName",
                      e.target.value
                    )
                  }
                  placeholder="مثال: شركتي للتقنية"
                  className="input-style"
                />
              </FieldLabel>

              <FieldLabel label="معلومات النشاط">
                <textarea
                  value={knowledge.businessInfo}
                  onChange={(e) =>
                    updateField(
                      "businessInfo",
                      e.target.value
                    )
                  }
                  rows={5}
                  placeholder="اكتب نبذة عن شركتك ونشاطها..."
                  className="textarea-style"
                />
              </FieldLabel>
            </div>
          </KnowledgeSection>

          <KnowledgeSection
            icon="🛍️"
            title="المنتجات والخدمات"
            description="عرّف المساعد بالخدمات والمنتجات التي تقدمها."
          >
            <FieldLabel label="الخدمات والمنتجات">
              <textarea
                value={knowledge.services}
                onChange={(e) =>
                  updateField(
                    "services",
                    e.target.value
                  )
                }
                rows={7}
                placeholder="اكتب كل خدمة أو منتج في سطر منفصل..."
                className="textarea-style"
              />
            </FieldLabel>
          </KnowledgeSection>

          <KnowledgeSection
            icon="💰"
            title="الأسعار"
            description="أضف الأسعار والباقات لمساعدة المساعد على الإجابة عن أسئلة العملاء."
          >
            <FieldLabel label="قائمة الأسعار">
              <textarea
                value={knowledge.pricing}
                onChange={(e) =>
                  updateField(
                    "pricing",
                    e.target.value
                  )
                }
                rows={6}
                placeholder="مثال: تصميم الموقع يبدأ من 2500 جنيه..."
                className="textarea-style"
              />
            </FieldLabel>
          </KnowledgeSection>

          <KnowledgeSection
            icon="📋"
            title="السياسات"
            description="أضف سياسات التنفيذ والتعديلات والاسترجاع وأي قواعد مهمة."
          >
            <FieldLabel label="سياسات الشركة">
              <textarea
                value={knowledge.policies}
                onChange={(e) =>
                  updateField(
                    "policies",
                    e.target.value
                  )
                }
                rows={6}
                placeholder="اكتب سياسات شركتك هنا..."
                className="textarea-style"
              />
            </FieldLabel>
          </KnowledgeSection>

          <KnowledgeSection
            icon="❓"
            title="الأسئلة الشائعة"
            description="أضف الأسئلة المتكررة وإجاباتها لتسهيل الرد على العملاء."
          >
            <FieldLabel label="الأسئلة والإجابات">
              <textarea
                value={knowledge.faq}
                onChange={(e) =>
                  updateField("faq", e.target.value)
                }
                rows={10}
                placeholder={"س: ما سعر الخدمة؟\nج: ..."}
                className="textarea-style"
              />
            </FieldLabel>
          </KnowledgeSection>
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-bold">
              جاهز لتحديث معلوماتك؟
            </p>

            <p className="mt-1 text-sm text-slate-500">
              احفظ التغييرات حتى يستخدمها المساعد الذكي.
            </p>
          </div>

          <button
            onClick={saveKnowledge}
            className="rounded-2xl bg-slate-950 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            حفظ قاعدة المعرفة
          </button>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        {icon}
      </div>

      <h2 className="font-bold">{title}</h2>

      <p className="mt-2 text-xs leading-6 text-slate-500">
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
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
            {icon}
          </div>

          <div>
            <h2 className="text-lg font-bold">
              {title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-7">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>

      {children}
    </div>
  );
}