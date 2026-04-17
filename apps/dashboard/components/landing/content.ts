export const LANDING_CONTENT = {
  brand: {
    name: "Togglebit",
    badge: "Built for modern product teams",
  },
  signedInCta: {
    label: "Dashboard",
    href: "/dashboard",
  },
  nav: {
    links: [
      { label: "Product", href: "#product" },
      { label: "Proof", href: "#proof" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
    ghostCta: { label: "See it live", href: "#product" },
    primaryCta: { label: "Start free", href: "/sign-in" },
  },
  hero: {
    headline: "Ship faster without breaking production",
    subheadline:
      "Togglebit gives your team safe rollouts, instant kill switches, and release confidence in one fast control layer.",
    proofBadge: "Trusted by 1,200+ product and engineering teams",
    primaryCta: { label: "Start free", href: "/sign-in" },
    secondaryCta: { label: "See it live", href: "#product" },
    statCards: [
      { label: "Rollouts protected this month", value: "4,982,344" },
      { label: "Average time to rollback", value: "14 sec" },
      { label: "Deploy confidence score", value: "98.6%" },
    ],
  },
  socialProof: {
    logos: [
      "Northstar",
      "Relay",
      "Pathwell",
      "Vectora",
      "Cloudline",
      "NimbleStack",
    ],
    ticker: [
      "1,204 teams onboarded",
      "27,980 flags created this week",
      "99.99% API reliability",
      "2.6M users behind safe rollouts today",
    ],
  },
  narrative: {
    title: "Your release process should feel calm, not fragile",
    panels: [
      {
        step: "01",
        heading: "Every deploy feels like a gamble",
        body: "You ship fast, but one unnoticed edge case can trigger outages, fire drills, and trust loss.",
      },
      {
        step: "02",
        heading: "Small failures become expensive chaos",
        body: "Engineers stop shipping boldly, PMs delay launches, and growth stalls because risk compounds with every release.",
      },
      {
        step: "03",
        heading: "Togglebit turns launches into controlled experiments",
        body: "Gate risky code behind flags, roll out in phases, and switch off issues instantly before customers notice.",
      },
    ],
  },
  preview: {
    title: "See every release move before it goes live",
    body: "Preview who gets what, when, and why. Scroll to walk through the exact rollout path your team uses in production.",
    steps: [
      {
        title: "Create a release flag",
        description: "Wrap risky changes in seconds and keep merge velocity high.",
      },
      {
        title: "Target the right audience",
        description: "Roll out by user segment, environment, or custom attributes.",
      },
      {
        title: "Monitor and adjust live",
        description: "Watch health signals and kill bad behavior without redeploying.",
      },
    ],
  },
  benefits: {
    title: "You will finally ship with speed and control",
    cards: [
      {
        title: "You will finally launch on your timeline",
        short: "Decouple deploy from release so deadlines stop blocking engineering.",
        detail:
          "Ship code as soon as it is ready, then release when your business team is ready to win.",
      },
      {
        title: "You will finally test in production safely",
        short: "Expose changes to tiny cohorts before broad release.",
        detail:
          "Reduce blast radius by default and use real behavior to decide when to scale exposure.",
      },
      {
        title: "You will finally stop panic rollbacks",
        short: "Switch off broken paths instantly from one control plane.",
        detail:
          "Protect revenue and user trust with an operational safety net your entire team can use.",
      },
      {
        title: "You will finally align product and engineering",
        short: "Give PMs release control without creating bottlenecks.",
        detail:
          "Coordinate launches, experiments, and messaging from one shared workflow.",
      },
    ],
  },
  howItWorks: {
    title: "Go from idea to safe release in 3 steps",
    steps: [
      {
        number: "1",
        title: "Wrap your feature",
        body: "Add one Togglebit check around new logic.",
      },
      {
        number: "2",
        title: "Choose your rollout",
        body: "Target internal users, beta cohorts, or percentages.",
      },
      {
        number: "3",
        title: "Launch with confidence",
        body: "Scale winners and disable risk instantly when needed.",
      },
    ],
  },
  testimonials: {
    title: "Teams that ship weekly now ship daily",
    items: [
      {
        quote:
          "Togglebit cut our rollback incidents by 63% in one quarter. Releases are now boring in the best way.",
        name: "Maya Patel",
        role: "VP Engineering",
        company: "Relay",
        metric: "63% fewer rollbacks",
      },
      {
        quote:
          "We launched paid plans in 3 regions without downtime. Feature flags gave us confidence to move fast.",
        name: "Jonas Reed",
        role: "Product Lead",
        company: "Northstar",
        metric: "3-region launch, 0 outages",
      },
      {
        quote:
          "Our experiment velocity doubled because PMs can coordinate launches without waiting on redeploys.",
        name: "Ari Kim",
        role: "Head of Growth",
        company: "Pathwell",
        metric: "2x experiment velocity",
      },
      {
        quote:
          "The kill switch alone paid for itself the first week we used Togglebit in production.",
        name: "Olivia Chen",
        role: "CTO",
        company: "Cloudline",
        metric: "First-week ROI",
      },
    ],
  },
  pricing: {
    title: "Free for all early users",
    subtitle:
      "Every plan is currently free while we onboard early teams. Lock in access now and keep shipping safely.",
    annualSavingsPercentage: 30,
    periodToggle: {
      monthly: "Monthly",
      annual: "Annual",
    },
    tiers: [
      {
        name: "Starter",
        blurb: "For teams shipping their first controlled rollouts",
        price: "$0",
        cadence: "Free for early users",
        highlights: [
          "Unlimited feature flags",
          "Basic user targeting",
          "Team seats included",
        ],
        cta: "Start free",
      },
      {
        name: "Growth",
        blurb: "For scaling products that need release confidence",
        price: "$0",
        cadence: "Free for early users",
        highlights: [
          "Advanced segmentation",
          "Instant kill switches",
          "Release analytics",
        ],
        cta: "Claim your spot",
        featured: true,
      },
      {
        name: "Scale",
        blurb: "For orgs running critical rollouts across environments",
        price: "$0",
        cadence: "Free for early users",
        highlights: [
          "Enterprise-grade controls",
          "Priority support",
          "Migration assistance",
        ],
        cta: "Start free",
      },
    ],
    faq: [
      {
        question: "How long is early access free?",
        answer:
          "All early users stay free through our early-access window and receive advance notice before any pricing changes.",
      },
      {
        question: "Do I need a credit card?",
        answer: "No credit card is required to start.",
      },
      {
        question: "Can we migrate from another flag provider?",
        answer:
          "Yes. We provide guided migration support so you can move safely without release disruption.",
      },
    ],
  },
  finalCta: {
    heading: "Your next launch can be your calmest launch",
    body: "Join early teams using Togglebit to ship fast, reduce release anxiety, and protect every deploy.",
    primaryCta: { label: "Start free", href: "/sign-in" },
    microcopy: "Still not sure? Read 3 case studies →",
  },
} as const
