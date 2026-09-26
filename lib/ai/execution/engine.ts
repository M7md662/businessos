import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkPlanPermissions } from "@/lib/ai/permissions";
import type {
  IntentAction,
  IntentPlan,
} from "@/lib/ai/intent-planner";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const TASK_STATUSES = [
  "جديدة",
  "قيد التنفيذ",
  "مكتملة",
  "new",
  "in_progress",
  "completed",
] as const;

const TASK_PRIORITIES = [
  "منخفضة",
  "متوسطة",
  "عالية",
  "low",
  "medium",
  "high",
] as const;

const ORDER_STATUSES = [
  "جديدة",
  "قيد المتابعة",
  "مكتمل",
  "ملغي",
  "new",
  "in_progress",
  "completed",
  "cancelled",
] as const;

type EmployeeMember = {
  user_id: string;
  role: string;
  job_title: string | null;
  specialty: string | null;
  max_active_tasks: number | null;
  is_available: boolean;
};

type EmployeeCandidate = EmployeeMember & {
  full_name: string | null;
  email: string | null;
  active_tasks: number;
};

type AISelection = {
  employee_user_id: string;
  reason: string;
};

export type ExecutionResult = {
  success: boolean;
  action: string;
  message: string;
  data?: unknown;
  error?: string;
};

class CustomerAmbiguityError extends Error {
  customers: Array<{
    id: string;
    name: string;
  }>;

  constructor(
    customerName: string,
    customers: Array<{
      id: string;
      name: string;
    }>
  ) {
    super(
      `More than one customer matches "${customerName}".`
    );

    this.name = "CustomerAmbiguityError";
    this.customers = customers;
  }
}

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

function isValidOrderStatus(value: string) {
  return ORDER_STATUSES.includes(
    value as (typeof ORDER_STATUSES)[number]
  );
}

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[عأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLocaleLowerCase();
}

/**
 * Repairs the specific UTF-8 -> Windows-1252 mojibake that affected
 * older Arabic strings in this file/database.
 *
 * The function only accepts a conversion when it reduces mojibake
 * markers and does not introduce replacement characters.
 */
function repairMojibake(value: string): string {
  let current = value;

  const score = (text: string) => {
    const markers = [
      "Ã",
      "Â",
      "â",
      "ð",
      "ƒ",
      "œ",
      "‚",
      "™",
      "š",
      "ž",
      "�",
    ];

    return markers.reduce(
      (total, marker) =>
        total + text.split(marker).length - 1,
      0
    );
  };

  for (let pass = 0; pass < 4; pass++) {
    const beforeScore = score(current);

    if (beforeScore === 0) {
      break;
    }

    try {
      const encoded = new TextEncoder().encode(
        current
      );

      const decoded = new TextDecoder(
        "windows-1252"
      ).decode(encoded);

      if (
        decoded.includes("�") ||
        score(decoded) >= beforeScore
      ) {
        break;
      }

      current = decoded;
    } catch {
      break;
    }
  }

  return current;
}

function normalizeEmployeeName(value: string) {
  return repairMojibake(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function normalizeTaskPriority(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  const repaired = repairMojibake(value)
    .trim()
    .toLocaleLowerCase();

  if (
    repaired === "high" ||
    repaired === "عالية"
  ) {
    return "high";
  }

  if (
    repaired === "medium" ||
    repaired === "متوسطة"
  ) {
    return "medium";
  }

  if (
    repaired === "low" ||
    repaired === "منخفضة"
  ) {
    return "low";
  }

  return repaired;
}

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase service role configuration is missing."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey
  );
}

function getGroq() {
  const apiKey =
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured."
    );
  }

  return new Groq({
    apiKey,
  });
}

async function resolveCustomer(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  customerId: string | null | undefined,
  customerName: string | null | undefined
) {
  if (customerId) {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("id", customerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "The specified customer was not found in this company."
      );
    }

    return data;
  }

  if (!customerName?.trim()) {
    return null;
  }

  const normalizedCustomerName =
    normalizeName(customerName);

  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", companyId)
    .limit(100);

  if (error) {
    throw error;
  }

  const matchingCustomers =
    (data || []).filter(
      (customer) =>
        typeof customer.name === "string" &&
        normalizeName(customer.name) ===
          normalizedCustomerName
    );

  if (matchingCustomers.length === 0) {
    throw new Error(
      `Customer "${customerName.trim()}" was not found.`
    );
  }

  if (matchingCustomers.length > 1) {
    throw new CustomerAmbiguityError(
      customerName.trim(),
      matchingCustomers.map((customer) => ({
        id: customer.id,
        name: customer.name,
      }))
    );
  }

  return matchingCustomers[0];
}

async function executeCreateCustomer(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  plan: IntentPlan
): Promise<ExecutionResult> {
  const entities = plan.entities;

  const name =
    typeof entities.customer_name === "string"
      ? entities.customer_name.trim()
      : "";

  if (!name) {
    return {
      success: false,
      action: "create_customer",
      message: "Customer name is required.",
      error: "CUSTOMER_NAME_REQUIRED",
    };
  }

  const { data: customer, error } =
    await supabase
      .from("customers")
      .insert({
        company_id: companyId,
        name,
      })
      .select(
        "id, company_id, name, created_at"
      )
      .single();

  if (error) {
    throw error;
  }

  const {
    data: verifiedCustomer,
    error: verificationError,
  } = await supabase
    .from("customers")
    .select(
      "id, company_id, name, created_at"
    )
    .eq("company_id", companyId)
    .eq("id", customer.id)
    .maybeSingle();

  if (verificationError) {
    await supabase
      .from("customers")
      .delete()
      .eq("company_id", companyId)
      .eq("id", customer.id);

    throw verificationError;
  }

  if (!verifiedCustomer) {
    await supabase
      .from("customers")
      .delete()
      .eq("company_id", companyId)
      .eq("id", customer.id);

    return {
      success: false,
      action: "create_customer",
      message:
        "The customer was created but could not be verified. The operation was rolled back.",
      error: "CUSTOMER_VERIFICATION_FAILED",
    };
  }

  return {
    success: true,
    action: "create_customer",
    message:
      "Customer created and verified successfully.",
    data: {
      customer: verifiedCustomer,
    },
  };
}

