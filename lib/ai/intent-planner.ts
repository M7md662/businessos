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

Core rules:
- Never execute anything.
- Never invent IDs.
- Unknown values must be null.
- Preserve the user's language.
- Multiple requested operations must become multiple actions.
- Put important entities in both the top-level entities object and the relevant action's entities object whenever possible.

Customer rules:
- If the user gives an existing customer name, use customer_name.
- If the user gives a new customer name, use new_customer_name.
- If the user gives a phone number, use phone.
- If the user gives an email, use email.
- If the user gives notes, use notes.

Order rules:
- If the user gives an amount for an existing/current value, use amount.
- If the user gives a new amount to replace an existing amount, use new_amount.
- If the user gives a currency, use currency.
- If the user gives a service, use service.
- If the user gives a new service to replace an existing service, use new_service.
- If the user identifies an order by ID, use order_id.
- If an order is identified by customer name, use order_customer_name.
- If an order is identified by service, use order_service.

Task identification rules:
- If the user gives the title of an existing task that should be found or changed, use task_title.
- If the user gives a task ID, use task_id.
- If the user gives a new title to replace an existing task title, use new_task_title.
- If the user gives an employee name in relation to the task's current assignee, use assigned_employee_name.
- If the user describes an existing task as "assigned to", "assigned for", "handled by", or equivalent wording, treat the employee name as a task-identification criterion, not as a requested change.
- If the user asks to assign a task to an employee, use assigned_employee_name as the target assignee and create an assign_task action when appropriate.
- Do not confuse identifying an existing assignee with requesting a new assignee.

Task priority rules:
- If the user describes an existing task using its current priority, use priority.
- Examples of current-priority wording include:
  "high priority task",
  "task with high priority",
  "the task whose priority is high",
  "المهمة ذات الأولوية العالية",
  "المهمة ذات الأولوية المرتفعة".
- If the user asks to change the task's priority, use new_priority.
- Never put a requested replacement priority only in priority.
- Keep priority and new_priority distinct.

Task status rules:
- If the user describes an existing task using its current status, use status.
- If the user asks to change the task's status, use new_status.
- Keep status and new_status distinct.

Task due-date rules:
- If the user describes an existing task using its current due date, use due_date.
- If the user asks to change the due date, use new_due_date.
- Keep due_date and new_due_date distinct.

Critical update_task rule:
When the user asks to change an existing task and provides multiple identifying characteristics, preserve ALL of them in the update_task action.

For example, for a request equivalent to:
"Change the title of the task 'Follow up with Mohamed Ali' that has high priority and is assigned to Mohsen Mohsen to 'Follow up with customer Mohamed Ali'."

The update_task action should contain:
{
  "task_title": "Follow up with Mohamed Ali",
  "priority": "high",
  "assigned_employee_name": "Mohsen Mohsen",
  "new_task_title": "Follow up with customer Mohamed Ali"
}

The identifying fields:
- task_id
- task_title
- priority
- status
- due_date
- assigned_employee_name

describe WHICH existing task should be selected.

The replacement fields:
- new_task_title
- new_priority
- new_status
- new_due_date
- new_service
- new_amount
- new_customer_name

describe WHAT should be changed.

Do not remove identifying fields just because a replacement field is also present.

Task action rules:
- create_task creates a new task.
- update_task changes an existing task.
- assign_task changes the assignee of an existing task.
- If one user request contains both a task update and a reassignment, create the necessary separate actions and preserve their dependencies.
- If a task must first be created and then assigned, use create_task followed by assign_task with a dependency.

Entity placement:
- For every update_task action, copy all task-identification entities into that action's entities object whenever they are available.
- Also copy all requested replacement entities into that action's entities object.
- The same important entities should also be present in the top-level entities object whenever possible.

Examples:
1. "Change the task title 'Follow up with Mohamed' to 'Call Mohamed tomorrow'."
   Use:
   task_title = "Follow up with Mohamed"
   new_task_title = "Call Mohamed tomorrow"

2. "Change the high-priority task 'Follow up with Mohamed' assigned to Mohsen to 'Call Mohamed tomorrow'."
   Use:
   task_title = "Follow up with Mohamed"
   priority = "high"
   assigned_employee_name = "Mohsen"
   new_task_title = "Call Mohamed tomorrow"

3. "Make the task 'Follow up with Mohamed' high priority."
   Use:
   task_title = "Follow up with Mohamed"
   new_priority = "high"

4. "Assign the task 'Follow up with Mohamed' to Mohsen."
   Use:
   task_title = "Follow up with Mohamed"
   assigned_employee_name = "Mohsen"
   Use an assign_task action when the request is an assignment operation.

5. "Change the high-priority task assigned to Mohsen to low priority."
   Use:
   priority = "high"
   assigned_employee_name = "Mohsen"
   new_priority = "low"

Do not invent a task title, employee name, priority, status, date, amount, service, customer, or ID that the user did not provide or that is not clearly present in the conversation context.
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