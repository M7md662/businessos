import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

type AssignmentMode = "manager_approval" | "ai_auto";

type EmployeeCandidate = {
  user_id: string;
  email: string | null;
  job_title: string | null;
  specialty: string | null;
  max_active_tasks: number;
  is_available: boolean;
  active_tasks: number;
};

type AISelection = {
  employee_user_id: string;
  reason: string;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const taskId =
      typeof body.task_id === "string"
        ? body.task_id
        : "";

    if (!taskId) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    /*
     * 1. Get task
     */
    const { data: task, error: taskError } =
      await supabaseAdmin
        .from("tasks")
        .select(
          "id, company_id, title, description, status, priority, due_date, assigned_to, assignment_type, assignment_status"
        )
        .eq("id", taskId)
        .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    /*
     * 2. Get company assignment mode
     */
    const { data: company, error: companyError } =
      await supabaseAdmin
        .from("companies")
        .select("task_assignment_mode")
        .eq("id", task.company_id)
        .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const assignmentMode =
      company.task_assignment_mode as AssignmentMode;

    if (assignmentMode !== "ai_auto") {
      return NextResponse.json({
        success: true,
        assigned: false,
        mode: "manager_approval",
        message:
          "Task requires manager approval before assignment.",
      });
    }

    /*
     * 3. Get employees
     */
    const { data: members, error: membersError } =
      await supabaseAdmin
        .from("company_members")
        .select(
          "user_id, role, job_title, specialty, max_active_tasks, is_available"
        )
        .eq("company_id", task.company_id)
        .eq("role", "employee");

    if (membersError) {
      return NextResponse.json(
        {
          error: "Failed to load employees",
          details: membersError.message,
        },
        { status: 500 }
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        success: true,
        assigned: false,
        reason: "no_employees",
      });
    }

    /*
     * 4. Calculate workload
     */
    const candidates: EmployeeCandidate[] = [];

    for (const member of members) {
      if (!member.is_available) continue;

      const { count } =
        await supabaseAdmin
          .from("tasks")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("company_id", task.company_id)
          .eq("assigned_to", member.user_id)
          .in("status", [
            "new",
            "in_progress",
          ]);

      const activeTasks = count ?? 0;

      const maxTasks =
        member.max_active_tasks ?? 10;

      if (activeTasks >= maxTasks) continue;

      candidates.push({
        user_id: member.user_id,
        email: null,
        job_title: member.job_title,
        specialty: member.specialty,
        max_active_tasks: maxTasks,
        is_available: member.is_available,
        active_tasks: activeTasks,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        assigned: false,
        reason: "no_available_employee",
      });
    }

    /*
     * 5. Ask Groq to choose the employee.
     */
    const prompt = `
You are the task assignment engine for BusinessOS.

Your job is to choose the most suitable employee for a business task.

TASK:
${JSON.stringify(
  {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
  },
  null,
  2
)}

AVAILABLE EMPLOYEES:
${JSON.stringify(candidates, null, 2)}

Consider:
1. Specialty match.
2. Job title.
3. Task meaning and required skills.
4. Current active workload.
5. Maximum allowed active tasks.
6. Employee availability.
7. Task priority.
8. Due date.

Do not invent employees.

You MUST select exactly one employee_user_id from the provided employees.

Return ONLY valid JSON:

{
  "employee_user_id": "exact-user-id",
  "reason": "short explanation"
}
`;

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You are a precise business task assignment engine. Return JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const raw =
      completion.choices[0]?.message?.content?.trim();

    if (!raw) {
      return NextResponse.json(
        {
          error: "AI returned an empty assignment result.",
        },
        { status: 500 }
      );
    }

    /*
     * 6. Parse AI result
     */
    let aiSelection: AISelection;

    try {
      aiSelection = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "AI returned invalid JSON.",
          raw,
        },
        { status: 500 }
      );
    }

    /*
     * 7. SECURITY CHECK
     *
     * Never trust the AI blindly.
     * The selected employee MUST exist
     * in our real candidate list.
     */
    const selectedEmployee =
      candidates.find(
        (employee) =>
          employee.user_id ===
          aiSelection.employee_user_id
      );

    if (!selectedEmployee) {
      return NextResponse.json(
        {
          error:
            "AI selected an employee who is not an eligible company employee.",
        },
        { status: 400 }
      );
    }

    /*
     * 8. Assign task
     */
    const { data: updatedTask, error: updateError } =
      await supabaseAdmin
        .from("tasks")
        .update({
          assigned_to:
            selectedEmployee.user_id,
          assignment_type: "ai",
          assignment_status: "assigned",
        })
        .eq("id", task.id)
        .select(
          "id, company_id, title, assigned_to, assignment_type, assignment_status"
        )
        .single();

    if (updateError || !updatedTask) {
      return NextResponse.json(
        {
          error: "Failed to assign task",
          details: updateError?.message,
        },
        { status: 500 }
      );
    }

    /*
     * 9. Save AI assignment history
     */
    const { error: historyError } =
      await supabaseAdmin
        .from("task_assignment_history")
        .insert({
          task_id: task.id,
          company_id: task.company_id,
          assigned_to: selectedEmployee.user_id,
          assigned_by: null,
          assignment_type: "ai",
          action: "assigned",
          reason: aiSelection.reason,
        });

    if (historyError) {
      console.error(
        "Failed to save AI assignment history:",
        historyError
      );
    }

    /*
     * 10. Notify employee
     */
    await supabaseAdmin
      .from("notifications")
      .insert({
        company_id: task.company_id,
        user_id:
          selectedEmployee.user_id,
        type: "task_assigned_ai",
        title: "AI task assignment",
        message: `BusinessOS AI assigned "${task.title}" to you.`,
        task_id: task.id,
      });

    /*
     * 11. Notify company owner
     */
    const { data: ownerMembers } =
      await supabaseAdmin
        .from("company_members")
        .select("user_id")
        .eq("company_id", task.company_id)
        .eq("role", "owner");

    if (ownerMembers && ownerMembers.length > 0) {
      const ownerNotifications = ownerMembers.map(
        (owner) => ({
          company_id: task.company_id,
          user_id: owner.user_id,
          type: "task_assigned_ai_manager",
          title: "AI task assignment",
          message: `BusinessOS AI automatically assigned "${task.title}" to an employee.`,
          task_id: task.id,
        })
      );

      const { error: ownerNotificationError } =
        await supabaseAdmin
          .from("notifications")
          .insert(ownerNotifications);

      if (ownerNotificationError) {
        console.error(
          "Owner notification failed:",
          ownerNotificationError
        );
      }
    }

    /*
     * 12. Return result
     */
    return NextResponse.json({
      success: true,
      assigned: true,
      mode: "ai_auto",
      task: updatedTask,
      selectedEmployee: {
        user_id:
          selectedEmployee.user_id,
        job_title:
          selectedEmployee.job_title,
        specialty:
          selectedEmployee.specialty,
        active_tasks:
          selectedEmployee.active_tasks,
      },
      aiReason:
        aiSelection.reason,
    });
  } catch (error) {
    console.error(
      "AI assignment error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}