async function executeCreateTask(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  plan: IntentPlan
): Promise<ExecutionResult> {
  const entities = plan.entities;

  const explicitTaskTitle =
    typeof entities.task_title === "string"
      ? entities.task_title.trim()
      : "";

  const taskService =
    typeof entities.service === "string" &&
    entities.service.trim()
      ? entities.service.trim()
      : typeof entities.new_service === "string" &&
          entities.new_service.trim()
        ? entities.new_service.trim()
        : typeof entities.order_service === "string" &&
            entities.order_service.trim()
          ? entities.order_service.trim()
          : "";

  const taskCustomerName =
    typeof entities.customer_name === "string" &&
    entities.customer_name.trim()
      ? entities.customer_name.trim()
      : typeof entities.new_customer_name === "string" &&
          entities.new_customer_name.trim()
        ? entities.new_customer_name.trim()
        : "";

  const title =
    explicitTaskTitle ||
    (taskService && taskCustomerName
      ? `تنفيذ ${taskService} للعميل ${taskCustomerName}`
      : taskService
        ? `تنفيذ ${taskService}`
        : taskCustomerName
          ? `متابعة العميل ${taskCustomerName}`
          : "مهمة جديدة");

  const priority =
    typeof entities.priority === "string" &&
    entities.priority.trim()
      ? entities.priority.trim()
      : "متوسطة";

  const status =
    typeof entities.status === "string" &&
    entities.status.trim()
      ? entities.status.trim()
      : "جديدة";

  if (!isValidPriority(priority)) {
    return {
      success: false,
      action: "create_task",
      message: "Invalid task priority.",
      error: "INVALID_TASK_PRIORITY",
    };
  }

  if (!isValidTaskStatus(status)) {
    return {
      success: false,
      action: "create_task",
      message: "Invalid task status.",
      error: "INVALID_TASK_STATUS",
    };
  }

  const customer = await resolveCustomer(
    supabase,
    companyId,
    entities.customer_id,
    entities.customer_name
  );

  const dueDate =
    typeof entities.due_date === "string" &&
    entities.due_date.trim()
      ? entities.due_date.trim()
      : null;

  const { data: task, error } =
    await supabase
      .from("tasks")
      .insert({
        company_id: companyId,
        title,
        description: null,
        due_date: dueDate,
        priority,
        status,
        customer_id:
          customer?.id ?? null,
      })
      .select(
        "id, company_id, title, description, status, priority, due_date, customer_id, created_at, assigned_to, assigned_by, assignment_type, assignment_status"
      )
      .single();

  if (error) {
    throw error;
  }

  const {
    data: verifiedTask,
    error: verificationError,
  } = await supabase
    .from("tasks")
    .select(
      "id, company_id, title, status, priority, due_date, customer_id, created_at, assigned_to, assignment_type, assignment_status"
    )
    .eq("company_id", companyId)
    .eq("id", task.id)
    .maybeSingle();

  if (verificationError) {
    await supabase
      .from("tasks")
      .delete()
      .eq("company_id", companyId)
      .eq("id", task.id);

    throw verificationError;
  }

  if (!verifiedTask) {
    await supabase
      .from("tasks")
      .delete()
      .eq("company_id", companyId)
      .eq("id", task.id);

    return {
      success: false,
      action: "create_task",
      message:
        "The task was created but could not be verified. The operation was rolled back.",
      error: "TASK_VERIFICATION_FAILED",
    };
  }

  return {
    success: true,
    action: "create_task",
    message:
      "Task created and verified successfully.",
    data: {
      task: verifiedTask,
      customer,
    },
  };
}

async function executeCreateOrder(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  plan: IntentPlan
): Promise<ExecutionResult> {
  const entities = plan.entities;

  const service =
    typeof entities.service === "string"
      ? entities.service.trim()
      : "";

  if (!service) {
    return {
      success: false,
      action: "create_order",
      message: "Order service is required.",
      error: "ORDER_SERVICE_REQUIRED",
    };
  }

  const amount =
    entities.amount == null
      ? 0
      : entities.amount;

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return {
      success: false,
      action: "create_order",
      message: "Order total is invalid.",
      error: "INVALID_ORDER_TOTAL",
    };
  }

  const status =
    typeof entities.status === "string" &&
    entities.status.trim()
      ? entities.status.trim()
      : "جديدة";

  if (!isValidOrderStatus(status)) {
    return {
      success: false,
      action: "create_order",
      message: "Invalid order status.",
      error: "INVALID_ORDER_STATUS",
    };
  }

  const customer = await resolveCustomer(
    supabase,
    companyId,
    entities.customer_id,
    entities.customer_name
  );

  if (!customer) {
    return {
      success: false,
      action: "create_order",
      message: "Customer is required.",
      error: "CUSTOMER_REQUIRED",
    };
  }

  const { data: order, error } =
    await supabase
      .from("orders")
      .insert({
        company_id: companyId,
        customer_id: customer.id,
        customer_name: customer.name,
        service,
        total: amount,
        status,
        notes: null,
      })
      .select(
        "id, company_id, customer_id, customer_name, service, total, status, notes, created_at"
      )
      .single();

  if (error) {
    throw error;
  }

  const {
    data: verifiedOrder,
    error: verificationError,
  } = await supabase
    .from("orders")
    .select(
      "id, company_id, customer_id, customer_name, service, total, status, notes, created_at"
    )
    .eq("company_id", companyId)
    .eq("id", order.id)
    .maybeSingle();

  if (verificationError) {
    await supabase
      .from("orders")
      .delete()
      .eq("company_id", companyId)
      .eq("id", order.id);

    throw verificationError;
  }

  if (!verifiedOrder) {
    await supabase
      .from("orders")
      .delete()
      .eq("company_id", companyId)
      .eq("id", order.id);

    return {
      success: false,
      action: "create_order",
      message:
        "The order was created but could not be verified. The operation was rolled back.",
      error: "ORDER_VERIFICATION_FAILED",
    };
  }

  return {
    success: true,
    action: "create_order",
    message:
      "Order created and verified successfully.",
    data: {
      order: verifiedOrder,
      customer,
    },
  };
}

async function resolveCustomerForUpdate(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  customerId: string | null | undefined,
  customerName: string | null | undefined
) {
  return resolveCustomer(
    supabase,
    companyId,
    customerId,
    customerName
  );
}

