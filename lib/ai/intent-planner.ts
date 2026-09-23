import type {
  IntentEntities,
  IntentPlan,
  IntentAction,
  IntentActionType,
} from "./intent-types";

export type {
  IntentEntities,
  IntentPlan,
  IntentAction,
  IntentActionType,
} from "./intent-types";

export type PlannerInput = {
  message: string;
  locale?: string;
  conversationHistory?: {
    role: "user" | "assistant";
    content: string;
  }[];
};

export type PlannerOutput = IntentPlan & {
  reply: string;
};

const ACTION_TYPES: IntentActionType[] = [
  "create_customer",
  "create_order",
  "create_task",
  "update_customer",
  "update_order",
  "update_task",
  "assign_task",
];

function emptyEntities(): IntentEntities {
  return {
    customer_id: null,
    customer_name: null,
    phone: null,
    email: null,
    notes: null,
    service: null,
    amount: null,
    new_amount: null,
    currency: null,
    task_title: null,
    task_id: null,
    new_task_title: null,
    order_id: null,
    order_customer_name: null,
    order_service: null,
  };
}

function normalizeAction(
  action: unknown
): IntentAction | null {
  if (!action || typeof action !== "object") {
    return null;
  }

  const value = action as Record<string, unknown>;

  if (
    typeof value.type !== "string" ||
    !ACTION_TYPES.includes(
      value.type as IntentActionType
    )
  ) {
    return null;
  }

  return {
    type: value.type as IntentActionType,
    description:
      typeof value.description === "string"
        ? value.description
        : value.type,
    entities:
      value.entities &&
      typeof value.entities === "object"
        ? (value.entities as IntentEntities)
        : undefined,
  };
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(
        cleaned.slice(start, end + 1)
      );
    } catch {
      return null;
    }
  }
}

export async function planIntent(
  input: PlannerInput
): Promise<PlannerOutput> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured."
    );
  }

  const history =
    input.conversationHistory
      ?.slice(-10)
      .map(
        (item) =>
          `${item.role}: ${item.content}`
      )
      .join("\n") || "";

  const systemPrompt = `
You are the BusinessOS Intent Planner.

Convert the user's business request into a structured Intent Plan.

Return valid JSON only.

Schema:
{
  "intent": "short intent name",
  "entities": {},
  "actions": [
    {
      "type": "create_customer | create_order | create_task | update_customer | update_order | update_task | assign_task",
      "description": "human readable description",
      "entities": {}
    }
  ],
  "reply": "short confirmation message"
}

Rules:
- Never execute anything.
- Never invent IDs.
- If the user gives a customer name, use customer_name.
- If the user gives an amount, use amount.
- If the user gives a service, use service.
- Multiple requested operations must become multiple actions.
- Preserve the user's language.
- Unknown values must be null.
`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:
          process.env.GROQ_INTENT_MODEL ||
          "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `
Conversation:
${history}

Current request:
${input.message}
`,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Groq request failed: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (
    typeof content !== "string" ||
    !content.trim()
  ) {
    throw new Error(
      "Groq returned an empty planner response."
    );
  }

  const parsed = extractJson(content);

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "Intent Planner returned invalid JSON."
    );
  }

  const value =
    parsed as Record<string, unknown>;

  const actions = (
    Array.isArray(value.actions)
      ? value.actions
      : []
  )
    .map(normalizeAction)
    .filter(
      (action): action is IntentAction =>
        action !== null
    );

  if (actions.length === 0) {
    throw new Error(
      "Intent Planner did not produce any valid actions."
    );
  }

  const rawEntities =
    value.entities &&
    typeof value.entities === "object"
      ? (value.entities as IntentEntities)
      : {};

  return {
    intent:
      typeof value.intent === "string"
        ? value.intent
        : "business_action",

    entities: {
      ...emptyEntities(),
      ...rawEntities,
    },

    actions,

    reply:
      typeof value.reply === "string"
        ? value.reply
        : input.locale === "en"
          ? "I prepared the following action plan for your confirmation."
          : "جهزت خطة الإجراءات التالية لتأكيدك.",
  };
}

