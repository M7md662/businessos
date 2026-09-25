import { NextResponse } from "next/server";
import {
  executeIntentPlan,
} from "@/lib/ai/execution/engine";
import type {
  IntentPlan,
} from "@/lib/ai/intent-planner";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const plan =
      body?.intentPlan as IntentPlan | undefined;

    if (
      !plan ||
      !Array.isArray(plan.actions) ||
      plan.actions.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid Intent Plan is required.",
        },
        { status: 400 }
      );
    }

    const results =
      await executeIntentPlan(plan);

    const success =
      results.length > 0 &&
      results.every(
        (result) => result.success
      );

    const ambiguousResult =
      results.find(
        (result) =>
          result.error ===
          "CUSTOMER_AMBIGUOUS"
      );

    if (ambiguousResult) {
      return NextResponse.json(
        {
          success: false,
          requires_selection: true,
          selection_type: "customer",
          result: ambiguousResult,
          results,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success,
      results,
    });
  } catch (error) {
    console.error(
      "Intent execution error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Intent execution failed.",
      },
      { status: 500 }
    );
  }
}