async function executeUpdateCustomer(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  plan: IntentPlan
): Promise<ExecutionResult> {
  const entities = plan.entities;

  const newName =
    typeof entities.new_customer_name === "string"
      ? entities.new_customer_name.trim()
      : "";

  if (!newName) {
    return {
      success: false,
      action: "update_customer",
      message: "New customer name is required.",
      error: "NEW_CUSTOMER_NAME_REQUIRED",
    };
  }

  const customer =
    await resolveCustomerForUpdate(
      supabase,
      companyId,
      entities.customer_id,
      entities.customer_name
    );

  if (!customer) {
    return {
      success: false,
      action: "update_customer",
      message: "Customer is required.",
      error: "CUSTOMER_REQUIRED",
    };
  }

  if (
    normalizeName(customer.name) ===
    normalizeName(newName)
  ) {
    return {
      success: false,
      action: "update_customer",
      message:
        "The new customer name is the same as the current name.",
      error: "NO_CUSTOMER_CHANGE",
    };
  }

  const oldName = customer.name;

  const { error: updateError } =
    await supabase
      .from("customers")
      .update({
        name: newName,
      })
      .eq("company_id", companyId)
      .eq("id", customer.id);

  if (updateError) {
    throw updateError;
  }

  const {
    data: verifiedCustomer,
    error: verificationError,
  } = await supabase
    .from("customers")
    .select(
      "id, company_id, name, created_at"
    )
    .eq("company_id", companyId)
    .eq("id", customer.id)
    .maybeSingle();

  if (verificationError) {
    await supabase
      .from("customers")
      .update({
        name: oldName,
      })
      .eq("company_id", companyId)
      .eq("id", customer.id);

    throw verificationError;
  }

  if (
    !verifiedCustomer ||
    normalizeName(verifiedCustomer.name) !==
      normalizeName(newName)
  ) {
    await supabase
      .from("customers")
      .update({
        name: oldName,
      })
      .eq("company_id", companyId)
      .eq("id", customer.id);

    return {
      success: false,
      action: "update_customer",
      message:
        "The customer was updated but could not be verified. The operation was rolled back.",
      error:
        "CUSTOMER_UPDATE_VERIFICATION_FAILED",
    };
  }

  return {
    success: true,
    action: "update_customer",
    message:
      "Customer updated and verified successfully.",
    data: {
      customer: verifiedCustomer,
      previous_name: oldName,
    },
  };
}

async function resolveOrderForUpdate(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  orderId: string | null | undefined,
  customerName: string | null | undefined,
  service: string | null | undefined
) {
  if (orderId?.trim()) {
    const { data, error } =
      await supabase
        .from("orders")
        .select(
          "id, company_id, customer_id, customer_name, service, total, status, notes, created_at"
        )
        .eq("company_id", companyId)
        .eq("id", orderId.trim())
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "The specified order was not found in this company."
      );
    }

    return data;
  }

  if (!customerName?.trim()) {
    throw new Error(
      "An order ID or order customer is required."
    );
  }

  const normalizedCustomerName =
    normalizeName(customerName);

  const {
    data: customers,
    error: customerError,
  } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", companyId)
    .limit(100);

  if (customerError) {
    throw customerError;
  }

  const matchingCustomers =
    (customers || []).filter(
      (customer) =>
        normalizeName(customer.name) ===
        normalizedCustomerName
    );

  if (matchingCustomers.length === 0) {
    throw new Error(
      "The specified customer was not found."
    );
  }

  if (matchingCustomers.length > 1) {
    throw new CustomerAmbiguityError(
      customerName,
      matchingCustomers.map((customer) => ({
        id: customer.id,
        name: customer.name,
      }))
    );
  }

  const customer = matchingCustomers[0];

  let query = supabase
    .from("orders")
    .select(
      "id, company_id, customer_id, customer_name, service, total, status, notes, created_at"
    )
    .eq("company_id", companyId)
    .eq("customer_id", customer.id);

  if (service?.trim()) {
    query = query.ilike(
      "service",
      service.trim()
    );
  }

  const { data, error } =
    await query.limit(2);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      "The specified order was not found for this customer."
    );
  }

  if (data.length > 1) {
    throw new Error(
      "More than one order matches the specified information."
    );
  }

  return data[0];
}

async function executeUpdateOrder(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  plan: IntentPlan
): Promise<ExecutionResult> {
  const entities = plan.entities;

  const newService =
    typeof entities.new_service === "string"
      ? entities.new_service.trim()
      : null;

  const newAmount =
    typeof entities.new_amount === "number"
      ? entities.new_amount
      : null;

  const newStatus =
    typeof entities.new_status === "string"
      ? entities.new_status.trim()
      : null;

  if (
    newService === null &&
    newAmount === null &&
    newStatus === null
  ) {
    return {
      success: false,
      action: "update_order",
      message:
        "No order field was provided for update.",
      error: "NO_ORDER_UPDATE_FIELDS",
    };
  }

  if (
    newAmount !== null &&
    (!Number.isFinite(newAmount) ||
      newAmount < 0)
  ) {
    return {
      success: false,
      action: "update_order",
      message: "New order total is invalid.",
      error: "INVALID_NEW_ORDER_TOTAL",
    };
  }

  if (
    newStatus !== null &&
    !isValidOrderStatus(newStatus)
  ) {
    return {
      success: false,
      action: "update_order",
      message: "Invalid new order status.",
      error: "INVALID_NEW_ORDER_STATUS",
    };
  }

  const order =
    await resolveOrderForUpdate(
      supabase,
      companyId,
      entities.order_id,
      entities.order_customer_name ??
        entities.customer_name,
      entities.order_service ??
        entities.service
    );

  const oldValues = {
    service: order.service,
    total: order.total,
    status: order.status,
  };

  const updates: Record<string, unknown> =
    {};

  if (newService !== null) {
    updates.service = newService;
  }

  if (newAmount !== null) {
    updates.total = newAmount;
  }

  if (newStatus !== null) {
    updates.status = newStatus;
  }

  const { error: updateError } =
    await supabase
      .from("orders")
      .update(updates)
      .eq("company_id", companyId)
      .eq("id", order.id);

  if (updateError) {
    throw updateError;
  }

  const {
    data: verifiedOrder,
    error: verificationError,
  } = await supabase
    .from("orders")
    .select(
      "id, company_id, customer_id, customer_name, service, total, status, notes, created_at"
    )
    .eq("company_id", companyId)
    .eq("id", order.id)
    .maybeSingle();

  if (verificationError) {
    await supabase
      .from("orders")
      .update(oldValues)
      .eq("company_id", companyId)
      .eq("id", order.id);

    throw verificationError;
  }

  if (!verifiedOrder) {
    await supabase
      .from("orders")
      .update(oldValues)
      .eq("company_id", companyId)
      .eq("id", order.id);

    return {
      success: false,
      action: "update_order",
      message:
        "The order was updated but could not be verified. The operation was rolled back.",
      error:
        "ORDER_UPDATE_VERIFICATION_FAILED",
    };
  }

  const serviceValid =
    newService === null ||
    verifiedOrder.service === newService;

  const amountValid =
    newAmount === null ||
    Number(verifiedOrder.total) ===
      Number(newAmount);

  const statusValid =
    newStatus === null ||
    verifiedOrder.status === newStatus;

  if (
    !serviceValid ||
    !amountValid ||
    !statusValid
  ) {
    await supabase
      .from("orders")
      .update(oldValues)
      .eq("company_id", companyId)
      .eq("id", order.id);

    return {
      success: false,
      action: "update_order",
      message:
        "The order update could not be verified. The operation was rolled back.",
      error:
        "ORDER_UPDATE_VERIFICATION_FAILED",
    };
  }

  return {
    success: true,
    action: "update_order",
    message:
      "Order updated and verified successfully.",
    data: {
      order: verifiedOrder,
      previous_values: oldValues,
    },
  };
}

