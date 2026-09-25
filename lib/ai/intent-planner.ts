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
    new_customer_name: null,

    phone: null,
    email: null,
    notes: null,

    service: null,
    new_service: null,

    amount: null,
    new_amount: null,
    currency: null,

    task_title: null,
    task_id: null,
    new_task_title: null,

    order_id: null,
    order_customer_name: null,
    order_service: null,

    priority: null,
    new_priority: null,

    status: null,
    new_status: null,

    due_date: null,
    new_due_date: null,

    assigned_employee_name: null,
  };
}

function mergeEntities(
  globalEntities: IntentEntities,
  actionEntities?: IntentEntities
): IntentEntities {
  const merged: IntentEntities = {
    ...emptyEntities(),
    ...globalEntities,
  };

  if (actionEntities) {
    for (const key of Object.keys(actionEntities) as (keyof IntentEntities)[]) {
      const value = actionEntities[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        Object.assign(merged, { [key]: value });
      }
    }
  }

  return merged;
}

function normalizeAction(
  action: unknown,
  globalEntities: IntentEntities
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

  const rawActionEntities =
    value.entities &&
    typeof value.entities === "object"
      ? (value.entities as IntentEntities)
      : undefined;

  const entities = mergeEntities(
    globalEntities,
    rawActionEntities
  );

  if (
    value.type === "create_customer" &&
    !entities.customer_name &&
    entities.new_customer_name
  ) {
    entities.customer_name =
      entities.new_customer_name;
  }

  if (
    value.type === "update_order" ||
    value.type === "create_order"
  ) {
    if (
      !entities.order_customer_name &&
      entities.customer_name
    ) {
      entities.order_customer_name =
        entities.customer_name;
    }

    if (
      !entities.order_service &&
      entities.service
    ) {
      entities.order_service =
        entities.service;
    }
  }

  const dependsOn = Array.isArray(value.depends_on)
    ? value.depends_on.filter(
        (item): item is string =>
          typeof item === "string"
      )
    : undefined;

  return {
    type: value.type as IntentActionType,

    description:
      typeof value.description === "string"
        ? value.description
        : value.type,

    entities,

    ...(dependsOn && dependsOn.length > 0
      ? { depends_on: dependsOn }
      : {}),
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
      "entities": {},
      "depends_on": []
    }
  ],
  "reply": "short confirmation message"
}

Rules:
- Never execute anything.
- Never invent IDs.
- If the user gives a customer name, use customer_name.
- If the user gives a new customer name, use new_customer_name.
- If the user gives an amount, use amount.
- If the user gives a new amount, use new_amount.
- If the user gives a service, use service.
- If the user gives a new service, use new_service.
- If the user gives a task title, use task_title.
- If the user gives a new task title, use new_task_title.
- If the user gives an order ID, use order_id.
- If the user gives a task ID, use task_id.
- If the user gives an employee name, use assigned_employee_name.
- Multiple requested operations must become multiple actions.
- Preserve the user's language.
- Unknown values must be null.
- Put important entities in both the top-level entities object and the relevant action's entities object whenever possible.
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
          "openai/gpt-oss-120b",
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

  const rawEntities =
    value.entities &&
    typeof value.entities === "object"
      ? (value.entities as IntentEntities)
      : {};

  const normalizedEntities: IntentEntities = {
    ...emptyEntities(),
    ...rawEntities,
  };

  if (
    !normalizedEntities.customer_name &&
    normalizedEntities.new_customer_name
  ) {
    normalizedEntities.customer_name =
      normalizedEntities.new_customer_name;
  }

  const UUID_REGEX =
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

  const detectedOrderId =
    input.message.match(UUID_REGEX)?.[0] ?? null;

  if (detectedOrderId) {
    normalizedEntities.order_id = detectedOrderId;
  }

  const actions = (
    Array.isArray(value.actions)
      ? value.actions
      : []
  )
    .map((action) =>
      normalizeAction(
        action,
        normalizedEntities
      )
    )
    .filter(
      (action): action is IntentAction =>
        action !== null
    );

  // Required task title validation
  const incompleteTaskAction = actions.find(
    (action) =>
      action.type === "create_task" &&
      !(
        typeof action.entities?.task_title === "string" &&
        action.entities?.task_title.trim()
      ) &&
      !(
        typeof action.entities?.new_task_title === "string" &&
        action.entities?.new_task_title.trim()
      ) &&
      !(
        typeof normalizedEntities.task_title === "string" &&
        normalizedEntities.task_title.trim()
      ) &&
      !(
        typeof normalizedEntities.new_task_title === "string" &&
        normalizedEntities.new_task_title.trim()
      )
  );

  if (incompleteTaskAction) {
    return {
      intent:
        typeof value.intent === "string"
          ? value.intent
          : "create_task",
      entities: normalizedEntities,
      actions: [],
      reply:
        input.locale === "en"
          ? "What is the title of the task?"
          : "ما عنوان المهمة التي تريد إنشاءها؟",
    };
  }

  if (actions.length === 0) {
    throw new Error(
      "Intent Planner did not produce any valid actions."
    );
  }

  return {
    intent:
      typeof value.intent === "string"
        ? value.intent
        : "business_action",

    entities: normalizedEntities,

    actions,

    reply:
      typeof value.reply === "string"
        ? value.reply
        : input.locale === "en"
          ? "I prepared the following action plan for your confirmation."
          : "جهزت خطة الإجراءات التالية لتأكيدك.",
  };
}



