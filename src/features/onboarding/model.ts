export const onboardingSteps = [
  { key: "business-identity", title: "Business identity", description: "Choose how your business appears to clients." },
  { key: "location", title: "Location & region", description: "Set the timezone, currency, and primary location." },
  { key: "booking-policies", title: "Booking policies", description: "Define when clients can book or make changes." },
  { key: "staff-profile", title: "First staff profile", description: "Add the first person clients can book." },
  { key: "service", title: "First service", description: "Create your first bookable service." },
  { key: "availability", title: "Weekly availability", description: "Choose the hours clients can book." },
  { key: "review", title: "Review", description: "Check your setup before going live." },
  { key: "publish", title: "Publish", description: "Make the business publicly bookable." },
] as const;
export type OnboardingStep = (typeof onboardingSteps)[number]["key"];
export type ProgressFlags = Record<OnboardingStep, boolean>;
export function firstIncompleteStep(progress: ProgressFlags): OnboardingStep {
  return onboardingSteps.find((step) => !progress[step.key])?.key ?? "publish";
}
