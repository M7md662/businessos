"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  Clock3,
  Loader2,
  Plus,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";

type TaskStatus = "جديدة" | "قيد التنفيذ" | "مكتملة";
type Priority = "منخفضة" | "متوسطة" | "عالية";

type Task = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  customer_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assignment_type: string | null;
  assignment_status: string | null;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
};

const STATUS_VALUES: TaskStatus[] = [
  "جديدة",
  "قيد التنفيذ",
  "مكتملة",
];

const PRIORITY_VALUES: Priority[] = [
  "منخفضة",
  "متوسطة",
  "عالية",
];

function getStatusLabel(status: string, locale: string) {
  if (locale === "en") {
    if (status === "جديدة" || status === "pending") return "New";
    if (status === "قيد التنفيذ" || status === "in_progress") {
      return "In progress";
    }
    if (status === "مكتملة" || status === "completed") {
      return "Completed";
    }
  }

  return status;
}

function getPriorityLabel(priority: string, locale: string) {
  if (locale === "en") {
    if (priority === "عالية" || priority === "high") return "High";
    if (priority === "متوسطة" || priority === "medium") {
      return "Medium";
    }
    if (priority === "منخفضة" || priority === "low") {
      return "Low";
    }
  }

  return priority;
}

function getRoleLabel(role: string, locale: string) {
  if (locale === "en") {
    if (role === "owner") return "Owner";
    if (role === "manager") return "Manager";
    if (role === "sales") return "Sales";
    if (role === "support") return "Support";
    return "Employee";
  }

  if (role === "owner") return "مالك الشركة";
  if (role === "manager") return "مدير";
  if (role === "sales") return "مبيعات";
  if (role === "support") return "دعم";

  return "موظف";
}

function normalizeStatus(status: string): TaskStatus {
  if (status === "قيد التنفيذ" || status === "in_progress") {
    return "قيد التنفيذ";
  }

  if (status === "مكتملة" || status === "completed") {
    return "مكتملة";
  }

  return "جديدة";
}

function normalizePriority(priority: string): Priority {
  if (priority === "عالية" || priority === "high") {
    return "عالية";
  }

  if (priority === "منخفضة" || priority === "low") {
    return "منخفضة";
  }

  return "متوسطة";
}