/**
 * Resolves a task using:
 * 1. Explicit task ID when available.
 * 2. Exact task title.
 * 3. Optional priority discriminator.
 * 4. Optional assigned employee name discriminator.
 *
 * Important:
 * - Priority matching supports both current Arabic values and
 *   legacy mojibake values.
 * - Employee matching is local to this resolver and does NOT
 *   modify normalizeName(), so customer matching remains untouched.
 */
async function resolveTaskForUpdate(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  taskId: string | null | undefined,
  taskTitle: string | null | undefined,
  priority: string | null | undefined,
  assignedEmployeeName: string | null | undefined
) {
  if (taskId?.trim()) {
    const { data, error } =
      await supabase
        .from("tasks")
        .select(
          "id, company_id, title, description, status, priority, due_date, customer_id, assigned_to, assigned_by, assignment_type, assignment_status"
        )
        .eq("company_id", companyId)
        .eq("id", taskId.trim())
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "The specified task was not found in this company."
      );
    }

    return data;
  }

  if (!taskTitle?.trim()) {
    throw new Error(
      "A task ID or task title is required."
    );
  }

  const normalizedTaskTitle =
    taskTitle.trim();

  const { data, error } =
    await supabase
      .from("tasks")
      .select(
        "id, company_id, title, description, status, priority, due_date, customer_id, assigned_to, assigned_by, assignment_type, assignment_status"
      )
      .eq("company_id", companyId)
      .ilike(
        "title",
        normalizedTaskTitle
      )
      .limit(20);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Task "${normalizedTaskTitle}" was not found.`
    );
  }

  let candidates = data;

  if (priority?.trim()) {
    const expectedPriority =
      normalizeTaskPriority(priority);

    candidates = candidates.filter(
      (task) =>
        normalizeTaskPriority(
          typeof task.priority === "string"
            ? task.priority
            : null
        ) === expectedPriority
    );
  }

  if (assignedEmployeeName?.trim()) {
    const normalizedEmployeeName =
      normalizeEmployeeName(
        assignedEmployeeName
      );

    const admin =
      getSupabaseAdmin();

    const {
      data: members,
      error: membersError,
    } = await admin
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("role", "employee");

    if (membersError) {
      throw membersError;
    }

    const matchingUserIds: string[] =
      [];

    for (const member of members ?? []) {
      const {
        data: authUserData,
        error: authUserError,
      } =
        await admin.auth.admin.getUserById(
          member.user_id
        );

      if (authUserError) {
        continue;
      }

      const fullName =
        typeof authUserData?.user
          ?.user_metadata?.full_name ===
        "string"
          ? authUserData.user.user_metadata
              .full_name
          : null;

      if (
        fullName &&
        normalizeEmployeeName(fullName) ===
          normalizedEmployeeName
      ) {
        matchingUserIds.push(
          member.user_id
        );
      }
    }

    candidates = candidates.filter(
      (task) =>
        typeof task.assigned_to ===
          "string" &&
        matchingUserIds.includes(
          task.assigned_to
        )
    );
  }

  if (candidates.length === 0) {
    throw new Error(
      `Task "${normalizedTaskTitle}" matching the specified criteria was not found.`
    );
  }

  if (candidates.length > 1) {
    throw new Error(
      `More than one task matches "${normalizedTaskTitle}" with the specified criteria.`
    );
  }

  return candidates[0];
}

async function executeUpdateTask(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  plan: IntentPlan
): Promise<ExecutionResult> {
  const entities = plan.entities;

  const newTitle =
    typeof entities.new_task_title === "string"
      ? entities.new_task_title.trim()
      : null;

  const newStatus =
    typeof entities.new_status === "string"
      ? entities.new_status.trim()
      : null;

  const newPriority =
    typeof entities.new_priority === "string"
      ? entities.new_priority.trim()
      : null;

  const newDueDate =
    typeof entities.new_due_date === "string"
      ? entities.new_due_date.trim()
      : null;

  if (
    newTitle === null &&
    newStatus === null &&
    newPriority === null &&
    newDueDate === null
  ) {
    return {
      success: false,
      action: "update_task",
      message:
        "No task field was provided for update.",
      error: "NO_TASK_UPDATE_FIELDS",
    };
  }

  if (
    newStatus !== null &&
    !isValidTaskStatus(newStatus)
  ) {
    return {
      success: false,
      action: "update_task",
      message: "Invalid new task status.",
      error: "INVALID_NEW_TASK_STATUS",
    };
  }

  if (
    newPriority !== null &&
    !isValidPriority(newPriority)
  ) {
    return {
      success: false,
      action: "update_task",
      message: "Invalid new task priority.",
      error: "INVALID_NEW_TASK_PRIORITY",
    };
  }

  const task =
    await resolveTaskForUpdate(
      supabase,
      companyId,
      entities.task_id,
      entities.task_title,
      entities.priority,
      entities.assigned_employee_name
    );

  const oldValues = {
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
  };

  const updates: Record<string, unknown> =
    {};

  if (newTitle !== null) {
    updates.title = newTitle;
  }

  if (newStatus !== null) {
    updates.status = newStatus;
  }

  if (newPriority !== null) {
    updates.priority = newPriority;
  }

  if (newDueDate !== null) {
    updates.due_date =
      newDueDate || null;
  }

  const { error: updateError } =
    await supabase
      .from("tasks")
      .update(updates)
      .eq("company_id", companyId)
      .eq("id", task.id);

  if (updateError) {
    throw updateError;
  }

  const {
    data: verifiedTask,
    error: verificationError,
  } = await supabase
    .from("tasks")
    .select(
      "id, company_id, title, description, status, priority, due_date, customer_id, assigned_to, assigned_by, assignment_type, assignment_status"
    )
    .eq("company_id", companyId)
    .eq("id", task.id)
    .maybeSingle();

  if (verificationError) {
    await supabase
      .from("tasks")
      .update(oldValues)
      .eq("company_id", companyId)
      .eq("id", task.id);

    throw verificationError;
  }

  if (!verifiedTask) {
    await supabase
      .from("tasks")
      .update(oldValues)
      .eq("company_id", companyId)
      .eq("id", task.id);

    return {
      success: false,
      action: "update_task",
      message:
        "The task was updated but could not be verified. The operation was rolled back.",
      error:
        "TASK_UPDATE_VERIFICATION_FAILED",
    };
  }

  const titleValid =
    newTitle === null ||
    verifiedTask.title === newTitle;

  const statusValid =
    newStatus === null ||
    verifiedTask.status === newStatus;

  const priorityValid =
    newPriority === null ||
    verifiedTask.priority === newPriority;

  const dueDateValid =
    newDueDate === null ||
    (newDueDate === ""
      ? verifiedTask.due_date === null
      : verifiedTask.due_date ===
        newDueDate);

  if (
    !titleValid ||
    !statusValid ||
    !priorityValid ||
    !dueDateValid
  ) {
    await supabase
      .from("tasks")
      .update(oldValues)
      .eq("company_id", companyId)
      .eq("id", task.id);

    return {
      success: false,
      action: "update_task",
      message:
        "The task update could not be verified. The operation was rolled back.",
      error:
        "TASK_UPDATE_VERIFICATION_FAILED",
    };
  }

  return {
    success: true,
    action: "update_task",
    message:
      "Task updated and verified successfully.",
    data: {
      task: verifiedTask,
      previous_values: oldValues,
    },
  };
}

async function loadEmployeeCandidates(
  companyId: string,
  taskId: string
): Promise<EmployeeCandidate[]> {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: members,
    error: membersError,
  } = await supabaseAdmin
    .from("company_members")
    .select(
      "user_id, role, job_title, specialty, max_active_tasks, is_available"
    )
    .eq("company_id", companyId)
    .eq("role", "employee");

  if (membersError) {
    throw membersError;
  }

  if (!members || members.length === 0) {
    return [];
  }

  const candidates: EmployeeCandidate[] =
    [];

  for (const member of members) {
    if (!member.is_available) {
      continue;
    }

    const { count, error: countError } =
      await supabaseAdmin
        .from("tasks")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("company_id", companyId)
        .eq("assigned_to", member.user_id)
        .neq("id", taskId)
        .in("status", [
          "جديدة",
          "قيد التنفيذ",
          "new",
          "in_progress",
        ]);

    if (countError) {
      throw countError;
    }

    const activeTasks = count ?? 0;

    const maxTasks =
      member.max_active_tasks ?? 10;

    if (activeTasks >= maxTasks) {
      continue;
    }

    let fullName: string | null = null;
    let email: string | null = null;

    const {
      data: authUserData,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        member.user_id
      );

    if (authUserData?.user) {
      fullName =
        typeof authUserData.user.user_metadata
          ?.full_name === "string"
          ? authUserData.user.user_metadata
              .full_name
          : null;

      email =
        authUserData.user.email ?? null;
    }

    candidates.push({
      user_id: member.user_id,
      role: member.role,
      job_title: member.job_title,
      specialty: member.specialty,
      max_active_tasks: maxTasks,
      is_available:
        member.is_available,
      full_name: fullName,
      email,
      active_tasks: activeTasks,
    });
  }

  return candidates;
}

async function resolveTaskForAssignment(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  taskId: string | null | undefined,
  taskTitle: string | null | undefined
) {
  return resolveTaskForUpdate(
    supabase,
    companyId,
    taskId,
    taskTitle,
    null,
    null
  );
}

async function executeAssignTask(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  action: IntentAction,
  companyId: string,
  plan: IntentPlan,
  actingUserId: string
): Promise<ExecutionResult> {
  const entities = plan.entities;

  const taskId =
    typeof entities.task_id === "string"
      ? entities.task_id
      : null;

  const taskTitle =
    typeof entities.task_title === "string"
      ? entities.task_title
      : null;

  const task =
    await resolveTaskForAssignment(
      supabase,
      companyId,
      taskId,
      taskTitle
    );

  const candidates =
    await loadEmployeeCandidates(
      companyId,
      task.id
    );

  const requestedName =
    typeof entities.assigned_employee_name ===
      "string" &&
    entities.assigned_employee_name.trim()
      ? entities.assigned_employee_name.trim()
      : null;

  if (requestedName) {
    const supabaseAdminForManualAssignment =
      getSupabaseAdmin();

    const {
      data: members,
      error: membersError,
    } = await supabaseAdminForManualAssignment
      .from("company_members")
      .select(
        "user_id, role, job_title, specialty, max_active_tasks, is_available"
      )
      .eq("company_id", companyId)
      .eq("role", "employee");

    if (membersError) {
      throw membersError;
    }

    const normalizedRequestedName =
      normalizeEmployeeName(
        requestedName
      );

    const matchingEmployees: EmployeeCandidate[] =
      [];

    for (const member of members ?? []) {
      const {
        data: authUserData,
        error: authUserError,
      } =
        await supabaseAdminForManualAssignment.auth.admin.getUserById(
          member.user_id
        );

      if (authUserError) {
        continue;
      }

      const fullName =
        typeof authUserData?.user
          ?.user_metadata?.full_name ===
        "string"
          ? authUserData.user.user_metadata
              .full_name
          : null;

      if (
        !fullName ||
        normalizeEmployeeName(fullName) !==
          normalizedRequestedName
      ) {
        continue;
      }

      const { count, error: countError } =
        await supabaseAdminForManualAssignment
          .from("tasks")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("company_id", companyId)
          .eq("assigned_to", member.user_id)
          .neq("id", task.id)
          .in("status", [
            "جديدة",
            "قيد التنفيذ",
            "new",
            "in_progress",
          ]);

      if (countError) {
        throw countError;
      }

      matchingEmployees.push({
        user_id: member.user_id,
        role: member.role,
        job_title: member.job_title,
        specialty: member.specialty,
        max_active_tasks:
          member.max_active_tasks ?? 10,
        is_available:
          member.is_available,
        full_name: fullName,
        email:
          authUserData.user.email ?? null,
        active_tasks: count ?? 0,
      });
    }

    if (matchingEmployees.length === 0) {
      return {
        success: false,
        action: "assign_task",
        message:
          `Employee "${requestedName}" was not found in this company.`,
        error: "EMPLOYEE_NOT_FOUND",
      };
    }

    if (matchingEmployees.length > 1) {
      return {
        success: false,
        action: "assign_task",
        message:
          `More than one employee matches "${requestedName}".`,
        error: "AMBIGUOUS_EMPLOYEE",
      };
    }

    const selectedEmployee =
      matchingEmployees[0];

    if (!selectedEmployee) {
      return {
        success: false,
        action: "assign_task",
        message:
          "No employee was selected.",
        error:
          "EMPLOYEE_SELECTION_FAILED",
      };
    }

    const assignmentType: "manual" =
      "manual";

    const assignmentReason =
      `Task explicitly assigned to ${selectedEmployee.full_name}.`;

    const {
      data: updatedTask,
      error: updateError,
    } = await supabase
      .from("tasks")
      .update({
        assigned_to:
          selectedEmployee.user_id,
        assigned_by:
          actingUserId,
        assignment_type:
          assignmentType,
        assignment_status:
          "assigned",
      })
      .eq("company_id", companyId)
      .eq("id", task.id)
      .select(
        "id, company_id, title, description, status, priority, due_date, assigned_to, assigned_by, assignment_type, assignment_status"
      )
      .single();

    if (updateError || !updatedTask) {
      throw (
        updateError ??
        new Error(
          "Failed to assign task."
        )
      );
    }

    const {
      data: verifiedTask,
      error: verificationError,
    } = await supabase
      .from("tasks")
      .select(
        "id, company_id, title, status, priority, due_date, assigned_to, assigned_by, assignment_type, assignment_status"
      )
      .eq("company_id", companyId)
      .eq("id", task.id)
      .maybeSingle();

    if (verificationError) {
      throw verificationError;
    }

    if (
      !verifiedTask ||
      verifiedTask.assigned_to !==
        selectedEmployee.user_id ||
      verifiedTask.assignment_status !==
        "assigned"
    ) {
      return {
        success: false,
        action: "assign_task",
        message:
          "The task assignment could not be verified.",
        error:
          "ASSIGNMENT_VERIFICATION_FAILED",
      };
    }

    const {
      error: historyError,
    } =
      await supabaseAdminForManualAssignment
        .from(
          "task_assignment_history"
        )
        .insert({
          task_id: task.id,
          company_id: companyId,
          assigned_to:
            selectedEmployee.user_id,
          assigned_by:
            actingUserId,
          assignment_type:
            assignmentType,
          action: "assigned",
          reason: assignmentReason,
        });

    if (historyError) {
      console.error(
        "Failed to save task assignment history:",
        historyError
      );
    }

    const {
      error: employeeNotificationError,
    } =
      await supabaseAdminForManualAssignment
        .from("notifications")
        .insert({
          company_id: companyId,
          user_id:
            selectedEmployee.user_id,
          type:
            "task_assigned",
          title:
            "Task assigned",
          message:
            `BusinessOS assigned "${task.title}" to you.`,
          task_id: task.id,
        });

    if (employeeNotificationError) {
      console.error(
        "Employee notification failed:",
        employeeNotificationError
      );
    }

    return {
      success: true,
      action: "assign_task",
      message:
        "Task assigned and verified successfully.",
      data: {
        task: verifiedTask,
        employee: {
          user_id:
            selectedEmployee.user_id,
          name:
            selectedEmployee.full_name,
          email:
            selectedEmployee.email,
          job_title:
            selectedEmployee.job_title,
          specialty:
            selectedEmployee.specialty,
          active_tasks:
            selectedEmployee.active_tasks,
        },
        assignment_type:
          assignmentType,
        reason:
          assignmentReason,
      },
    };
  }

  if (candidates.length === 0) {
    return {
      success: false,
      action: "assign_task",
      message:
        "No available employee can receive this task.",
      error: "NO_AVAILABLE_EMPLOYEE",
    };
  }

  let selectedEmployee:
    | EmployeeCandidate
    | undefined;

  let assignmentType:
    | "manual"
    | "ai";

  let assignmentReason = "";

  const supabaseAdminForAIAssignment =
    getSupabaseAdmin();

  const {
    data: company,
    error: companyError,
  } = await supabaseAdminForAIAssignment
    .from("companies")
    .select("task_assignment_mode")
    .eq("id", companyId)
    .single();

  if (companyError) {
    throw companyError;
  }

  const assignmentMode =
    company?.task_assignment_mode;

  if (assignmentMode !== "ai_auto") {
    return {
      success: false,
      action: "assign_task",
      message:
        "Task requires manager approval before assignment.",
      error:
        "MANAGER_APPROVAL_REQUIRED",
    };
  }

  const groq = getGroq();

  const prompt = `
