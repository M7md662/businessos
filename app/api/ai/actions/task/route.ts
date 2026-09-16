import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const dueDate = String(body.due_date || "").trim();
    const priority = String(body.priority || "??????").trim();
    const status = String(body.status || "?????").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id, role, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

    if (membershipError) {
      throw membershipError;
    }

    const membership = memberships?.[0];

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Company not found." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        company_id: membership.company_id,
        title,
        description: description || null,
        due_date: dueDate || null,
        priority,
        status,
      })
      .select(
        "id, title, description, status, priority, due_date, created_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      task: data,
    });
  } catch (error) {
    console.error("AI task action error:", error);

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
