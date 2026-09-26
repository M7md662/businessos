"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Loader2,
  AlertCircle,
  UserPlus,
  ShoppingCart,
  ListTodo,
  UserRoundCheck,
  UserRoundPen,
  RefreshCcw,
  PencilLine,
  ArrowRight,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import { hasFeature } from "@/lib/plan-permissions";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type ProposedAction = {
  type: "create_task" | "create_order" | "create_customer";
  title?: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status?: string;
  customer_id: string | null;
  customer_name: string | null;
  service?: string;
  total?: number;
  notes?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
};

type IntentActionType =
  | "create_customer"
  | "create_order"
  | "create_task"
  | "assign_task"
  | "update_customer"
  | "update_order"
  | "update_task";

type IntentActionMode =
  | "manual"
  | "ai_auto"
  | "manager_approval";

type IntentAction = {
  type: IntentActionType;
  depends_on: string[];
  mode: IntentActionMode;
  requires_confirmation: boolean;
};

type IntentEntities = {
  customer_name?: string | null;
  customer_id?: string | null;
  service?: string | null;
  amount?: number | null;
  currency?: string | null;
  task_title?: string | null;
  new_task_title?: string | null;
  task_id?: string | null;
  order_id?: string | null;
  assigned_to?: string | null;
  assigned_employee_name?: string | null;
  priority?: string | null;
  status?: string | null;
  due_date?: string | null;
};

type IntentPlan = {
  intent: string;
  entities: IntentEntities;
  actions: IntentAction[];
};

type CustomerSelection = {
  id: string;
  name: string;
};

type IntentPermissionResult = {
  allowed: boolean;
  action: IntentActionType;
  reason: string;
};

type IntentPermission = {
  allowed: boolean;
  results: IntentPermissionResult[];
  deniedActions: IntentActionType[];
};

type AccessState = "loading" | "allowed" | "denied" | "error";

const STORAGE_KEY_PREFIX = "businessos-ai-messages";

export default function AIPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [messages, setMessages] = useState<Message[]>([]);
  const [proposedAction, setProposedAction] =
    useState<ProposedAction | null>(null);

  const [intentPlan, setIntentPlan] =
    useState<IntentPlan | null>(null);
