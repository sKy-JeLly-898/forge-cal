import { BillingCycle, PlanTier } from "@prisma/client";

export const PLAN_CONFIG: Record<PlanTier, {
  label: string;
  monthlyUsd: number;
  yearlyUsd: number;
  siteLimit: number | null;
  maxApiKeys: number | null;
  supportMonths: number;
}> = {
  STARTER: {
    label: "Starter",
    monthlyUsd: 0,
    yearlyUsd: 0,
    siteLimit: 1,
    maxApiKeys: 1,
    supportMonths: 1,
  },
  GROWTH: {
    label: "Growth",
    monthlyUsd: 10,
    yearlyUsd: 96,
    siteLimit: 5,
    maxApiKeys: 5,
    supportMonths: 3,
  },
  SCALE: {
    label: "Scale",
    monthlyUsd: 25,
    yearlyUsd: 240,
    siteLimit: null,
    maxApiKeys: null,
    supportMonths: 8,
  },
};

export function getPlanDefaults(planTier: PlanTier) {
  const plan = PLAN_CONFIG[planTier];
  return {
    siteLimit: plan.siteLimit,
    maxApiKeys: plan.maxApiKeys,
    supportMonths: plan.supportMonths,
  };
}

export function formatBilling(billing: BillingCycle) {
  return billing === "YEARLY" ? "Yearly" : "Monthly";
}
