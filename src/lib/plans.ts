export type PlanKey = "Free" | "Starter" | "Creator" | "Pro" | "Studio";

export type PlanConfig = {
  key: PlanKey;
  label: string;
  price: number;
  storyLimitPerMonth: number;
  priority: boolean;
  description: string;
};

export const PLANS: PlanConfig[] = [
  {
    key: "Free",
    label: "Free",
    price: 0,
    storyLimitPerMonth: 1,
    priority: false,
    description: "Only Gmail accounts. Google sign-in supported.",
  },
  {
    key: "Starter",
    label: "Starter",
    price: 199,
    storyLimitPerMonth: 10,
    priority: false,
    description: "10 stories / month",
  },
  {
    key: "Creator",
    label: "Creator",
    price: 499,
    storyLimitPerMonth: 30,
    priority: false,
    description: "30 stories / month",
  },
  {
    key: "Pro",
    label: "Pro",
    price: 999,
    storyLimitPerMonth: 100,
    priority: true,
    description: "100 stories / month",
  },
  {
    key: "Studio",
    label: "Studio",
    price: 2999,
    storyLimitPerMonth: 999999,
    priority: true,
    description: "Unlimited priority generation",
  },
];

export function getPlanByKey(key: string) {
  return PLANS.find((plan) => plan.key === key) || PLANS[0];
}