const [ambiguousCustomers, setAmbiguousCustomers] =
  useState<CustomerSelection[]>([]);


  const [intentPermission, setIntentPermission] =
    useState<IntentPermission | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessState, setAccessState] =
    useState<AccessState>("loading");
  const [planName, setPlanName] = useState("");
  const [error, setError] = useState("");

  const [storageKey, setStorageKey] = useState(
    `${STORAGE_KEY_PREFIX}-unknown`
  );

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (accessState !== "allowed") {
      return;
    }

    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [accessState, storageKey]);

  useEffect(() => {
    if (accessState !== "allowed") {
      return;
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify(messages)
    );
  }, [messages, accessState, storageKey]);

  async function checkAccess() {
    setAccessState("loading");
    setError("");

    try {
      const {
        data: debugSession,
        error: debugSessionError,
      } = await supabase.auth.getSession();

      console.log("AI SESSION DEBUG:", {
        hasSession: !!debugSession.session,
        userId: debugSession.session?.user?.id ?? null,
        error: debugSessionError,
      });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError(
          isEnglish
            ? "Please log in first."
            : "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B."
        );
        setAccessState("denied");
        return;
      }

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("company_members")
        .select("company_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (membershipError) {
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        setError(
          isEnglish
            ? "You are not connected to a company."
            : "حسابك غير مرتبط بأي شركة."
        );
        setAccessState("denied");
        return;
      }

      const membership = memberships[0];

      setStorageKey(
        `${STORAGE_KEY_PREFIX}-${user.id}-${membership.company_id}`
      );

      const {
        data: subscriptions,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .select("plan_id, status, end_date, created_at")
        .eq("company_id", membership.company_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (subscriptionError) {
        throw subscriptionError;
      }

      if (!subscriptions || subscriptions.length === 0) {
        setError(
          isEnglish
            ? "Your company does not have an active subscription."
            : "\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0644\u0644\u0627\u0633\u062A\u0641\u0627\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u064A\u0632\u0627\u062A\u002E"
        );
        setAccessState("denied");
        return;
      }

      const subscription = subscriptions[0];

      if (
        subscription.end_date &&
        new Date(subscription.end_date) < new Date()
      ) {
        setError(
          isEnglish
            ? "Your subscription has expired."
            : "\u0627\u0634\u062A\u0631\u0643 \u0644\u0644\u0627\u0633\u062A\u0641\u0627\u062F\u0629 \u0645\u0646 \u0627\u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0643\u0627\u0645\u0644\u0629."
        );
        setAccessState("denied");
        return;
      }

      const {
        data: plan,
        error: planError,
      } = await supabase
        .from("plans")
        .select("name")
        .eq("id", subscription.plan_id)
        .eq("is_active", true)
        .maybeSingle();

      if (planError) {
        throw planError;
      }

      if (!plan) {
        setError(
          isEnglish
            ? "Active plan not found."
            : "\u062D\u0633\u0646\u0627\u064B\u060C \u0633\u0623\u0642\u0648\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 \u062E\u0637\u0629 \u0627\u0644\u0623\u0646\u0634\u0637\u0629."
        );
        setAccessState("denied");
        return;
      }

      setPlanName(plan.name);

      if (!hasFeature(plan.name, "ai")) {
        setError(
          isEnglish
            ? "AI Assistant is not available on your current plan."
            : "\u0644\u0623\u0633\u0641\u060C \u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0645\u062A\u0627\u062D \u0641\u064A \u062E\u0637\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629."
        );
        setAccessState("denied");
        return;
      }

      setAccessState("allowed");
    } catch (err) {
      console.error("AI access error:", err);

      setError(
        err instanceof Error
          ? err.message
          : isEnglish
            ? "Something went wrong."
            : "حدث خطأ غير متوقع."
      );

      setAccessState("error");
    }
  }

  function getActionMeta(type: IntentActionType) {
    switch (type) {
      case "create_customer":
        return {
          icon: UserPlus,
          title: isEnglish ? "Create Customer" : "\u0625\u0646\u0634\u0627\u0621 \u0639\u0645\u064A\u0644",
          description: isEnglish
            ? "A new customer will be created."
            : "\u0633\u064A\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F.",
          border: "border-blue-200",
          iconBg: "bg-blue-50",
          iconText: "text-blue-600",
          line: "bg-blue-500",
        };

      case "create_order":
        return {
          icon: ShoppingCart,
          title: isEnglish ? "Create Order" : "\u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628",
          description: isEnglish
            ? "A new order will be prepared."
            : "\u0633\u064A\u062A\u0645 \u062A\u062C\u0647\u064A\u0632 \u0637\u0644\u0628 \u062C\u062F\u064A\u062F.",
          border: "border-green-200",
          iconBg: "bg-green-50",
          iconText: "text-green-600",
          line: "bg-green-500",
        };

      case "create_task":
        return {
          icon: ListTodo,
          title: isEnglish ? "Create Task" : "إنشاء مهمة",
          description: isEnglish
            ? "A new task will be created."
            : "سيتم إنشاء مهمة جديدة.",
          border: "border-orange-200",
          iconBg: "bg-orange-50",
          iconText: "text-orange-600",
          line: "bg-orange-500",
        };

      case "assign_task":
        return {
          icon: UserRoundCheck,
          title: isEnglish ? "Assign Task" : "\u062A\u0639\u064A\u064A\u0646 \u0645\u0647\u0645\u0629",
          description: isEnglish
            ? "The task will be assigned to an employee."
            : "\u0633\u064A\u062A\u0645 \u062A\u0639\u064A\u064A\u0646 \u0645\u0647\u0645\u0629 \u0644\u0645\u0648\u0638\u0641.",
          border: "border-purple-200",
          iconBg: "bg-purple-50",
          iconText: "text-purple-600",
          line: "bg-purple-500",
        };

      case "update_customer":
        return {
          icon: UserRoundPen,
          title: isEnglish ? "Update Customer" : "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0645\u064A\u0644",
          description: isEnglish
            ? "Customer information will be updated."
            : "\u0633\u064A\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0639\u0645\u064A\u0644.",
          border: "border-cyan-200",
          iconBg: "bg-cyan-50",
          iconText: "text-cyan-600",
          line: "bg-cyan-500",
        };

      case "update_order":
        return {
          icon: RefreshCcw,
          title: isEnglish ? "Update Order" : "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0637\u0644\u0628",
          description: isEnglish
            ? "Order information will be updated."
            : "\u0633\u064A\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0628.",
          border: "border-emerald-200",
          iconBg: "bg-emerald-50",
          iconText: "text-emerald-600",
          line: "bg-emerald-600",
        };

      case "update_task":
        return {
          icon: PencilLine,
          title: isEnglish ? "Update Task" : "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0647\u0645\u0629",
          description: isEnglish
            ? "Task information will be updated."
            : "سيتم تحديث بيانات المهمة.",
          border: "border-amber-200",
          iconBg: "bg-amber-50",
          iconText: "text-amber-600",
          line: "bg-amber-600",
        };
    }
  }

  function getEntityValue(
    entities: IntentEntities,
    key: keyof IntentEntities
  ) {
    const value = entities[key];

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return null;
    }

    return String(value);
  }

  function EntityField({
    labelEn,
    labelAr,
    value,
  }: {
    labelEn: string;
    labelAr: string;
    value: string | null;
  }) {
    if (!value) {
      return null;
    }

    return (
      <div>
        <p className="text-xs text-black/50">
          {isEnglish ? labelEn : labelAr}
        </p>

        <p className="mt-1 break-words font-medium">
          {value}
        </p>
      </div>
    );
  }

  function ActionDetails({
    action,
    index,
  }: {
    action: IntentAction;
    index: number;
  }) {
    if (!intentPlan) {
      return null;
    }

    const entities = intentPlan.entities;

    const customerName = getEntityValue(
      entities,
      "customer_name"
    );

    const customerId = getEntityValue(
      entities,
      "customer_id"
    );

    const service = getEntityValue(
      entities,
      "service"
    );

    const taskTitle = getEntityValue(
      entities,
      "task_title"
    );

    const taskId = getEntityValue(
      entities,
      "task_id"
    );

    const orderId = getEntityValue(
      entities,
      "order_id"
    );

    const assignedEmployee =
      getEntityValue(
        entities,
        "assigned_employee_name"
      ) ||
      getEntityValue(
        entities,
        "assigned_to"
      );

    const dueDate = getEntityValue(
      entities,
      "due_date"
    );

    const priority = getEntityValue(
      entities,
      "priority"
    );

    const status = getEntityValue(
      entities,
      "status"
    );

    return (
      <div className="mt-4 space-y-4">
        {action.type !== "assign_task" && (
          <>
            <EntityField
              labelEn="Customer"
              labelAr="العميل"
              value={customerName}
            />

            <EntityField
              labelEn="Customer ID"
              labelAr="معرف العميل"
              value={customerId}
            />
          </>
        )}

        {(action.type === "create_order" ||
          action.type === "update_order") && (
          <>
            <EntityField
              labelEn="Service / Product"
              labelAr="الخدمة / المنتج"
              value={service}
            />

            {entities.amount !== undefined &&
              entities.amount !== null && (
                <EntityField
                  labelEn="Amount"
                  labelAr="المبلغ"
                  value={`${entities.amount} ${
                    entities.currency ||
                    (isEnglish ? "EGP" : "جنيه")
                  }`}
                />
              )}

            <EntityField
              labelEn="Order ID"
              labelAr="معرف الطلب"
              value={orderId}
            />

            <EntityField
              labelEn="Status"
              labelAr="الحالة"
              value={status}
            />
          </>
        )}

        {(action.type === "create_task" ||
          action.type === "update_task") && (
          <>
            <EntityField
              labelEn="Task"
              labelAr="المهمة"
              value={taskTitle}
            />

            <EntityField
              labelEn="Task ID"
              labelAr="معرف المهمة"
              value={taskId}
            />

            <EntityField
              labelEn="Due date"
              labelAr="تاريخ الاستحقاق"
              value={dueDate}
            />

            <EntityField
              labelEn="Priority"
              labelAr="الأولوية"
              value={priority}
            />


            {action.type === "update_task" && (
              <>
                <EntityField
                  labelEn="Assigned to"
                  labelAr=""
                  value={assignedEmployee}
                />

                <EntityField
                  labelEn="New task title"
                  labelAr=""
                  value={getEntityValue(entities, "new_task_title")}
                />
              </>
            )}
            <EntityField
              labelEn="Status"
              labelAr="الحالة"
              value={status}
            />
          </>
        )}

        {action.type === "assign_task" && (
          <>
            <EntityField
              labelEn="Task"
              labelAr="المهمة"
              value={taskTitle}
            />

            <EntityField
              labelEn="Task ID"
              labelAr="معرف المهمة"
              value={taskId}
            />

            <EntityField
              labelEn="Employee"
              labelAr="الموظف"
              value={assignedEmployee}
            />
          </>
        )}

        {action.type === "create_customer" && (
          <EntityField
            labelEn="Customer"
            labelAr="العميل"
            value={customerName}
          />
        )}

        {(action.depends_on?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
            <p className="text-xs text-black/50">
              {isEnglish ? "Depends on" : "يعتمد على"}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {action.depends_on.map(
                (dependency, dependencyIndex) => (
                  <span
                    key={`${dependency}-${dependencyIndex}`}
                    className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium"
                  >
                    {dependency}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-black/50">
          <span>
            {isEnglish
              ? `Step ${index + 1}`
              : `الخطوة ${index + 1}`}
          </span>

          <ArrowRight
            className={`h-3.5 w-3.5 ${
              isEnglish ? "" : "rotate-180"
            }`}
          />

          <span>
            {action.mode === "ai_auto"
              ? isEnglish
                ? "AI automatic"
                : "تنفيذ تلقائي بالذكاء الاصطناعي"
              : action.mode === "manager_approval"
                ? isEnglish
                  ? "Manager approval"
                  : "موافقة المدير"
                : isEnglish
                  ? "Manual"
                  : "يدوي"}
          </span>
        </div>
      </div>
    );
  }

  function cancelIntentPlan() {
    setIntentPlan(null);
    setIntentPermission(null);
    setAmbiguousCustomers([]);

  function selectAmbiguousCustomer(
    customer: CustomerSelection
  ) {
    if (!intentPlan) {
      return;
    }

    setIntentPlan({
      ...intentPlan,
      entities: {
        ...intentPlan.entities,
        customer_id: customer.id,
        customer_name: customer.name,
      },
    });

    setAmbiguousCustomers([]);
    setError("");
  }
  }

  function selectAmbiguousCustomer(
    customer: CustomerSelection
  ) {
    if (!intentPlan) {
      return;
    }

    setIntentPlan({
      ...intentPlan,
      entities: {
        ...intentPlan.entities,
        customer_id: customer.id,
        customer_name: customer.name,
      },
    });

    setAmbiguousCustomers([]);
    setError("");
  }

  async function confirmIntentPlan() {
    if (!intentPlan || loading) {
      return;
    }

    if (
      intentPermission &&
      !intentPermission.allowed
    ) {
      setError(
        isEnglish
          ? "You do not have permission to confirm this action plan."
          : "لا تملك صلاحية تأكيد خطة الإجراءات التالية."
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/ai/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intentPlan,
          }),
        }
      );

      const data = await response.json();

      const failedResult =
        Array.isArray(data?.results)
          ? data.results.find(
              (result: {
                success?: boolean;
                message?: string;
                error?: string;
                data?: unknown;
              }) => result?.success === false
            )
          : null;

      if (!response.ok || !data?.success) {
        const resultData =
          failedResult?.data &&
          typeof failedResult.data === "object"
            ? (failedResult.data as {
                code?: string;
                customer_name?: string | null;
                customers?: CustomerSelection[];
              })
            : null;

        if (
          failedResult?.error ===
          "CUSTOMER_AMBIGUOUS"
        ) {
          const customers =
            Array.isArray(failedResult?.data && typeof failedResult.data === "object" ? (failedResult.data as { customers?: CustomerSelection[] }).customers : undefined)
              ? ((failedResult.data as { customers?: CustomerSelection[] }).customers ?? []).filter(
                  (customer) =>
                    customer &&
                    typeof customer.id ===
                      "string" &&
                    typeof customer.name ===
                      "string"
                )
              : [];

          setAmbiguousCustomers(customers);

          setError(
            isEnglish
              ? "More than one customer matches. Select the correct customer."
              : "يوجد أكثر من عميل مطابق. اختر العميل الصحيح."
          );

          return;
        }

        throw new Error(
          data?.error ||
            failedResult?.message ||
            failedResult?.error ||
            (isEnglish
              ? "Failed to execute the action plan."
              : "فشل تنفيذ خطة الإجراءات.")
        );
      }

      const successfulResults =
        Array.isArray(data.results)
          ? data.results.filter(
              (result: {
                success?: boolean;
              }) => result?.success
            )
          : [];

      const successMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: isEnglish
          ? successfulResults.length === 1
            ? "The action was executed and verified successfully."
            : "The action plan was executed and verified successfully."
          : successfulResults.length === 1
            ? "تم تنفيذ الإجراء والتحقق منه بنجاح."
            : "تم تنفيذ خطة الإجراءات والتحقق منها بنجاح.",
        created_at:
          new Date().toISOString(),
      };

      setMessages((current) => [
        ...current,
        successMessage,
      ]);

      setIntentPlan(null);
      setIntentPermission(null);
      setAmbiguousCustomers([]);
    } catch (err) {
      console.error(
        "Intent plan execution error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : isEnglish
            ? "Failed to execute the action plan."
            : "فشل تنفيذ خطة الإجراءات."
      );
    } finally {
      setLoading(false);
    }
  }
  async function confirmProposedAction() {
    if (!proposedAction) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (proposedAction.type === "create_customer") {
        const response = await fetch(
          "/api/ai/actions/customer",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name:
                proposedAction.name ||
                proposedAction.customer_name ||
                "",
              phone: proposedAction.phone || "",
              email: proposedAction.email || "",
              notes: proposedAction.notes || "",
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              (isEnglish
                ? "Failed to create the customer."
                : "┘ü╪┤┘ä ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪╣┘à┘è┘ä.")
          );
        }

        const successMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isEnglish
            ? "The customer was created successfully."
            : "╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪╣┘à┘è┘ä ╪¿┘å╪¼╪º╪¡.",
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [
          ...current,
          successMessage,
        ]);

        setProposedAction(null);
        return;
      }

      if (proposedAction.type === "create_task") {
        const response = await fetch(
          "/api/ai/actions/task",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: proposedAction.title,
              description: proposedAction.description,
              due_date: proposedAction.due_date,
              priority: proposedAction.priority === "high" ? "\u0639\u0627\u0644\u064a\u0629" : proposedAction.priority === "low" ? "\u0645\u0646\u062e\u0641\u0636\u0629" : proposedAction.priority === "medium" ? "\u0645\u062a\u0648\u0633\u0637\u0629" : proposedAction.priority,
              status: proposedAction.status,
              customer_id: proposedAction.customer_id,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              (isEnglish
                ? "Failed to create the task."
                : "┘ü╪┤┘ä ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à┘ç┘à╪⌐.")
          );
        }

        const successMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isEnglish
            ? "The task was created successfully."
            : "╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à┘ç┘à╪⌐ ╪¿┘å╪¼╪º╪¡.",
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [
          ...current,
          successMessage,
        ]);

        setProposedAction(null);
        return;
      }

      if (proposedAction.type === "create_order") {
        const response = await fetch(
          "/api/ai/actions/order",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customer_id: proposedAction.customer_id,
              customer_name: proposedAction.customer_name,
              service: proposedAction.service,
              total: proposedAction.total,
              status: proposedAction.status,
              notes: proposedAction.notes,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              (isEnglish
                ? "Failed to create the order."
                : "┘ü╪┤┘ä ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪╖┘ä╪¿.")
          );
        }

        const successMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: isEnglish
            ? "The order was created successfully."
            : "╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪╖┘ä╪¿ ╪¿┘å╪¼╪º╪¡.",
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [
          ...current,
          successMessage,
        ]);

        setProposedAction(null);
      }
    } catch (err) {
      console.error(
        "AI action confirmation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : isEnglish
            ? "Failed to execute the action."
            : "╪¬╪╣╪░╪▒ ╪¬┘å┘ü┘è╪░ ╪º┘ä╪Ñ╪¼╪▒╪º╪í."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");
    setError("");
    setLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          locale,
          conversationHistory: messages.slice(-20).map((item) => ({
            role: item.role,
            content: item.content,
          })),
          pendingAction: proposedAction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEnglish
              ? "AI request failed."
              : "فشل طلب الذكاء الاصطناعي.")
        );
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        created_at: new Date().toISOString(),
      };

      if (data.intentPlan) {
        setIntentPlan(data.intentPlan);
        setIntentPermission(
          data.intentPermission ?? null
        );
        setAmbiguousCustomers([]);
        setProposedAction(null);
      } else if (data.action) {
        setIntentPlan(null);
        setIntentPermission(null);
        setAmbiguousCustomers([]);
        setProposedAction(data.action);
      } else {
        setIntentPlan(null);
        setIntentPermission(null);
        setAmbiguousCustomers([]);
        setProposedAction(null);
      }

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (err) {
      console.error("AI message error:", err);

      setError(
        err instanceof Error
          ? err.message
          : isEnglish
            ? "Failed to get AI response."
            : "فشل الحصول على استجابة الذكاء الاصطناعي."
      );
    } finally {
      setLoading(false);
    }
  }
  function clearMessages() {
    setMessages([]);
    setIntentPlan(null);
    setIntentPermission(null);
    setAmbiguousCustomers([]);
    setProposedAction(null);
    localStorage.removeItem(storageKey);
  }

  if (accessState === "loading") {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="min-h-screen bg-white text-black"
      >
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }

  if (
    accessState === "denied" ||
    accessState === "error"
  ) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="min-h-screen bg-white text-black"
      >
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold">
              {isEnglish
                ? "AI Assistant"
                : "المساعد الذكي"}
            </h1>

            <p className="mt-3 text-sm text-black/60">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-screen bg-white text-black"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
              <Bot className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                {isEnglish
                  ? "AI Assistant"
                  : "المساعد الذكي"}
              </h1>

              <p className="text-sm text-black/50">
                {isEnglish
                  ? "BusinessOS intelligent assistant"
                  : "المساعد الذكي لمنصة BusinessOS"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium">
              {planName}
            </span>

            <button
              type="button"
              onClick={clearMessages}
              className="flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
            >
              <Trash2 className="h-4 w-4" />

              {isEnglish ? "Clear" : "مسح"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="min-h-[55vh] space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
                <Sparkles className="mb-4 h-10 w-10" />

                <h2 className="text-xl font-semibold">
                  {isEnglish
                    ? "How can I help you?"
                    : "كيف يمكنني مساعدتك؟"}
                </h2>

                <p className="mt-2 max-w-md text-sm text-black/50">
                  {isEnglish
                    ? "Ask about your business, customers, orders, tasks, or other available BusinessOS data."
                    : "اسألني عن نشاطك التجاري أو العملاء أو الطلبات أو المهام أو بيانات BusinessOS المتاحة."}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                      message.role === "user"
                        ? "bg-black text-white"
                        : "border border-black/10 bg-black/[0.03] text-black"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />

                  {isEnglish
                    ? "Thinking..."
                    : "جاري التفكير..."}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-black/10 px-4 py-3 text-sm text-black/70">
              {error}
            </div>
          )}

          {intentPlan && (
            <div className="border-t border-black/10 bg-black/[0.02] p-4">
              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                      <Sparkles className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-bold">
                        {isEnglish
                          ? "Action Plan"
                          : "خطة الإجراءات"}
                      </h2>

                      <p className="mt-1 text-xs text-black/50">
                        {isEnglish
                          ? "Review the actions before confirmation."
                          : "راجع الإجراءات قبل التأكيد."}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium">
                    {intentPlan.actions.length}{" "}
                    {isEnglish
                      ? intentPlan.actions.length === 1
                        ? "action"
                        : "actions"
                      : "إجراء"}
                  </span>
                </div>

                {intentPermission && (
                  <div
                    className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${
                      intentPermission.allowed
                        ? "border-green-200 bg-green-50/50"
                        : "border-red-200 bg-red-50/50"
                    }`}
                  >
                    {intentPermission.allowed ? (
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    ) : (
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    )}

                    <div>
                      <p className="text-sm font-semibold">
                        {intentPermission.allowed
                          ? isEnglish
                            ? "Permission check passed"
                            : "تم اجتياز فحص الصلاحيات"
                          : isEnglish
                            ? "Permission check failed"
                            : "فشل فحص الصلاحيات"}
                      </p>

                      <p className="mt-1 text-xs text-black/60">
                        {intentPermission.allowed
                          ? isEnglish
                            ? "You are allowed to confirm this action plan."
                            : "لديك صلاحية تأكيد خطة الإجراءات هذه."
                          : isEnglish
                            ? "One or more actions are not allowed for your role."
                            : "يوجد إجراء أو أكثر غير مسموح به لدورك."}
                      </p>

                      {!intentPermission.allowed &&
                        intentPermission.results
                          .filter(
                            (result) =>
                              !result.allowed
                          )
                          .map((result) => (
                            <p
                              key={`${result.action}-${result.reason}`}
                              className="mt-2 text-xs text-red-700"
                            >
                              {result.reason}
                            </p>
                          ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {intentPlan.actions.map(
                    (action, index) => {
                      const meta =
                        getActionMeta(
                          action.type
                        );

                      const Icon = meta.icon;

                      return (
                        <div
                          key={`${action.type}-${index}`}
                          className={`relative overflow-hidden rounded-2xl border ${meta.border} bg-white`}
                        >
                          <div
                            className={`absolute inset-y-0 start-0 w-1 ${meta.line}`}
                          />

                          <div className="p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg} ${meta.iconText}`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold">
                                    {meta.title}
                                  </h3>

                                  {action.requires_confirmation && (
                                    <span className="rounded-full border border-black/10 bg-black/[0.02] px-2 py-0.5 text-[10px] font-medium">
                                      {isEnglish
                                        ? "Confirmation required"
                                        : "يتطلب تأكيدًا"}
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-xs text-black/50">
                                  {meta.description}
                                </p>
                              </div>

                              <span className="shrink-0 text-xs font-semibold text-black/40">
                                #{index + 1}
                              </span>
                            </div>

                            <ActionDetails
                              action={action}
                              index={index}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

        {ambiguousCustomers.length > 0 && (
          <div className="mb-5 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
            <p className="text-sm font-semibold">
              {isEnglish ? "Select the customer" : "اختر العميل"}
            </p>
            <p className="mt-1 text-xs text-black/50">
              {isEnglish
                ? "More than one customer matches this name."
                : "???? ???? ?? ???? ????? ???? ?????. اختر العميل ??????."}
            </p>

            <div className="mt-3 space-y-2">
              {ambiguousCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() =>
                    selectAmbiguousCustomer(customer)
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 text-start transition hover:bg-black/[0.03]"
                >
                  <span className="font-medium">
                    {customer.name}
                  </span>
                  <span className="text-xs text-black/40">
                    {customer.id.slice(0, 8)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={confirmIntentPlan}
                    disabled={
                      loading ||
                      (intentPermission !==
                        null &&
                        !intentPermission.allowed)
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check className="h-4 w-4" />

                    {isEnglish
                      ? "Confirm plan"
                      : "تأكيد الخطة"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelIntentPlan}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />

                    {isEnglish ? "Cancel" : "إلغاء"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!intentPlan && proposedAction && (
            <div className="border-t border-black/10 bg-black/[0.02] p-4">
              <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-sm font-semibold">
                    {proposedAction.type ===
                    "create_customer"
                      ? isEnglish
                        ? "Proposed customer"
                        : "عميل مقترح"
                      : proposedAction.type ===
                          "create_order"
                        ? isEnglish
                          ? "New order"
                          : "طلب مقترح"
                        : isEnglish
                          ? "Proposed task"
                          : "مهمة مقترحة"}
                  </p>

                  <p className="mt-1 text-xs text-black/50">
                    {isEnglish
                      ? "Review the details before confirming."
                      : "راجع التفاصيل قبل التأكيد."}
                  </p>
                </div>

                {proposedAction.type ===
                  "create_customer" && (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-black/50">
                        {isEnglish
                          ? "Name"
                          : "الاسم"}
                      </p>

                      <p className="mt-1 font-medium">
                        {proposedAction.name ||
                          proposedAction.customer_name ||
                          "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-black/50">
                        {isEnglish
                          ? "Phone"
                          : "الهاتف"}
                      </p>

                      <p className="mt-1 font-medium">
                        {proposedAction.phone ||
                          "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-black/50">
                        {isEnglish
                          ? "Email"
                          : "البريد الإلكتروني"}
                      </p>

                      <p className="mt-1 font-medium">
                        {proposedAction.email ||
                          "-"}
                      </p>
                    </div>

                    {proposedAction.notes && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Notes"
                            : "ملاحظات"}
                        </p>

                        <p className="mt-1">
                          {proposedAction.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {proposedAction.type ===
                  "create_order" && (
                  <div className="space-y-3 text-sm">
                    {proposedAction.customer_name && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Customer"
                            : "العميل"}
                        </p>

                        <p className="mt-1 font-medium">
                          {
                            proposedAction.customer_name
                          }
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-black/50">
                        {isEnglish
                          ? "Service"
                          : "الخدمة"}
                      </p>

                      <p className="mt-1 font-medium">
                        {proposedAction.service ||
                          "-"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Total"
                            : "الإجمالي"}
                        </p>

                        <p className="mt-1 font-medium">
                          {Number(
                            proposedAction.total ||
                              0
                          ).toLocaleString(
                            isEnglish
                              ? "en-US"
                              : "ar-EG"
                          )}{" "}
                          {isEnglish
                            ? "EGP"
                            : "جنيه"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Status"
                            : "الحالة"}
                        </p>

                        <p className="mt-1 font-medium">
                          {proposedAction.status ||
                            "-"}
                        </p>
                      </div>
                    </div>

                    {proposedAction.notes && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Notes"
                            : "ملاحظات"}
                        </p>

                        <p className="mt-1">
                          {proposedAction.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {proposedAction.type ===
                  "create_task" && (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-black/50">
                        {isEnglish
                          ? "Title"
                          : "العنوان"}
                      </p>

                      <p className="mt-1 font-medium">
                        {proposedAction.title ||
                          "-"}
                      </p>
                    </div>

                    {proposedAction.customer_name && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Customer"
                            : "العميل"}
                        </p>

                        <p className="mt-1 font-medium">
                          {
                            proposedAction.customer_name
                          }
                        </p>
                      </div>
                    )}

                    {proposedAction.description && (
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Description"
                            : "الوصف"}
                        </p>

                        <p className="mt-1">
                          {
                            proposedAction.description
                          }
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Due date"
                            : "تاريخ الاستحقاق"}
                        </p>

                        <p className="mt-1">
                          {
                            proposedAction.due_date ||
                            "-"
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Priority"
                            : "الأولوية"}
                        </p>

                        <p className="mt-1">
                          {
                            proposedAction.priority ||
                            "-"
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-black/50">
                          {isEnglish
                            ? "Status"
                            : "الحالة"}
                        </p>

                        <p className="mt-1">
                          {
                            proposedAction.status ||
                            "-"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={
                      confirmProposedAction
                    }
                    disabled={loading}
                    className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? isEnglish
                        ? "Creating..."
                        : "جاري الإنشاء..."
                      : proposedAction.type ===
                          "create_customer"
                        ? isEnglish
                          ? "Confirm and create customer"
                          : "تأكيد وإنشاء العميل"
                        : proposedAction.type ===
                            "create_order"
                          ? isEnglish
                            ? "Confirm and create order"
                            : "تأكيد وإنشاء الطلب"
                          : isEnglish
                            ? "Confirm and create task"
                            : "تأكيد وإنشاء المهمة"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setProposedAction(null)
                    }
                    disabled={loading}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEnglish
                      ? "Cancel"
                      : "إلغاء"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form
            onSubmit={sendMessage}
            className="border-t border-black/10 p-4"
          >
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                disabled={loading}
                placeholder={
                  isEnglish
                    ? "Ask BusinessOS AI..."
                    : "اسأل مساعد BusinessOS..."
                }
                className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !input.trim()
                }
                className="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                <span className="hidden sm:inline">
                  {isEnglish
                    ? "Send"
                    : "إرسال"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}






