import { supabase } from "@/lib/supabase";

export type SubscriptionStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "pending";

export type Subscription = {
  id: string;
  company_id: string;
  plan_id: string;
  subscription_type: "free" | "trial" | "paid";
  status: SubscriptionStatus;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  payment_provider: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
  is_active: boolean;
};

export async function getCompanySubscription(
  companyId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Get company subscription error:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Check expiration
  if (
    data.end_date &&
    new Date(data.end_date).getTime() <= Date.now()
  ) {
    return {
      ...data,
      status: "expired",
    } as Subscription;
  }

  return data as Subscription;
}

export async function getPlan(
  planId: string
): Promise<Plan | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    console.error("Get plan error:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    features: Array.isArray(data.features)
      ? data.features
      : [],
  } as Plan;
}

export async function getCompanySubscriptionWithPlan(
  companyId: string
) {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription) {
    return {
      subscription: null,
      plan: null,
    };
  }

  const plan = await getPlan(subscription.plan_id);

  return {
    subscription,
    plan,
  };
}

export function isSubscriptionActive(
  subscription: Subscription | null
) {
  if (!subscription) {
    return false;
  }

  if (subscription.status !== "active") {
    return false;
  }

  if (
    subscription.end_date &&
    new Date(subscription.end_date).getTime() <= Date.now()
  ) {
    return false;
  }

  return true;
}