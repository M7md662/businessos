import type {
  IntentAction,
  IntentActionType,
  IntentPlan,
} from "./intent-planner";

export type BusinessRole =
  | "owner"
  | "manager"
  | "sales"
  | "support"
  | "employee";

export type PermissionResult = {
  allowed: boolean;
  action: IntentActionType;
  reason: string;
};

export type PlanPermissionResult = {
  allowed: boolean;
  results: PermissionResult[];
  deniedActions: IntentActionType[];
};

type PermissionRule = Partial<Record<IntentActionType, boolean>>;

/**
 * Stage 6 — AI Intent & Action Engine
 *
 * This module is responsible only for authorization.
 * It does NOT execute actions and does NOT handle confirmation.
 *
 * Permission flow:
 *
 * User Role
 *    ↓
 * Permission Matrix
 *    ↓
 * Action Permission
 *    ↓
 * ALLOW / DENY
 */

const permissionMatrix: Record<BusinessRole, PermissionRule> = {
  owner: {
    create_customer: true,
    create_order: true,
    create_task: true,
    assign_task: true,
    update_customer: true,
    update_order: true,
    update_task: true,
  },

  manager: {
    create_customer: true,
    create_order: true,
    create_task: true,
    assign_task: true,
    update_customer: true,
    update_order: true,
    update_task: true,
  },

  sales: {
    create_customer: true,
    create_order: true,
    create_task: true,
    assign_task: false,
    update_customer: true,
    update_order: true,
    update_task: false,
  },

  support: {
    create_customer: true,
    create_order: false,
    create_task: true,
    assign_task: false,
    update_customer: true,
    update_order: false,
    update_task: false,
  },

  employee: {
    create_customer: false,
    create_order: false,
    create_task: true,
    assign_task: false,
    update_customer: false,
    update_order: false,
    update_task: true,
  },
};

function isBusinessRole(value: string): value is BusinessRole {
  return (
    value === "owner" ||
    value === "manager" ||
    value === "sales" ||
    value === "support" ||
    value === "employee"
  );
}

function getPermissionReason(
  role: BusinessRole,
  action: IntentActionType,
  allowed: boolean
): string {
  if (allowed) {
    return `Role "${role}" is allowed to perform "${action}".`;
  }

  return `Role "${role}" is not allowed to perform "${action}".`;
}

/**
 * Check permission for one action.
 */
export function checkActionPermission(
  role: string,
  action: IntentAction | IntentActionType
): PermissionResult {
  const actionType =
    typeof action === "string" ? action : action.type;

  if (!isBusinessRole(role)) {
    return {
      allowed: false,
      action: actionType,
      reason: `Unknown business role "${role}".`,
    };
  }

  const allowed =
    permissionMatrix[role][actionType] === true;

  return {
    allowed,
    action: actionType,
    reason: getPermissionReason(
      role,
      actionType,
      allowed
    ),
  };
}

/**
 * Check every action in an Intent Plan.
 *
 * Important:
 * If one action is denied, the entire plan is denied.
 *
 * This prevents partial execution such as:
 *
 * create_order   ✅
 * create_task    ✅
 * assign_task    ❌
 *
 * from executing the first two actions and then failing.
 */
export function checkPlanPermissions(
  role: string,
  plan: IntentPlan
): PlanPermissionResult {
  const results = plan.actions.map((action) =>
    checkActionPermission(role, action)
  );

  const deniedActions = results
    .filter((result) => !result.allowed)
    .map((result) => result.action);

  return {
    allowed: deniedActions.length === 0,
    results,
    deniedActions,
  };
}

/**
 * Returns the current permission matrix.
 *
 * Kept as a copy so callers cannot mutate
 * the internal matrix accidentally.
 */
export function getPermissionMatrix(): Record<
  BusinessRole,
  PermissionRule
> {
  return Object.fromEntries(
    Object.entries(permissionMatrix).map(
      ([role, permissions]) => [
        role,
        { ...permissions },
      ]
    )
  ) as Record<BusinessRole, PermissionRule>;
}