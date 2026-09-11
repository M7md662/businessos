"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CircleDot,
  Clock3,
  ListTodo,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";

type TaskStatus = "جديدة" | "قيد التنفيذ" | "مكتملة";
type Priority = "منخفضة" | "متوسطة" | "عالية";

type Task = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
};

function isValidTaskStatus(value: string): value is TaskStatus {
  return (
    value === "جديدة" ||
    value === "قيد التنفيذ" ||
    value === "مكتملة"
  );
}

function isValidPriority(value: string): value is Priority {
  return (
    value === "منخفضة" ||
    value === "متوسطة" ||
    value === "عالية"
  );
}

export default function TasksPage() {
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] =
    useState<Priority>("متوسطة");
  const [status, setStatus] =
    useState<TaskStatus>("جديدة");

  const text = isEnglish
    ? {
        management: "WORK MANAGEMENT",
        title: "Tasks",
        description:
          "Organize your team's work and track progress from one place.",
        addTask: "Add task",
        newTask: "New task",
        newTaskDescription:
          "Enter the basic information for the task.",
        taskName: "Task name",
        taskNamePlaceholder:
          "Example: Follow up with customer",
        assignee: "Assignee",
        assigneePlaceholder: "Example: Mohammed",
        dueDate: "Due date",
        priority: "Priority",
        status: "Status",
        low: "Low",
        medium: "Medium",
        high: "High",
        newStatus: "New",
        inProgress: "In progress",
        completed: "Completed",
        saveTask: "Save task",
        saving: "Saving...",
        cancel: "Cancel",
        totalTasks: "Total tasks",
        newTasks: "New tasks",
        inProgressTasks: "In progress",
        completedTasks: "Completed",
        highPriority: "High priority tasks",
        highPriorityDescription:
          "These tasks need attention and follow-up.",
        taskList: "Task list",
        taskListDescription:
          "All tasks registered in the system.",
        taskCount: "tasks",
        task: "Task",
        action: "Action",
        delete: "Delete",
        noTasks: "No tasks yet",
        noTasksDescription:
          "Add your first task to start organizing your work.",
        loading: "Loading tasks...",
        loadError:
          "An error occurred while loading tasks.",
        saveError:
          "An error occurred while saving the task.",
        deleteError:
          "An error occurred while deleting the task.",
        enterTitle: "Please enter a task name.",
        deleteConfirm:
          "Are you sure you want to delete this task?",
      }
    : {
        management: "إدارة العمل",
        title: "المهام",
        description:
          "نظّم مهام فريقك وتابع الإنجاز من مكان واحد.",
        addTask: "إضافة مهمة",
        newTask: "إضافة مهمة جديدة",
        newTaskDescription:
          "أدخل البيانات الأساسية للمهمة.",
        taskName: "اسم المهمة",
        taskNamePlaceholder:
          "مثال: متابعة العميل",
        assignee: "المسؤول",
        assigneePlaceholder: "مثال: محمد",
        dueDate: "تاريخ الاستحقاق",
        priority: "الأولوية",
        status: "الحالة",
        low: "منخفضة",
        medium: "متوسطة",
        high: "عالية",
        newStatus: "جديدة",
        inProgress: "قيد التنفيذ",
        completed: "مكتملة",
        saveTask: "حفظ المهمة",
        saving: "جاري الحفظ...",
        cancel: "إلغاء",
        totalTasks: "إجمالي المهام",
        newTasks: "مهام جديدة",
        inProgressTasks: "قيد التنفيذ",
        completedTasks: "مكتملة",
        highPriority: "مهام ذات أولوية عالية",
        highPriorityDescription:
          "تحتاج هذه المهام إلى اهتمام ومتابعة.",
        taskList: "قائمة المهام",
        taskListDescription:
          "جميع المهام المسجلة في النظام.",
        taskCount: "مهمة",
        task: "المهمة",
        action: "إجراء",
        delete: "حذف",
        noTasks: "لا توجد مهام حتى الآن",
        noTasksDescription:
          "أضف أول مهمة لبدء تنظيم عملك.",
        loading: "جاري تحميل المهام...",
        loadError:
          "حدث خطأ أثناء تحميل المهام.",
        saveError:
          "حدث خطأ أثناء حفظ المهمة.",
        deleteError:
          "حدث خطأ أثناء حذف المهمة.",
        enterTitle: "يرجى إدخال اسم المهمة.",
        deleteConfirm:
          "هل أنت متأكد من حذف هذه المهمة؟",
      };

  useEffect(() => {
    async function loadTasks() {
      try {
        setErrorMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("User not found");
        }

        const { data: membership, error: membershipError } =
          await supabase
            .from("company_members")
            .select("company_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        if (!membership?.company_id) {
          throw new Error("Company not found");
        }

        const { data, error } = await supabase
          .from("tasks")
          .select(
            "id, title, description, status, priority, due_date, created_at"
          )
          .eq("company_id", membership.company_id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        const mappedTasks: Task[] = (data || []).map(
          (task) => ({
            id: String(task.id),
            title: task.title || "",
            assignee: task.description || "",
            dueDate: task.due_date || "",
            priority: isValidPriority(task.priority)
              ? task.priority
              : "متوسطة",
            status: isValidTaskStatus(task.status)
              ? task.status
              : "جديدة",
          })
        );

        setTasks(mappedTasks);
      } catch (error) {
        console.error("Tasks loading error:", error);
        setErrorMessage(text.loadError);
      } finally {
        setIsLoaded(true);
      }
    }

    loadTasks();
  }, []);

  async function addTask() {
    if (!title.trim()) {
      alert(text.enterTitle);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("User not found");
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership?.company_id) {
        throw new Error("Company not found");
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          company_id: membership.company_id,
          title: title.trim(),
          description: assignee.trim() || null,
          due_date: dueDate || null,
          priority,
          status,
        })
        .select(
          "id, title, description, status, priority, due_date"
        )
        .single();

      if (error) {
        throw error;
      }

      const newTask: Task = {
        id: String(data.id),
        title: data.title || title.trim(),
        assignee: data.description || assignee.trim(),
        dueDate: data.due_date || dueDate,
        priority: isValidPriority(data.priority)
          ? data.priority
          : priority,
        status: isValidTaskStatus(data.status)
          ? data.status
          : status,
      };

      setTasks((currentTasks) => [
        newTask,
        ...currentTasks,
      ]);

      setTitle("");
      setAssignee("");
      setDueDate("");
      setPriority("متوسطة");
      setStatus("جديدة");
      setShowForm(false);
    } catch (error) {
      console.error("Task insert error:", error);
      setErrorMessage(text.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTask(id: string) {
    const confirmed = window.confirm(
      text.deleteConfirm
    );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setTasks((currentTasks) =>
        currentTasks.filter(
          (task) => task.id !== id
        )
      );
    } catch (error) {
      console.error("Task delete error:", error);
      setErrorMessage(text.deleteError);
    }
  }

  const newTasks = tasks.filter(
    (task) => task.status === "جديدة"
  );

  const inProgressTasks = tasks.filter(
    (task) => task.status === "قيد التنفيذ"
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "مكتملة"
  );

  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "عالية"
  );

  if (!isLoaded) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-40px)] items-center justify-center rounded-[24px] bg-[#f8f8f8]"
      >
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
          {text.loading}
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-[calc(100vh-40px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-[24px] bg-white px-5 py-6 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                  <CheckSquare className="h-4 w-4" />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {text.management}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                {text.title}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                {text.description}
              </p>
            </div>

            <button
              onClick={() =>
                setShowForm((value) => !value)
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4" />
                  {text.cancel}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {text.addTask}
                </>
              )}
            </button>
          </div>
        </header>

        <div className="mt-5 space-y-5">
          {errorMessage && (
            <div className="rounded-2xl border border-red-100 bg-white p-4 text-sm text-red-600 shadow-[0_5px_25px_rgba(0,0,0,.03)]">
              {errorMessage}
            </div>
          )}

          {showForm && (
            <section className="rounded-[24px] bg-white p-5 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                    BusinessOS
                  </p>

                  <h2 className="mt-2 text-lg font-bold">
                    {text.newTask}
                  </h2>

                  <p className="mt-1 text-xs text-neutral-500">
                    {text.newTaskDescription}
                  </p>
                </div>

                <button
                  onClick={() => setShowForm(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 text-neutral-400 transition hover:bg-neutral-100 hover:text-black"
                  aria-label={text.cancel}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <FormField
                  label={text.taskName}
                  value={title}
                  onChange={setTitle}
                  placeholder={text.taskNamePlaceholder}
                />

                <FormField
                  label={text.assignee}
                  value={assignee}
                  onChange={setAssignee}
                  placeholder={text.assigneePlaceholder}
                />

                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-700">
                    {text.dueDate}
                  </label>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) =>
                        setDueDate(event.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 ps-11 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-neutral-100"
                    />
                  </div>
                </div>

                <SelectField
                  label={text.priority}
                  value={priority}
                  onChange={(value) =>
                    setPriority(value as Priority)
                  }
                  options={[
                    {
                      value: "منخفضة",
                      label: text.low,
                    },
                    {
                      value: "متوسطة",
                      label: text.medium,
                    },
                    {
                      value: "عالية",
                      label: text.high,
                    },
                  ]}
                />

                <SelectField
                  label={text.status}
                  value={status}
                  onChange={(value) =>
                    setStatus(value as TaskStatus)
                  }
                  options={[
                    {
                      value: "جديدة",
                      label: text.newStatus,
                    },
                    {
                      value: "قيد التنفيذ",
                      label: text.inProgress,
                    },
                    {
                      value: "مكتملة",
                      label: text.completed,
                    },
                  ]}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={addTask}
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-black px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? text.saving
                    : text.saveTask}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  disabled={isSaving}
                  className="h-11 rounded-xl border border-neutral-200 bg-white px-6 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {text.cancel}
                </button>
              </div>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title={text.totalTasks}
              value={tasks.length}
              icon={<ListTodo className="h-4 w-4" />}
              type="black"
            />

            <StatCard
              title={text.newTasks}
              value={newTasks.length}
              icon={<CircleDot className="h-4 w-4" />}
              type="gray"
            />

            <StatCard
              title={text.inProgressTasks}
              value={inProgressTasks.length}
              icon={<Clock3 className="h-4 w-4" />}
              type="amber"
            />

            <StatCard
              title={text.completedTasks}
              value={completedTasks.length}
              icon={
                <CheckCircle2 className="h-4 w-4" />
              }
              type="green"
            />
          </section>

          {highPriorityTasks.length > 0 && (
            <section className="rounded-[20px] bg-white p-5 shadow-[0_8px_35px_rgba(0,0,0,.04)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      {text.highPriority}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {text.highPriorityDescription}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                  {highPriorityTasks.length}
                </div>
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.05)]">
            <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                  BusinessOS
                </p>

                <h2 className="mt-2 text-lg font-bold">
                  {text.taskList}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  {text.taskListDescription}
                </p>
              </div>

              <div className="w-fit rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-600">
                {tasks.length} {text.taskCount}
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="px-5 py-20 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                  <CheckSquare className="h-6 w-6" />
                </div>

                <p className="mt-5 font-semibold">
                  {text.noTasks}
                </p>

                <p className="mt-2 text-sm text-neutral-500">
                  {text.noTasksDescription}
                </p>

                <button
                  onClick={() => setShowForm(true)}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {text.addTask}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className={`w-full min-w-[900px] ${
                    isEnglish
                      ? "text-left"
                      : "text-right"
                  }`}
                >
                  <thead>
                    <tr className="border-b border-neutral-100 bg-[#fafafa]">
                      <TableHead>
                        {text.task}
                      </TableHead>
                      <TableHead>
                        {text.assignee}
                      </TableHead>
                      <TableHead>
                        {text.dueDate}
                      </TableHead>
                      <TableHead>
                        {text.priority}
                      </TableHead>
                      <TableHead>
                        {text.status}
                      </TableHead>
                      <TableHead>
                        {text.action}
                      </TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="border-b border-neutral-100 last:border-0 transition hover:bg-[#fafafa]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                              <CheckSquare className="h-4 w-4" />
                            </div>

                            <div>
                              <p className="text-sm font-semibold">
                                {task.title}
                              </p>

                              <p className="mt-0.5 text-[10px] text-neutral-400">
                                BusinessOS
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          {task.assignee ? (
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                              <User className="h-3.5 w-3.5 text-neutral-400" />
                              <span>
                                {task.assignee}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {task.dueDate ? (
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                              <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
                              <span dir="ltr">
                                {task.dueDate}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <PriorityBadge
                            priority={task.priority}
                            text={text}
                          />
                        </td>

                        <td className="px-6 py-5">
                          <StatusBadge
                            status={task.status}
                            text={text}
                          />
                        </td>

                        <td className="px-6 py-5">
                          <button
                            onClick={() =>
                              deleteTask(task.id)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                            title={text.delete}
                            aria-label={text.delete}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
      {children}
    </th>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-neutral-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-neutral-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-neutral-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-neutral-100"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  type,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  type: "black" | "green" | "gray" | "amber";
}) {
  const styles = {
    black: "bg-black text-white",
    green: "bg-emerald-50 text-emerald-600",
    gray: "bg-neutral-100 text-neutral-500",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_8px_35px_rgba(0,0,0,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,.07)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[type]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({
  priority,
  text,
}: {
  priority: Priority;
  text: {
    low: string;
    medium: string;
    high: string;
  };
}) {
  const styles: Record<Priority, string> = {
    منخفضة: "bg-neutral-100 text-neutral-600",
    متوسطة: "bg-amber-50 text-amber-700",
    عالية: "bg-red-50 text-red-700",
  };

  const dots: Record<Priority, string> = {
    منخفضة: "bg-neutral-400",
    متوسطة: "bg-amber-500",
    عالية: "bg-red-500",
  };

  const labels: Record<Priority, string> = {
    منخفضة: text.low,
    متوسطة: text.medium,
    عالية: text.high,
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${styles[priority]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[priority]}`}
      />

      {labels[priority]}
    </span>
  );
}

function StatusBadge({
  status,
  text,
}: {
  status: TaskStatus;
  text: {
    newStatus: string;
    inProgress: string;
    completed: string;
  };
}) {
  const styles: Record<TaskStatus, string> = {
    جديدة: "bg-neutral-100 text-neutral-700",
    "قيد التنفيذ": "bg-amber-50 text-amber-700",
    مكتملة: "bg-emerald-50 text-emerald-700",
  };

  const dots: Record<TaskStatus, string> = {
    جديدة: "bg-black",
    "قيد التنفيذ": "bg-amber-500",
    مكتملة: "bg-emerald-500",
  };

  const labels: Record<TaskStatus, string> = {
    جديدة: text.newStatus,
    "قيد التنفيذ": text.inProgress,
    مكتملة: text.completed,
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[status]}`}
      />

      {labels[status]}
    </span>
  );
}