export default function TasksPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] =
    useState<Priority>("متوسطة");
  const [newDueDate, setNewDueDate] = useState("");

  const [editStatus, setEditStatus] =
    useState<TaskStatus>("جديدة");
  const [editPriority, setEditPriority] =
    useState<Priority>("متوسطة");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");

  const text = isEnglish
    ? {
        title: "Tasks",
        subtitle: "Manage work, assignments and execution",
        newTask: "New task",
        allTasks: "All tasks",
        newCount: "New",
        inProgress: "In progress",
        completed: "Completed",
        noTasks: "No tasks yet",
        createFirst: "Create the first task to start managing work.",
        details: "Task details",
        close: "Close",
        titleField: "Title",
        description: "Description",
        status: "Status",
        priority: "Priority",
        dueDate: "Due date",
        assignment: "Assignment",
        assignedEmployee: "Assigned employee",
        unassigned: "Unassigned",
        assignmentType: "Assignment type",
        manager: "Manager",
        ai: "AI",
        assignmentStatus: "Assignment status",
        assigned: "Assigned",
        pending: "Pending",
        reassigned: "Reassigned",
        cancelled: "Cancelled",
        save: "Save changes",
        assign: "Assign task",
        reassign: "Reassign",
        removeAssignment: "Remove assignment",
        create: "Create task",
        cancel: "Cancel",
        creating: "Creating...",
        saving: "Saving...",
        taskTitlePlaceholder: "Enter task title",
        descriptionPlaceholder: "Describe the task...",
        employee: "Employee",
        created: "Created",
        ownerOnly: "Only the company owner can change task assignment.",
        assignedToMe: "Assigned to me",
      }
    : {
        title: "المهام",
        subtitle: "إدارة العمل والتعيينات والتنفيذ",
        newTask: "مهمة جديدة",
        allTasks: "كل المهام",
        newCount: "جديدة",
        inProgress: "قيد التنفيذ",
        completed: "مكتملة",
        noTasks: "لا توجد مهام",
        createFirst: "أنشئ أول مهمة لبدء إدارة العمل.",
        details: "تفاصيل المهمة",
        close: "إغلاق",
        titleField: "عنوان المهمة",
        description: "الوصف",
        status: "الحالة",
        priority: "الأولوية",
        dueDate: "تاريخ الاستحقاق",
        assignment: "التعيين",
        assignedEmployee: "الموظف المعيّن",
        unassigned: "غير معيّنة",
        assignmentType: "نوع التعيين",
        manager: "مدير",
        ai: "ذكاء اصطناعي",
        assignmentStatus: "حالة التعيين",
        assigned: "مُعيّنة",
        pending: "معلّقة",
        reassigned: "أعيد تعيينها",
        cancelled: "ملغاة",
        save: "حفظ التغييرات",
        assign: "تعيين المهمة",
        reassign: "إعادة التعيين",
        removeAssignment: "إلغاء التعيين",
        create: "إنشاء المهمة",
        cancel: "إلغاء",
        creating: "جاري الإنشاء...",
        saving: "جاري الحفظ...",
        taskTitlePlaceholder: "اكتب عنوان المهمة",
        descriptionPlaceholder: "اكتب وصف المهمة...",
        employee: "موظف",
        created: "تاريخ الإنشاء",
        ownerOnly: "مالك الشركة فقط يستطيع تغيير تعيين المهمة.",
        assignedToMe: "مُسندة إليّ",
      };

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          isEnglish
            ? "Please sign in first."
            : "يجب تسجيل الدخول أولاً"
        );
      }

      setCurrentUserId(user.id);

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id, role, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

      if (membershipError) throw membershipError;

      const membership = memberships?.[0];

      if (!membership) {
        throw new Error(
          isEnglish
            ? "No company was found for this account."
            : "لم يتم العثور على شركة لهذا الحساب"
        );
      }

      setCompanyId(membership.company_id);
      setIsOwner(membership.role === "owner");

      const { data: taskRows, error: tasksError } =
        await supabase
          .from("tasks")
          .select(
            "id, company_id, title, description, status, priority, due_date, created_at, customer_id, assigned_to, assigned_by, assignment_type, assignment_status"
          )
          .eq("company_id", membership.company_id)
          .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      setTasks((taskRows || []) as Task[]);

      if (membership.role === "owner") {
        const { data: memberRows, error: membersError } =
          await supabase
            .from("company_members")
            .select("id, user_id, role, created_at")
            .eq("company_id", membership.company_id)
            .order("created_at", { ascending: true });

        if (membersError) throw membersError;

        setMembers((memberRows || []) as Member[]);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isEnglish
          ? "Failed to load tasks."
          : "حدث خطأ أثناء تحميل المهام"
      );
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    setError("");
    setMessage("");

    if (!newTitle.trim()) {
      setError(
        isEnglish
          ? "Enter a task title."
          : "اكتب عنوان المهمة"
      );
      return;
    }

    if (!companyId) return;

    setSaving(true);

    try {
      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({
          company_id: companyId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          priority: newPriority,
          status: "جديدة",
          due_date: newDueDate || null,
          assignment_type: "manager",
          assignment_status: "assigned",
          assigned_to: null,
          assigned_by: isOwner ? currentUserId : null,
        })
        .select(
          "id, company_id, title, description, status, priority, due_date, created_at, customer_id, assigned_to, assigned_by, assignment_type, assignment_status"
        )
        .single();

      if (insertError) throw insertError;

      setTasks((current) => [data as Task, ...current]);

      setNewTitle("");
      setNewDescription("");
      setNewPriority("متوسطة");
      setNewDueDate("");
      setShowCreate(false);

      setMessage(
        isEnglish
          ? "Task created successfully."
          : "تم إنشاء المهمة بنجاح"
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isEnglish
          ? "Failed to create task."
          : "تعذر إنشاء المهمة"
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveTaskChanges() {
    if (!selectedTask) return;

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const updates: Record<string, unknown> = {
        status: editStatus,
        priority: editPriority,
        due_date: editDueDate || null,
      };

      let assignmentChanged = false;
      let newAssignedTo: string | null = selectedTask.assigned_to;

      if (isOwner) {
        const previousAssignedTo = selectedTask.assigned_to;

        newAssignedTo = editAssignedTo.trim() || null;

        updates.assigned_to = newAssignedTo;
        updates.assigned_by = newAssignedTo ? currentUserId : null;
        updates.assignment_type = "manager";

        if (!newAssignedTo) {
          updates.assignment_status = "cancelled";
        } else if (
          previousAssignedTo &&
          previousAssignedTo !== newAssignedTo
        ) {
          updates.assignment_status = "reassigned";
        } else {
          updates.assignment_status = "assigned";
        }

        assignmentChanged =
          previousAssignedTo !== newAssignedTo;
      }

      const { data, error: updateError } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", selectedTask.id)
        .select(
          "id, company_id, title, description, status, priority, due_date, created_at, customer_id, assigned_to, assigned_by, assignment_type, assignment_status"
        )
        .single();

      if (updateError) throw updateError;

      const updatedTask = data as Task;

      setTasks((current) =>
        current.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        )
      );

      setSelectedTask(updatedTask);

      /*
       * Save assignment history.
       *
       * Important:
       * We use the PREVIOUS assignment data from selectedTask
       * so an original AI assignment is never lost from history.
       */
      if (isOwner && assignmentChanged) {
        const previousAssignedTo =
          selectedTask.assigned_to;

        const previousAssignmentType =
          selectedTask.assignment_type || "manager";

        let historyAction = "assigned";
        let historyReason =
          "Task assignment changed manually by the company owner.";

        if (!newAssignedTo) {
          historyAction = "cancelled";
          historyReason =
            "Task assignment was cancelled manually by the company owner.";
        } else if (
          previousAssignedTo &&
          previousAssignedTo !== newAssignedTo
        ) {
          historyAction = "reassigned";
          historyReason =
            previousAssignmentType === "ai"
              ? "AI assignment was manually reassigned by the company owner."
              : "Task was manually reassigned by the company owner.";
        }

        const { error: historyError } =
          await supabase
            .from("task_assignment_history")
            .insert({
              task_id: updatedTask.id,
              company_id: updatedTask.company_id,
              assigned_to:
                newAssignedTo || previousAssignedTo,
              assigned_by: currentUserId,
              assignment_type:
                previousAssignmentType,
              action: historyAction,
              reason: historyReason,
            });

        if (historyError) {
          console.error(
            "Assignment history creation failed:",
            historyError
          );
        }
      }

      // Create notifications when the owner assigns or reassigns a task.
      if (isOwner && assignmentChanged && newAssignedTo) {
        const isReassignment =
          Boolean(selectedTask.assigned_to) &&
          selectedTask.assigned_to !== newAssignedTo;

        const employeeTitle = isReassignment
          ? "تم إعادة تعيين مهمة"
          : "تم تعيين مهمة جديدة";

        const employeeMessage = isReassignment
          ? `تم إعادة تعيين المهمة "${updatedTask.title}" إليك.`
          : `تم تعيين المهمة "${updatedTask.title}" إليك.`;

        const ownerTitle = isReassignment
          ? "تم إعادة تعيين المهمة"
          : "تم تعيين المهمة";

        const ownerMessage = isReassignment
          ? `تم إعادة تعيين "${updatedTask.title}" إلى موظف جديد.`
          : `تم تعيين "${updatedTask.title}" إلى موظف.`;

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert([
            {
              company_id: updatedTask.company_id,
              user_id: newAssignedTo,
              type: isReassignment
                ? "task_reassigned"
                : "task_assigned",
              title: employeeTitle,
              message: employeeMessage,
              task_id: updatedTask.id,
            },
            {
              company_id: updatedTask.company_id,
              user_id: currentUserId,
              type: isReassignment
                ? "task_reassigned_by_manager"
                : "task_assigned_by_manager",
              title: ownerTitle,
              message: ownerMessage,
              task_id: updatedTask.id,
            },
          ]);

        if (notificationError) {
          console.error(
            "Notification creation failed:",
            notificationError
          );
        }
      }

      setMessage(
        isEnglish
          ? "Task updated successfully."
          : "تم تحديث المهمة بنجاح"
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isEnglish
          ? "Failed to update task."
          : "تعذر تحديث المهمة"
      );
    } finally {
      setSaving(false);
    }
  }
  async function updateEmployeeStatus(
    status: TaskStatus
  ) {
    if (!selectedTask) return;

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const { data, error: updateError } = await supabase
        .from("tasks")
        .update({
          status,
        })
        .eq("id", selectedTask.id)
        .select(
          "id, company_id, title, description, status, priority, due_date, created_at, customer_id, assigned_to, assigned_by, assignment_type, assignment_status"
        )
        .single();

      if (updateError) throw updateError;

      const updatedTask = data as Task;

      setTasks((current) =>
        current.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        )
      );

      setSelectedTask(updatedTask);

      setMessage(
        isEnglish
          ? "Task status updated."
          : "تم تحديث حالة المهمة"
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isEnglish
          ? "Failed to update task status."
          : "تعذر تحديث حالة المهمة"
      );
    } finally {
      setSaving(false);
    }
  }

  function openTask(task: Task) {
    setSelectedTask(task);
    setEditStatus(normalizeStatus(task.status));
    setEditPriority(normalizePriority(task.priority));
    setEditDueDate(task.due_date || "");
    setEditAssignedTo(task.assigned_to || "");
    setError("");
    setMessage("");
  }

  function getMemberLabel(userId: string | null) {
    if (!userId) return text.unassigned;

    const member = members.find(
      (item) => item.user_id === userId
    );

    if (!member) {
      if (userId === currentUserId) {
        return text.assignedToMe;
      }

      return `${text.employee} (${userId.slice(0, 8)})`;
    }

    if (member.user_id === currentUserId) {
      return `${text.assignedToMe} — ${getRoleLabel(
        member.role,
        locale
      )}`;
    }

    return `${text.employee} — ${getRoleLabel(
      member.role,
      locale
    )}`;
  }

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      new: tasks.filter(
        (task) => normalizeStatus(task.status) === "جديدة"
      ).length,
      inProgress: tasks.filter(
        (task) =>
          normalizeStatus(task.status) === "قيد التنفيذ"
      ).length,
      completed: tasks.filter(
        (task) =>
          normalizeStatus(task.status) === "مكتملة"
      ).length,
    };
  }, [tasks]);

  useEffect(() => {
    loadTasks();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-black" />
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-screen bg-white p-4 sm:p-6 lg:p-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black">
              {text.title}
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              {text.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setShowCreate(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            {text.newTask}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-black bg-black px-4 py-3 text-sm font-medium text-white">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-black">
            {message}
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-bold text-neutral-500">
              {text.allTasks}
            </p>
            <p className="mt-2 text-3xl font-black text-black">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-bold text-neutral-500">
              {text.newCount}
            </p>
            <p className="mt-2 text-3xl font-black text-black">
              {stats.new}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-bold text-neutral-500">
              {text.inProgress}
            </p>
            <p className="mt-2 text-3xl font-black text-black">
              {stats.inProgress}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-bold text-neutral-500">
              {text.completed}
            </p>
            <p className="mt-2 text-3xl font-black text-black">
              {stats.completed}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="font-black text-black">
              {text.allTasks}
            </h2>
          </div>

          {tasks.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                <Check className="h-6 w-6" />
              </div>

              <h3 className="font-black text-black">
                {text.noTasks}
              </h3>

              <p className="mt-2 max-w-md text-sm text-neutral-500">
                {text.createFirst}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {tasks.map((task) => {
                const status = normalizeStatus(task.status);
                const priority = normalizePriority(
                  task.priority
                );

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTask(task)}
                    className="flex w-full items-center gap-4 px-5 py-5 text-start transition hover:bg-neutral-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white">
                      <Clock3 className="h-4 w-4 text-black" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-black">
                          {task.title}
                        </p>

                        <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-[10px] font-bold text-black">
                          {getStatusLabel(status, locale)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span>
                          {getPriorityLabel(
                            priority,
                            locale
                          )}
                        </span>

                        {task.assigned_to && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3 w-3" />
                            {getMemberLabel(
                              task.assigned_to
                            )}
                          </span>
                        )}

                        {!task.assigned_to && (
                          <span>{text.unassigned}</span>
                        )}

                        {task.due_date && (
                          <span>{task.due_date}</span>
                        )}
                      </div>
                    </div>

                    <ChevronLeft className="h-5 w-5 shrink-0 text-neutral-400" />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-black">
                {text.newTask}
              </h2>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-black">
                  {text.titleField}
                </label>

                <input
                  value={newTitle}
                  onChange={(event) =>
                    setNewTitle(event.target.value)
                  }
                  placeholder={text.taskTitlePlaceholder}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-black">
                  {text.description}
                </label>

                <textarea
                  value={newDescription}
                  onChange={(event) =>
                    setNewDescription(event.target.value)
                  }
                  placeholder={text.descriptionPlaceholder}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-black">
                    {text.priority}
                  </label>

                  <select
                    value={newPriority}
                    onChange={(event) =>
                      setNewPriority(
                        event.target.value as Priority
                      )
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black"
                  >
                    {PRIORITY_VALUES.map((priority) => (
                      <option key={priority} value={priority}>
                        {getPriorityLabel(
                          priority,
                          locale
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-black">
                    {text.dueDate}
                  </label>

                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(event) =>
                      setNewDueDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={createTask}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {saving ? text.creating : text.create}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-neutral-200 px-5 py-3 text-sm font-bold text-black hover:bg-neutral-50"
                >
                  {text.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-neutral-200 p-6">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                    {text.details}
                  </p>

                  <h2 className="text-2xl font-black text-black">
                    {selectedTask.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 p-6">
                {selectedTask.description && (
                  <div>
                    <p className="mb-2 text-xs font-bold text-neutral-500">
                      {text.description}
                    </p>

                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-black">
                      {selectedTask.description}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 p-4">
                    <p className="text-xs font-bold text-neutral-500">
                      {text.status}
                    </p>

                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(
                          event.target.value as TaskStatus
                        )
                      }
                      disabled={
                        !isOwner &&
                        selectedTask.assigned_to !==
                          currentUserId
                      }
                      className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black disabled:bg-neutral-100"
                    >
                      {STATUS_VALUES.map((status) => (
                        <option key={status} value={status}>
                          {getStatusLabel(status, locale)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-neutral-200 p-4">
                    <p className="text-xs font-bold text-neutral-500">
                      {text.priority}
                    </p>

                    <select
                      value={editPriority}
                      onChange={(event) =>
                        setEditPriority(
                          event.target.value as Priority
                        )
                      }
                      disabled={
                        !isOwner &&
                        selectedTask.assigned_to !==
                          currentUserId
                      }
                      className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black disabled:bg-neutral-100"
                    >
                      {PRIORITY_VALUES.map((priority) => (
                        <option key={priority} value={priority}>
                          {getPriorityLabel(
                            priority,
                            locale
                          )}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-black" />
                    <h3 className="font-black text-black">
                      {text.assignment}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold text-neutral-500">
                        {text.assignedEmployee}
                      </p>

                      {isOwner ? (
                        <select
                          value={editAssignedTo}
                          onChange={(event) =>
                            setEditAssignedTo(
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black"
                        >
                          <option value="">
                            {text.unassigned}
                          </option>

                          {members
                            .filter(
                              (member) =>
                                member.role !== "owner"
                            )
                            .map((member) => (
                              <option
                                key={member.user_id}
                                value={member.user_id}
                              >
                                {getRoleLabel(
                                  member.role,
                                  locale
                                )}{" "}
                                —{" "}
                                {member.user_id.slice(0, 8)}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm font-bold text-black">
                          {getMemberLabel(
                            selectedTask.assigned_to
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-neutral-500">
                        {text.assignmentType}
                      </p>

                      <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm font-bold text-black">
                        {selectedTask.assignment_type === "ai"
                          ? text.ai
                          : text.manager}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-neutral-500">
                        {text.assignmentStatus}
                      </p>

                      <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm font-bold text-black">
                        {selectedTask.assignment_status ===
                        "reassigned"
                          ? text.reassigned
                          : selectedTask.assignment_status ===
                            "cancelled"
                          ? text.cancelled
                          : selectedTask.assignment_status ===
                            "pending"
                          ? text.pending
                          : text.assigned}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-neutral-500">
                        {text.dueDate}
                      </p>

                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(event) =>
                          setEditDueDate(event.target.value)
                        }
                        disabled={
                          !isOwner &&
                          selectedTask.assigned_to !==
                            currentUserId
                        }
                        className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black disabled:bg-neutral-100"
                      />
                    </div>
                  </div>

                  {!isOwner &&
                    selectedTask.assigned_to !==
                      currentUserId && (
                      <p className="mt-4 text-xs text-neutral-500">
                        {text.ownerOnly}
                      </p>
                    )}
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-bold text-neutral-500">
                    {text.created}
                  </p>

                  <p className="mt-1 text-sm font-bold text-black">
                    {new Date(
                      selectedTask.created_at
                    ).toLocaleString(
                      isEnglish ? "en-US" : "ar-EG"
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={saveTaskChanges}
                    disabled={
                      saving ||
                      (!isOwner &&
                        selectedTask.assigned_to !==
                          currentUserId)
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}

                    {saving ? text.saving : text.save}
                  </button>

                  {!isOwner &&
                    selectedTask.assigned_to ===
                      currentUserId && (
                      <button
                        type="button"
                        onClick={() =>
                          updateEmployeeStatus(
                            editStatus === "جديدة"
                              ? "قيد التنفيذ"
                              : "مكتملة"
                          )
                        }
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 py-3 text-sm font-bold text-black hover:bg-neutral-50 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {editStatus === "مكتملة"
                          ? text.completed
                          : text.inProgress}
                      </button>
                    )}

                  {isOwner &&
                    selectedTask.assigned_to && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditAssignedTo("");
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 py-3 text-sm font-bold text-black hover:bg-neutral-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {text.removeAssignment}
                      </button>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}