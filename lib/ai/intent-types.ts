export type IntentActionType =
  | "create_customer"
  | "create_order"
  | "create_task"
  | "update_customer"
  | "update_order"
  | "update_task"
  | "assign_task";

export type IntentEntities = {
  customer_id?: string | null;
  customer_name?: string | null;
  new_customer_name?: string | null;

  phone?: string | null;
  email?: string | null;
  notes?: string | null;

  service?: string | null;
  new_service?: string | null;

  amount?: number | null;
  new_amount?: number | null;
  currency?: string | null;

  task_title?: string | null;
  task_id?: string | null;
  new_task_title?: string | null;

  order_id?: string | null;
  order_customer_name?: string | null;
  order_service?: string | null;

  priority?: string | null;
  new_priority?: string | null;

  status?: string | null;
  new_status?: string | null;

  due_date?: string | null;
  new_due_date?: string | null;

  assigned_employee_name?: string | null;
};

export type IntentAction = {
  type: IntentActionType;
  description: string;
  entities?: IntentEntities;
  depends_on?: string[];
};

export type IntentPlan = {
  intent: string;
  entities: IntentEntities;
  actions: IntentAction[];
};

export type CustomerSelection = {
  id: string;
  name: string;
};

export type IntentPermissionResult = {
  allowed: boolean;
  action: IntentActionType;
  reason: string;
};
