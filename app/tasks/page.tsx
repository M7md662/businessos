"use client";

import { useEffect, useState } from "react";

type TaskStatus = "جديدة" | "قيد التنفيذ" | "مكتملة";
type Priority = "منخفضة" | "متوسطة" | "عالية";

type Task = {
  id: number;
  title: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
};

const defaultTasks: Task[] = [
  {
    id: 1,
    title: "متابعة طلب أحمد محمد",
    assignee: "محمد",
    dueDate: "2026-08-28",
    priority: "عالية",
    status: "قيد التنفيذ",
  },
  {
    id: 2,
    title: "تحديث قاعدة المعرفة",
    assignee: "سارة",
    dueDate: "2026-08-30",
    priority: "متوسطة",
    status: "جديدة",
  },
  {
    id: 3,
    title: "مراجعة الطلبات الجديدة",
    assignee: "محمد",
    dueDate: "2026-08-27",
    priority: "منخفضة",
    status: "مكتملة",
  },
];

const STORAGE_KEY = "businessos-tasks";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("متوسطة");
  const [status, setStatus] = useState<TaskStatus>("جديدة");

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEY);

      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);

        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks);
        } else {
          setTasks(defaultTasks);
        }
      } else {
        setTasks(defaultTasks);
      }
    } catch (error) {
      console.error("حدث خطأ أثناء تحميل المهام:", error);
      setTasks(defaultTasks);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("حدث خطأ أثناء حفظ المهام:", error);
    }
  }, [tasks, isLoaded]);

  function addTask() {
    if (!title.trim()) {
      alert("يرجى إدخال اسم المهمة");
      return;
    }

    const newTask: Task = {
      id: Date.now(),
      title: title.trim(),
      assignee: assignee.trim(),
      dueDate,
      priority,
      status,
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);

    setTitle("");
    setAssignee("");
    setDueDate("");
    setPriority("متوسطة");
    setStatus("جديدة");
    setShowForm(false);
  }

  function deleteTask(id: number) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذه المهمة؟"
    );

    if (!confirmed) return;

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id)
    );
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
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <p className="text-sm text-slate-500">
          جاري تحميل المهام...
        </p>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-8 py-5">
          <div>
            <p className="text-sm font-medium text-blue-600">
              إدارة العمل
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              المهام
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              تنظيم مهام فريقك ومتابعة الإنجاز من مكان واحد.
            </p>
          </div>

          <button
            onClick={() => setShowForm((value) => !value)}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + إضافة مهمة
          </button>
        </div>
      </header>

      <div className="p-8">
        {showForm && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold">
                إضافة مهمة جديدة
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                أدخل بيانات المهمة الأساسية.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              <FormField
                label="اسم المهمة"
                value={title}
                onChange={setTitle}
                placeholder="مثال: متابعة العميل"
              />

              <FormField
                label="المسؤول"
                value={assignee}
                onChange={setAssignee}
                placeholder="مثال: محمد"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  تاريخ الاستحقاق
                </label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  الأولوية
                </label>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as Priority)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="منخفضة">منخفضة</option>
                  <option value="متوسطة">متوسطة</option>
                  <option value="عالية">عالية</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  الحالة
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as TaskStatus)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="جديدة">جديدة</option>
                  <option value="قيد التنفيذ">
                    قيد التنفيذ
                  </option>
                  <option value="مكتملة">مكتملة</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={addTask}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                حفظ المهمة
              </button>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </section>
        )}

        <section className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="إجمالي المهام"
            value={tasks.length}
            icon="✓"
          />

          <StatCard
            title="مهام جديدة"
            value={newTasks.length}
            icon="✦"
          />

          <StatCard
            title="قيد التنفيذ"
            value={inProgressTasks.length}
            icon="◷"
          />

          <StatCard
            title="مكتملة"
            value={completedTasks.length}
            icon="✓"
          />
        </section>

        {highPriorityTasks.length > 0 && (
          <section className="mb-6 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  مهام ذات أولوية عالية
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  تحتاج هذه المهام إلى اهتمام ومتابعة.
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                {highPriorityTasks.length}
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div>
              <h2 className="text-lg font-bold">
                قائمة المهام
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                جميع المهام المسجلة في النظام.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              {tasks.length} مهمة
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                ✓
              </div>

              <p className="mt-5 font-semibold">
                لا توجد مهام حتى الآن
              </p>

              <p className="mt-2 text-sm text-slate-500">
                أضف أول مهمة لبدء تنظيم عملك.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-right">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      المهمة
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      المسؤول
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      الاستحقاق
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      الأولوية
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      الحالة
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                      إجراء
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                            ✓
                          </div>

                          <p className="text-sm font-semibold">
                            {task.title}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {task.assignee || "-"}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-500">
                        {task.dueDate || "-"}
                      </td>

                      <td className="px-6 py-5">
                        <PriorityBadge
                          priority={task.priority}
                        />
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge status={task.status} />
                      </td>

                      <td className="px-6 py-5">
                        <button
                          onClick={() =>
                            deleteTask(task.id)
                          }
                          className="rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          حذف
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
    </main>
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
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: Priority;
}) {
  const styles: Record<Priority, string> = {
    منخفضة: "bg-slate-100 text-slate-600",
    متوسطة: "bg-amber-50 text-amber-700",
    عالية: "bg-red-50 text-red-700",
  };

  const dots: Record<Priority, string> = {
    منخفضة: "bg-slate-400",
    متوسطة: "bg-amber-500",
    عالية: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${styles[priority]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[priority]}`}
      />

      {priority}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: TaskStatus;
}) {
  const styles: Record<TaskStatus, string> = {
    جديدة: "bg-blue-50 text-blue-700",
    "قيد التنفيذ": "bg-amber-50 text-amber-700",
    مكتملة: "bg-emerald-50 text-emerald-700",
  };

  const dots: Record<TaskStatus, string> = {
    جديدة: "bg-blue-500",
    "قيد التنفيذ": "bg-amber-500",
    مكتملة: "bg-emerald-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[status]}`}
      />

      {status}
    </span>
  );
}