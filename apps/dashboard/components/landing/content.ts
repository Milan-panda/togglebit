export const LANDING_CONTENT = {
  brand: {
    name: "Togglebit",
    badge: "Personal project · Feature flags for Next.js",
  },
  signedInCta: {
    label: "Dashboard",
    href: "/dashboard",
  },
  nav: {
    links: [
      { label: "Product", href: "#product" },
      { label: "SDK", href: "#sdk" },
      { label: "Setup", href: "#setup" },
      { label: "FAQ", href: "#faq" },
    ],
    ghostCta: { label: "Quickstart", href: "/quickstart" },
    primaryCta: { label: "Sign in", href: "/sign-in" },
  },
  hero: {
    headline: "Ship code without shipping the risk",
    subheadline:
      "Togglebit is a feature flag platform I built to separate deploys from releases. Wrap new logic behind a flag, roll it out gradually, and turn it off instantly when something breaks.",
    primaryCta: { label: "Explore the dashboard", href: "/sign-in" },
    secondaryCta: { label: "How it works", href: "#product" },
    stackNote: "SDK · API · Dashboard · npm install togglebit",
  },
  whatItIs: {
    title: "What problem does this solve?",
    body: "Deploying code and releasing a feature are not the same thing. You can merge today and expose the change to 5% of users tomorrow, or keep it off until QA signs off. When a rollout misbehaves, you flip a switch instead of rolling back an entire deploy.",
    points: [
      {
        title: "Decouple deploy from release",
        body: "Merge to main on your schedule. Turn the feature on when you are ready.",
      },
      {
        title: "Shrink the blast radius",
        body: "Start with internal users, a beta cohort, or a small percentage before going wide.",
      },
      {
        title: "Kill switches without redeploys",
        body: "Disable a bad path in seconds from the dashboard while the rest of your app keeps running.",
      },
    ],
  },
  architecture: {
    title: "Three pieces, one system",
    subtitle:
      "Togglebit is a full stack I designed and built: a lightweight SDK for your app, a fast evaluation API, and a dashboard to manage everything.",
    layers: [
      {
        name: "SDK",
        package: "togglebit",
        description:
          "TypeScript-first npm package under 2kb gzipped. React hooks for client components, a zero-dependency server helper for RSC and route handlers.",
        highlights: ["useFlag hook", "getFlag for server", "Built-in LRU cache", "Fails safe to off"],
      },
      {
        name: "API",
        package: "FastAPI",
        description:
          "Python backend with a Redis-cached evaluation path and Postgres as source of truth. API keys for SDK access, Clerk JWT for dashboard management.",
        highlights: ["Sub-ms eval cache", "4 flag types", "Per-environment config", "Audit log"],
      },
      {
        name: "Dashboard",
        package: "Next.js",
        description:
          "Management UI where you create flags, tune rollouts, generate API keys, and invite teammates. Includes a built-in quickstart with copy-paste snippets.",
        highlights: ["Org + RBAC", "Rule builder", "Env switcher", "Live flag toggles"],
      },
    ],
  },
  features: {
    title: "What you can do today",
    subtitle:
      "Everything below is implemented and working. This is not a mockup or a slide deck.",
    items: [
      {
        title: "Boolean flags",
        body: "Simple on/off switches for any feature or code path.",
      },
      {
        title: "Percentage rollouts",
        body: "Deterministic bucketing so the same user always gets the same experience. Roll from 0% to 100% with a slider.",
      },
      {
        title: "Segment targeting",
        body: "Target users by plan, country, email domain, or any custom attribute you pass in context.",
      },
      {
        title: "Combined rules",
        body: "Stack segment gates with percentage rollouts for fine-grained control.",
      },
      {
        title: "Three environments",
        body: "Independent config for dev, staging, and prod. Switch environments in the dashboard without leaving your flow.",
      },
      {
        title: "Teams and API keys",
        body: "Organizations with role-based access. Generate per-environment API keys shown exactly once.",
      },
    ],
  },
  sdk: {
    title: "The SDK",
    subtitle:
      "Install with npm, add your API key, and evaluate flags in a few lines. The package ships dual entry points so server code never pulls in React.",
    installCommand: "npm install togglebit",
    runtimes: [
      {
        name: "Next.js / React",
        status: "available" as const,
        description: "Client hooks and server-side evaluation for App Router.",
      },
      {
        name: "Python",
        status: "coming" as const,
        description: "Native client for backends and scripts. On the roadmap.",
      },
    ],
    clientExample: `'use client'
import { useFlag } from 'togglebit'

export function Checkout() {
  const v2 = useFlag('checkout-v2', { userId: user.id })
  return v2 ? <NewCheckout /> : <LegacyCheckout />
}`,
    serverExample: `import { createTogglebit } from 'togglebit/server'

const togglebit = createTogglebit({
  apiKey: process.env.TOGGLEBIT_API_KEY!,
  environment: 'prod',
})

const enabled = await togglebit.getFlag('checkout-v2', {
  userId: user.id,
  plan: 'pro',
})`,
  },
  howItWorks: {
    title: "From flag to rollout in three steps",
    steps: [
      {
        number: "1",
        title: "Create a flag",
        body: "Name it, pick a type (boolean, percentage, segment, or combined), and configure each environment in the dashboard.",
      },
      {
        number: "2",
        title: "Wire up the SDK",
        body: "Wrap your app with TogglebitProvider and call useFlag on the client, or getFlag in a server component.",
      },
      {
        number: "3",
        title: "Roll out and adjust",
        body: "Start at 0%, watch how it behaves, then increase exposure or flip the kill switch if needed.",
      },
    ],
  },
  setup: {
    title: "Setup guide",
    subtitle:
      "The dashboard includes a full quickstart with your API key pre-filled. Here is the short version.",
    steps: [
      {
        number: "1",
        title: "Sign in and create an org",
        body: "Use the dashboard to set up your workspace and invite teammates if you want.",
      },
      {
        number: "2",
        title: "Generate an API key",
        body: "Pick an environment (dev, staging, or prod). Copy the key immediately; it is only shown once.",
      },
      {
        number: "3",
        title: "Install and evaluate",
        body: "Run npm install togglebit, add the provider, and check your first flag in under a minute.",
      },
    ],
    cta: { label: "Open quickstart guide", href: "/quickstart" },
  },
  faq: {
    title: "Common questions",
    items: [
      {
        question: "What is a feature flag?",
        answer:
          "A runtime switch that lets you turn code on or off without redeploying. Your app asks Togglebit whether a flag is enabled for a given user, and you branch accordingly.",
      },
      {
        question: "Do I need Next.js?",
        answer:
          "The SDK is built for Next.js App Router first, with React hooks for client components and a separate server entry for RSC. The evaluation API itself is framework-agnostic if you call it directly.",
      },
      {
        question: "What happens if Togglebit is down?",
        answer:
          "The SDK fails safe: any network error or missing flag defaults to off. Your app keeps running; the new feature just stays hidden.",
      },
      {
        question: "Is there a Python SDK?",
        answer:
          "Not yet. The Python API backend is live, and a Python client is planned. For now, use the TypeScript SDK or call the REST eval endpoint directly.",
      },
      {
        question: "Can I self-host this?",
        answer:
          "Yes. The whole stack runs via Docker Compose: nginx, API, dashboard, Postgres, and Redis on a single port. See the repo README for deployment.",
      },
      {
        question: "Is this a commercial product?",
        answer:
          "No. Togglebit is a personal project I built to learn full-stack system design and ship something real. The dashboard is open for anyone curious to explore.",
      },
    ],
  },
  finalCta: {
    heading: "Curious? Open the dashboard and poke around.",
    body: "Create a flag, generate a key, and follow the quickstart. No pitch deck, no sales call. Just the product.",
    primaryCta: { label: "Sign in to explore", href: "/sign-in" },
    secondaryCta: { label: "View quickstart", href: "/quickstart" },
  },
} as const
