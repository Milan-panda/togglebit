import { describe, expect, it } from "vitest"

import {
  getAnnualSavingsLabel,
  getBillingCopy,
  getNavbarState,
} from "./landing-state"

describe("getNavbarState", () => {
  it("keeps the navbar expanded at top of page", () => {
    expect(getNavbarState(0)).toBe("expanded")
    expect(getNavbarState(24)).toBe("expanded")
  })

  it("switches the navbar to compact after scroll threshold", () => {
    expect(getNavbarState(25)).toBe("compact")
    expect(getNavbarState(300)).toBe("compact")
  })
})

describe("getAnnualSavingsLabel", () => {
  it("formats the annual savings badge copy", () => {
    expect(getAnnualSavingsLabel(20)).toBe("Save 20%")
  })
})

describe("getBillingCopy", () => {
  it("returns monthly labels", () => {
    expect(getBillingCopy("monthly")).toEqual({
      periodLabel: "Monthly",
      helperLabel: "Free for all early users",
    })
  })

  it("returns annual labels", () => {
    expect(getBillingCopy("annual")).toEqual({
      periodLabel: "Annual",
      helperLabel: "Free for all early users",
    })
  })
})
