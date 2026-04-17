export type NavbarState = "expanded" | "compact"
export type BillingPeriod = "monthly" | "annual"

export function getNavbarState(scrollY: number): NavbarState {
  return scrollY > 24 ? "compact" : "expanded"
}

export function getAnnualSavingsLabel(percentage: number): string {
  return `Save ${percentage}%`
}

export function getBillingCopy(period: BillingPeriod): {
  periodLabel: string
  helperLabel: string
} {
  if (period === "annual") {
    return {
      periodLabel: "Annual",
      helperLabel: "Free for all early users",
    }
  }

  return {
    periodLabel: "Monthly",
    helperLabel: "Free for all early users",
  }
}
