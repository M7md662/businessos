import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const TASK_STATUSES = [
  "جديدة",
  "قيد التنفيذ",
  "مكتملة",
] as const;

const TASK_PRIORITIES = [
  "منخفضة",
  "متوسطة",
  "عالية",
] as const;

function isValidTaskStatus(value: string) {
  return TASK_STATUSES.includes(
    value as (typeof TASK_STATUSES)[number]
  );
}

function isValidPriority(value: string) {
  return TASK_PRIORITIES.includes(
    value as (typeof TASK_PRIORITIES)[number]
  );
}

export async function POST(req: Request) {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const dueDate =
      typeof body.due_date === "string"
        ? body.due_date
        : null;

    const priority =
      typeof body.priority === "string"
        ? body.priority
        : "متوسطة";

    const status =
      typeof body.status === "string"
        ? body.status
        : "جديدة";

    const customerId =
      typeof body.customer_id === "string"
        ? body.customer_id
        : null;

    if (!title) {
      return NextResponse.json(
        {
          error: "Task title is required.",
        },
        { status: 400 }
      );
    }

    if (!isValidPriority(priority)) {
      return NextResponse.json(
        {
          error: "Invalid task priority.",
        },
        { status: 400 }
      );
    }

    if (!isValidTaskStatus(status)) {
      return NextResponse.json(
        {
          error: "Invalid task status.",
        },
        { status: 400 }
      );
    }

    /*
     * Get user's company membership.
     */
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership) {
      return NextResponse.json(
        {
          error: "Company membership not found.",
        },
        { status: 403 }
      );
    }

    const companyId = membership.company_id;

    /*
     * Verify active subscription.
     */
    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    if (!subscription) {
      return NextResponse.json(
        {
          error: "Active subscription required.",
        },
        { status: 403 }
      );
    }

    /*
     * Verify subscription plan.
     */
    const {
      data: plan,
      error: planError,
    } = await supabase
      .from("plans")
      .select("*")
      .eq("id", subscription.plan_id)
      .maybeSingle();

    if (planError) {
      throw planError;
    }

    if (!plan) {
      return NextResponse.json(
        {
          error: "Subscription plan not found.",
        },
        { status: 403 }
      );
    }

    /*
     * Create task.
     */
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        company_id: companyId,
        title,
        description: description || null,
        due_date: dueDate || null,
        priority,
        status,
        customer_id: customerId,
      })
      .select(
        "id, company_id, title, description, status, priority, due_date, customer_id, created_at, assigned_to, assigned_by, assignment_type, assignment_status"
      )
      .single();

    if (error) {
      throw error;
    }

    /*
     * Run AI Auto Assignment.
     *
     * The assignment engine checks the company's
     * task_assignment_mode.
     *
     * ai_auto:
     *   Groq selects the most suitable employee.
     *
     * manager_approval:
     *   The task remains unassigned.
     */
    let assignment = null;

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        new URL(req.url).origin ||
        "http://localhost:3000";

      const assignmentResponse = await fetch(
        `${baseUrl}/api/ai/actions/assign-task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task_id: data.id,
          }),
          cache: "no-store",
        }
      );

      assignment =
        await assignmentResponse.json();

      /*
       * TEMPORARY DEBUG
       * This will show exactly what the
       * AI Assignment Engine returned.
       */
      console.log(
        "BUSINESSOS AI ASSIGNMENT RESULT:",
        assignment
      );

      if (!assignmentResponse.ok) {
        console.error(
          "AI task assignment returned an error:",
          assignment
        );
      }
    } catch (assignmentError) {
      console.error(
        "AI task assignment failed:",
        assignmentError
      );
    }

    /*
     * Return task + assignment result.
     */
    return NextResponse.json({
      success: true,
      task: data,
      assignment,
    });
  } catch (error) {
    console.error(
      "AI task action error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create task.",
      },
      { status: 500 }
    );
  }
}