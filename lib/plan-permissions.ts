export type PlanName =
  | "Free"
  | "Basic"
  | "Pro"
  | "Enterprise";

export type Feature =
  | "dashboard"
  | "customers"
  | "orders"
  | "tasks"
  | "conversations"
  | "knowledge"
  | "ai"
  | "advanced_ai"
  | "priority_support";

const planFeatures: Record<PlanName, Feature[]> = {
  Free: [
    "dashboard",
    "customers",
    "orders",
    "tasks",
  ],

  Basic: [
    "dashboard",
    "customers",
    "orders",
    "tasks",
    "conversations",
  ],

  Pro: [
    "dashboard",
    "customers",
    "orders",
    "tasks",
    "conversations",
    "knowledge",
    "ai",
  ],

  Enterprise: [
    "dashboard",
    "customers",
    "orders",
    "tasks",
    "conversations",
    "knowledge",
    "ai",
    "advanced_ai",
    "priority_support",
  ],
};

export function hasFeature(
  planName: string | null | undefined,
  feature: Feature
): boolean {
  if (!planName) {
    return false;
  }

  const normalizedPlan = normalizePlanName(planName);

  if (!normalizedPlan) {
    return false;
  }

  return planFeatures[normalizedPlan].includes(feature);
}

export function getPlanFeatures(
  planName: string | null | undefined
): Feature[] {
  if (!planName) {
    return [];
  }

  const normalizedPlan = normalizePlanName(planName);

  if (!normalizedPlan) {
    return [];
  }

  return planFeatures[normalizedPlan];
}

export function normalizePlanName(
  planName: string
): PlanName | null {
  const normalized = planName.trim().toLowerCase();

  switch (normalized) {
    case "free":
      return "Free";

    case "basic":
      return "Basic";

    case "pro":
      return "Pro";

    case "enterprise":
      return "Enterprise";

    default:
      return null;
  }
}

export function getPlanLevel(
  planName: string | null | undefined
): number {
  if (!planName) {
    return 0;
  }

  const normalizedPlan = normalizePlanName(planName);

  switch (normalizedPlan) {
    case "Free":
      return 1;

    case "Basic":
      return 2;

    case "Pro":
      return 3;

    case "Enterprise":
      return 4;

    default:
      return 0;
  }
}

export function isPlanAtLeast(
  currentPlan: string | null | undefined,
  requiredPlan: PlanName
): boolean {
  return getPlanLevel(currentPlan) >= getPlanLevel(requiredPlan);
}