You are the task assignment engine for BusinessOS.

Choose exactly one employee from the provided candidates.

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
${JSON.stringify(
  candidates.map((employee) => ({
    user_id: employee.user_id,
    full_name: employee.full_name,
    job_title: employee.job_title,
    specialty: employee.specialty,
    active_tasks:
      employee.active_tasks,
    max_active_tasks:
      employee.max_active_tasks,
    is_available:
      employee.is_available,
  })),
  null,
  2
)}

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

Return ONLY valid JSON:

{
  "employee_user_id": "exact-user-id",
  "reason": "short explanation"
}
`;

  const completion =
    await groq.chat.completions.create({
      model:
        "openai/gpt-oss-120b",
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
    return {
      success: false,
      action: "assign_task",
      message:
        "AI returned an empty assignment result.",
      error:
        "AI_ASSIGNMENT_EMPTY",
    };
  }

  let aiSelection: AISelection;

  try {
    aiSelection =
      JSON.parse(raw);
  } catch {
    return {
      success: false,
      action: "assign_task",
      message:
        "AI returned invalid assignment data.",
      error:
        "AI_ASSIGNMENT_INVALID_JSON",
    };
  }

  selectedEmployee =
    candidates.find(
      (employee) =>
        employee.user_id ===
        aiSelection.employee_user_id
    );

  if (!selectedEmployee) {
    return {
      success: false,
      action: "assign_task",
      message:
        "AI selected an employee who is not an eligible company employee.",
      error:
        "AI_EMPLOYEE_NOT_ELIGIBLE",
    };
  }

  assignmentType = "ai";
  assignmentReason =
    aiSelection.reason ||
    "Selected by BusinessOS AI based on employee suitability and workload.";

  if (!selectedEmployee) {
    return {
      success: false,
      action: "assign_task",
      message:
        "No employee was selected.",
      error:
        "EMPLOYEE_SELECTION_FAILED",
    };
  }

  const {
    data: updatedTask,
    error: updateError,
  } = await supabase
    .from("tasks")
    .update({
      assigned_to:
        selectedEmployee.user_id,
      assigned_by:
        null,
      assignment_type:
        assignmentType,
      assignment_status:
        "assigned",
    })
    .eq("company_id", companyId)
    .eq("id", task.id)
    .select(
      "id, company_id, title, description, status, priority, due_date, assigned_to, assigned_by, assignment_type, assignment_status"
    )
    .single();

  if (updateError || !updatedTask) {
    throw (
      updateError ??
      new Error(
        "Failed to assign task."
      )
    );
  }

  const {
    data: verifiedTask,
    error: verificationError,
  } = await supabase
    .from("tasks")
    .select(
      "id, company_id, title, status, priority, due_date, assigned_to, assigned_by, assignment_type, assignment_status"
    )
    .eq("company_id", companyId)
    .eq("id", task.id)
    .maybeSingle();

  if (verificationError) {
    throw verificationError;
  }

  if (
    !verifiedTask ||
    verifiedTask.assigned_to !==
      selectedEmployee.user_id ||
    verifiedTask.assignment_status !==
      "assigned"
  ) {
    return {
      success: false,
      action: "assign_task",
      message:
        "The task assignment could not be verified.",
      error:
        "ASSIGNMENT_VERIFICATION_FAILED",
    };
  }

  const {
    error: historyError,
  } =
    await supabaseAdminForAIAssignment
      .from(
        "task_assignment_history"
      )
      .insert({
        task_id: task.id,
        company_id: companyId,
        assigned_to:
          selectedEmployee.user_id,
        assigned_by:
          null,
        assignment_type:
          assignmentType,
        action: "assigned",
        reason: assignmentReason,
      });

  if (historyError) {
    console.error(
      "Failed to save task assignment history:",
      historyError
    );
  }

  const {
    error: employeeNotificationError,
  } =
    await supabaseAdminForAIAssignment
      .from("notifications")
      .insert({
        company_id: companyId,
        user_id:
          selectedEmployee.user_id,
        type:
          "task_assigned_ai",
        title:
          "AI task assignment",
        message:
          `BusinessOS AI assigned "${task.title}" to you.`,
        task_id: task.id,
      });

  if (employeeNotificationError) {
    console.error(
      "Employee notification failed:",
      employeeNotificationError
    );
  }

  if (assignmentType === "ai") {
    const {
      data: ownerMembers,
    } =
      await supabaseAdminForAIAssignment
        .from("company_members")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("role", "owner");

    if (
      ownerMembers &&
      ownerMembers.length > 0
    ) {
      const ownerNotifications =
        ownerMembers.map(
          (owner) => ({
            company_id: companyId,
            user_id:
              owner.user_id,
            type:
              "task_assigned_ai_manager",
            title:
              "AI task assignment",
            message:
              `BusinessOS AI automatically assigned "${task.title}" to an employee.`,
            task_id: task.id,
          })
        );

      const {
        error:
          ownerNotificationError,
      } =
        await supabaseAdminForAIAssignment
          .from("notifications")
          .insert(
            ownerNotifications
          );

      if (
        ownerNotificationError
      ) {
        console.error(
          "Owner notification failed:",
          ownerNotificationError
        );
      }
    }
  }

  return {
    success: true,
    action: "assign_task",
    message:
      assignmentType === "ai"
        ? "Task assigned by AI and verified successfully."
        : "Task assigned and verified successfully.",
    data: {
      task: verifiedTask,
      employee: {
        user_id:
          selectedEmployee.user_id,
        name:
          selectedEmployee.full_name,
        email:
          selectedEmployee.email,
        job_title:
          selectedEmployee.job_title,
        specialty:
          selectedEmployee.specialty,
        active_tasks:
          selectedEmployee.active_tasks,
      },
      assignment_type:
        assignmentType,
      reason:
        assignmentReason,
    },
  };
}

async function executeAction(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  companyId: string,
  action: IntentAction,
  plan: IntentPlan,
  actingUserId: string
): Promise<ExecutionResult> {
  switch (action.type) {
    case "create_customer":
      return executeCreateCustomer(
        supabase,
        companyId,
        plan
      );

    case "create_task":
      return executeCreateTask(
        supabase,
        companyId,
        plan
      );

    case "create_order":
      return executeCreateOrder(
        supabase,
        companyId,
        plan
      );

    case "assign_task":
      return executeAssignTask(
        supabase,
        action,
        companyId,
        plan,
        actingUserId
      );

    case "update_customer":
      return executeUpdateCustomer(
        supabase,
        companyId,
        plan
      );

    case "update_order":
      return executeUpdateOrder(
        supabase,
        companyId,
        plan
      );

    case "update_task":
      return executeUpdateTask(
        supabase,
        companyId,
        plan
      );

    default:
      return {
        success: false,
        action: action.type,
        message:
          `Action "${action.type}" is not implemented in the Execution Engine yet.`,
        error:
          "ACTION_NOT_IMPLEMENTED",
      };
  }
}

export async function executeIntentPlan(
  plan: IntentPlan
): Promise<ExecutionResult[]> {
  if (
    !plan ||
    !Array.isArray(plan.actions) ||
    plan.actions.length === 0
  ) {
    throw new Error(
      "Execution plan contains no actions."
    );
  }

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "Authentication required."
    );
  }

  const {
    data: membership,
    error: membershipError,
  } =
    await supabase
      .from("company_members")
      .select(
        "company_id, role"
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    throw new Error(
      "Company membership not found."
    );
  }

  const companyId =
    membership.company_id;

  const {
    data: subscription,
    error: subscriptionError,
  } =
    await supabase
      .from("subscriptions")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active")
      .maybeSingle();

  if (subscriptionError) {
    throw subscriptionError;
  }

  if (!subscription) {
    throw new Error(
      "Active subscription required."
    );
  }

  const {
    data: planRecord,
    error: planError,
  } =
    await supabase
      .from("plans")
      .select("*")
      .eq("id", subscription.plan_id)
      .maybeSingle();

  if (planError) {
    throw planError;
  }

  if (!planRecord) {
    throw new Error(
      "Subscription plan not found."
    );
  }

  const permission =
    checkPlanPermissions(
      membership.role,
      plan
    );

  if (!permission.allowed) {
    throw new Error(
      `Execution denied. The current role is not allowed to perform: ${permission.deniedActions.join(", ")}.`
    );
  }

  const results: ExecutionResult[] = [];

  async function rollbackCreatedRecords() {
    for (
      let index = results.length - 1;
      index >= 0;
      index--
    ) {
      const result = results[index];

      if (
        !result?.success ||
        !result.data ||
        typeof result.data !== "object"
      ) {
        continue;
      }

      const data =
        result.data as Record<
          string,
          unknown
        >;

      if (
        result.action === "create_task"
      ) {
        const task = data.task;

        if (
          task &&
          typeof task === "object"
        ) {
          const taskRecord =
            task as Record<
              string,
              unknown
            >;

          if (
            typeof taskRecord.id === "string" &&
            taskRecord.id.trim()
          ) {
            await supabase
              .from("tasks")
              .delete()
              .eq("company_id", companyId)
              .eq("id", taskRecord.id);
          }
        }
      }

      if (
        result.action === "create_order"
      ) {
        const order = data.order;

        if (
          order &&
          typeof order === "object"
        ) {
          const orderRecord =
            order as Record<
              string,
              unknown
            >;

          if (
            typeof orderRecord.id === "string" &&
            orderRecord.id.trim()
          ) {
            await supabase
              .from("orders")
              .delete()
              .eq("company_id", companyId)
              .eq("id", orderRecord.id);
          }
        }
      }

      if (
        result.action === "create_customer"
      ) {
        const customer = data.customer;

        if (
          customer &&
          typeof customer === "object"
        ) {
          const customerRecord =
            customer as Record<
              string,
              unknown
            >;

          if (
            typeof customerRecord.id === "string" &&
            customerRecord.id.trim()
          ) {
            await supabase
              .from("customers")
              .delete()
              .eq("company_id", companyId)
              .eq("id", customerRecord.id);
          }
        }
      }
    }
  }

  for (
    let actionIndex = 0;
    actionIndex < plan.actions.length;
    actionIndex++
  ) {
    const action =
      plan.actions[actionIndex];

    const runtimeEntities = {
      ...plan.entities,
    };

    const dependencyIndexes =
      Array.isArray(action.depends_on) &&
      action.depends_on.length > 0
        ? action.depends_on
        : results.map(
            (_result, index) => index
          );

    for (const dependencyIndex of dependencyIndexes) {
      const dependencyResult =
        results[Number(dependencyIndex)];

      if (
        dependencyResult?.success &&
        dependencyResult.action ===
          "create_customer" &&
        dependencyResult.data &&
        typeof dependencyResult.data ===
          "object"
      ) {
        const dependencyData =
          dependencyResult.data as Record<
            string,
            unknown
          >;

        const customer =
          dependencyData.customer;

        if (
          customer &&
          typeof customer === "object"
        ) {
          const customerRecord =
            customer as Record<
              string,
              unknown
            >;

          if (
            typeof customerRecord.id ===
              "string" &&
            customerRecord.id.trim()
          ) {
            runtimeEntities.customer_id =
              customerRecord.id;
          }
        }
      }

      if (
        dependencyResult?.success &&
        dependencyResult.action ===
          "create_task" &&
        dependencyResult.data &&
        typeof dependencyResult.data ===
          "object"
      ) {
        const dependencyData =
          dependencyResult.data as Record<
            string,
            unknown
          >;

        const task =
          dependencyData.task;

        if (
          task &&
          typeof task === "object"
        ) {
          const taskRecord =
            task as Record<
              string,
              unknown
            >;

          if (
            typeof taskRecord.id ===
              "string" &&
            taskRecord.id.trim()
          ) {
            runtimeEntities.task_id =
              taskRecord.id;
          }
        }
      }

      if (
        dependencyResult?.success &&
        dependencyResult.action ===
          "create_order" &&
        dependencyResult.data &&
        typeof dependencyResult.data ===
          "object"
      ) {
        const dependencyData =
          dependencyResult.data as Record<
            string,
            unknown
          >;

        const order =
          dependencyData.order;

        if (
          order &&
          typeof order === "object"
        ) {
          const orderRecord =
            order as Record<
              string,
              unknown
            >;

          if (
            typeof orderRecord.id ===
              "string" &&
            orderRecord.id.trim()
          ) {
            runtimeEntities.order_id =
              orderRecord.id;
          }
        }
      }
    }

    const runtimePlan: IntentPlan = {
      ...plan,
      entities: runtimeEntities,
    };

    let result: ExecutionResult;

    try {
      result = await executeAction(
        supabase,
        companyId,
        action,
        runtimePlan,
        user.id
      );
    } catch (error) {
      if (
        error instanceof CustomerAmbiguityError
      ) {
        result = {
          success: false,
          action: action.type,
          message: error.message,
          error: "CUSTOMER_AMBIGUOUS",
          data: {
            customer_name:
              runtimeEntities.customer_name ??
              null,
            customers:
              error.customers,
          },
        };
      } else {
        await rollbackCreatedRecords();
        throw error;
      }
    }

    results.push(result);

    if (!result.success) {
      await rollbackCreatedRecords();
      break;
    }
  }

  return results;
}