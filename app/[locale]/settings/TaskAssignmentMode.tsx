"use client";

import { useEffect, useState } from "react";
import { Check, Save, Sparkles, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type TaskAssignmentMode = "manager_approval" | "ai_auto";

type Props = {
  companyId: string;
  isEnglish: boolean;
  initialMode: TaskAssignmentMode;
};

export default function TaskAssignmentMode({
  companyId,
  isEnglish,
  initialMode,
}: Props) {
  const [mode, setMode] =
    useState<TaskAssignmentMode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const text = isEnglish
    ? {
        title: "Task Assignment",
        description:
          "Choose how BusinessOS assigns tasks to employees.",
        managerTitle: "Manager Approval",
        managerDescription:
          "AI prepares the task and recommends an employee. The manager approves before the task is assigned.",
        aiTitle: "AI Auto Assignment",
        aiDescription:
          "AI automatically analyzes the task and assigns it to the most suitable employee.",
        save: "Save assignment mode",
        saved: "Assignment mode saved",
      }
    : {
        title: "توزيع المهام",
        description:
          "اختر كيف يقوم BusinessOS بتوزيع المهام على الموظفين.",
        managerTitle: "موافقة المدير",
        managerDescription:
          "الذكاء الاصطناعي يجهز المهمة ويقترح الموظف المناسب ثم يوافق المدير قبل إسنادها.",
        aiTitle: "التوزيع التلقائي بالذكاء الاصطناعي",
        aiDescription:
          "الذكاء الاصطناعي يحلل المهمة تلقائيًا ويسندها إلى الموظف الأنسب.",
        save: "حفظ وضع توزيع المهام",
        saved: "تم حفظ وضع توزيع المهام",
      };

  async function saveMode() {
    if (!companyId) return;

    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("companies")
      .update({
        task_assignment_mode: mode,
      })
      .eq("id", companyId);

    setSaving(false);

    if (error) {
      console.error(
        "Failed to save task assignment mode:",
        error
      );
      return;
    }

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  return (
    <section className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_6px_25px_rgba(0,0,0,.03)] sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
          <Sparkles
            className="h-5 w-5"
            strokeWidth={1.8}
          />
        </div>

        <div>
          <h2 className="text-sm font-bold">
            {text.title}
          </h2>

          <p className="mt-1 text-[11px] leading-5 text-neutral-400">
            {text.description}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            setMode("manager_approval")
          }
          className={`rounded-2xl border p-4 text-start transition ${
            mode === "manager_approval"
              ? "border-black bg-black text-white"
              : "border-neutral-100 bg-[#fafafa] text-[#111] hover:border-neutral-300 hover:bg-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                mode === "manager_approval"
                  ? "bg-white text-black"
                  : "bg-neutral-100 text-black"
              }`}
            >
              <UserCheck className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold">
                  {text.managerTitle}
                </div>

                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    mode === "manager_approval"
                      ? "border-white bg-white"
                      : "border-neutral-300"
                  }`}
                >
                  {mode === "manager_approval" && (
                    <div className="h-2 w-2 rounded-full bg-black" />
                  )}
                </div>
              </div>

              <div
                className={`mt-2 text-[10px] leading-5 ${
                  mode === "manager_approval"
                    ? "text-neutral-300"
                    : "text-neutral-400"
                }`}
              >
                {text.managerDescription}
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode("ai_auto")}
          className={`rounded-2xl border p-4 text-start transition ${
            mode === "ai_auto"
              ? "border-black bg-black text-white"
              : "border-neutral-100 bg-[#fafafa] text-[#111] hover:border-neutral-300 hover:bg-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                mode === "ai_auto"
                  ? "bg-white text-black"
                  : "bg-neutral-100 text-black"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold">
                  {text.aiTitle}
                </div>

                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    mode === "ai_auto"
                      ? "border-white bg-white"
                      : "border-neutral-300"
                  }`}
                >
                  {mode === "ai_auto" && (
                    <div className="h-2 w-2 rounded-full bg-black" />
                  )}
                </div>
              </div>

              <div
                className={`mt-2 text-[10px] leading-5 ${
                  mode === "ai_auto"
                    ? "text-neutral-300"
                    : "text-neutral-400"
                }`}
              >
                {text.aiDescription}
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[10px] text-neutral-400">
          {saved ? text.saved : ""}
        </div>

        <button
          type="button"
          onClick={saveMode}
          disabled={saving}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saved ? (
            <Check className="h-4 w-4" />
          ) : saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          {saved ? text.saved : text.save}
        </button>
      </div>
    </section>
  );
}

