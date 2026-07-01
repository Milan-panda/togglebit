"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion"

import { LANDING_CONTENT } from "@/components/landing/content"
import { getNavbarState, type NavbarState } from "@/components/landing/landing-state"

const easeOut = [0.22, 1, 0.36, 1] as const

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
}

const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

function useMotionConfig() {
  const reduceMotion = useReducedMotion()
  return {
    fadeUp: reduceMotion
      ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
      : fadeUp,
    stagger: reduceMotion
      ? { hidden: {}, visible: { transition: { staggerChildren: 0 } } }
      : stagger,
    instant: reduceMotion,
  }
}

export function LandingPage({ isSignedIn }: { isSignedIn: boolean }) {
  const [navbarState, setNavbarState] = useState<NavbarState>("expanded")
  const motionConfig = useMotionConfig()

  useEffect(() => {
    const onScroll = () => setNavbarState(getNavbarState(window.scrollY))
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <main className="relative overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.55_0.18_292/0.12),transparent)]"
      />

      <LandingNavbar navbarState={navbarState} isSignedIn={isSignedIn} />
      <HeroSection isSignedIn={isSignedIn} motionConfig={motionConfig} />
      <WhatItIsSection motionConfig={motionConfig} />
      <ArchitectureSection motionConfig={motionConfig} />
      <FeaturesSection motionConfig={motionConfig} />
      <SdkSection motionConfig={motionConfig} />
      <HowItWorksSection motionConfig={motionConfig} />
      <SetupSection isSignedIn={isSignedIn} motionConfig={motionConfig} />
      <FaqSection motionConfig={motionConfig} />
      <FinalCtaSection isSignedIn={isSignedIn} motionConfig={motionConfig} />
      <LandingFooter />
    </main>
  )
}

function LandingNavbar({
  navbarState,
  isSignedIn,
}: {
  navbarState: NavbarState
  isSignedIn: boolean
}) {
  const primaryCta = isSignedIn
    ? LANDING_CONTENT.signedInCta
    : LANDING_CONTENT.nav.primaryCta
  const isCompact = navbarState === "compact"

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-300 ease-out ${
          isCompact
            ? "border-b border-border/80 bg-background/90 py-3 backdrop-blur-md"
            : "py-5"
        }`}
      >
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-foreground"
        >
          {LANDING_CONTENT.brand.name}
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LANDING_CONTENT.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href={isSignedIn ? "/quickstart" : LANDING_CONTENT.nav.ghostCta.href}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            {LANDING_CONTENT.nav.ghostCta.label}
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={primaryCta.href}
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-shadow hover:shadow-md"
            >
              {primaryCta.label}
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

function HeroSection({
  isSignedIn,
  motionConfig,
}: {
  isSignedIn: boolean
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  const primaryCta = isSignedIn
    ? LANDING_CONTENT.signedInCta
    : LANDING_CONTENT.hero.primaryCta

  return (
    <section className="px-5 pb-20 pt-32 sm:pb-28 sm:pt-36 lg:pt-40">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={motionConfig.stagger}
        className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16"
      >
        <div className="space-y-6">
          <motion.p
            variants={motionConfig.fadeUp}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            {LANDING_CONTENT.brand.badge}
          </motion.p>

          <motion.h1
            variants={motionConfig.fadeUp}
            className="max-w-xl text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-[1.08] tracking-[-0.03em]"
          >
            {LANDING_CONTENT.hero.headline}
          </motion.h1>

          <motion.p
            variants={motionConfig.fadeUp}
            className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {LANDING_CONTENT.hero.subheadline}
          </motion.p>

          <motion.div
            variants={motionConfig.fadeUp}
            className="flex flex-wrap items-center gap-3 pt-1"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={primaryCta.href}
                className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-shadow hover:shadow-md"
              >
                {primaryCta.label}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a
                href={LANDING_CONTENT.hero.secondaryCta.href}
                className="inline-flex rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {LANDING_CONTENT.hero.secondaryCta.label}
              </a>
            </motion.div>
          </motion.div>

          <motion.p
            variants={motionConfig.fadeUp}
            className="font-mono text-xs text-muted-foreground"
          >
            {LANDING_CONTENT.hero.stackNote}
          </motion.p>
        </div>

        <motion.div variants={motionConfig.fadeUp}>
          <ProductPreview />
        </motion.div>
      </motion.div>
    </section>
  )
}

function ProductPreview() {
  return (
    <div className="rounded-xl border border-border bg-card p-1 shadow-[0_24px_48px_-24px_oklch(0.2_0.02_292/0.35)]">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="ml-2 text-xs text-muted-foreground">Rollout dashboard</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3.5 py-2.5">
          <p className="text-sm font-medium">checkout-v2</p>
          <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            Enabled
          </span>
        </div>
        <div className="rounded-lg border border-border bg-background p-3.5">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Rollout</span>
            <span className="font-medium text-foreground">42%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "42%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: easeOut, delay: 0.3 }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <PreviewMetric label="Type" value="Combined" />
          <PreviewMetric label="Env" value="prod" />
          <PreviewMetric label="Rules" value="plan=pro" />
        </div>
      </div>
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-2 py-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold">{value}</p>
    </div>
  )
}

function WhatItIsSection({
  motionConfig,
}: {
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  return (
    <section id="product" className="border-y border-border bg-muted/40 px-5 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={motionConfig.stagger}
        className="mx-auto max-w-6xl"
      >
        <motion.h2
          variants={motionConfig.fadeUp}
          className="max-w-lg text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em]"
        >
          {LANDING_CONTENT.whatItIs.title}
        </motion.h2>
        <motion.p
          variants={motionConfig.fadeUp}
          className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground"
        >
          {LANDING_CONTENT.whatItIs.body}
        </motion.p>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {LANDING_CONTENT.whatItIs.points.map((point) => (
            <motion.div key={point.title} variants={motionConfig.fadeUp}>
              <h3 className="text-base font-semibold">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {point.body}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

function ArchitectureSection({
  motionConfig,
}: {
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  return (
    <section className="px-5 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={motionConfig.stagger}
        className="mx-auto max-w-6xl"
      >
        <motion.div variants={motionConfig.fadeUp} className="max-w-2xl">
          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em]">
            {LANDING_CONTENT.architecture.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {LANDING_CONTENT.architecture.subtitle}
          </p>
        </motion.div>

        <div className="mt-12 space-y-4">
          {LANDING_CONTENT.architecture.layers.map((layer) => (
            <motion.article
              key={layer.name}
              variants={motionConfig.fadeUp}
              className="grid gap-6 rounded-xl border border-border bg-card p-6 md:grid-cols-[140px_1fr_auto] md:items-start"
            >
              <div>
                <p className="text-lg font-semibold">{layer.name}</p>
                <p className="mt-0.5 font-mono text-xs text-primary">{layer.package}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {layer.description}
              </p>
              <ul className="flex flex-wrap gap-2 md:max-w-[220px] md:justify-end">
                {layer.highlights.map((item) => (
                  <li
                    key={item}
                    className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

function FeaturesSection({
  motionConfig,
}: {
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  return (
    <section className="border-t border-border px-5 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={motionConfig.stagger}
        className="mx-auto max-w-6xl"
      >
        <motion.div variants={motionConfig.fadeUp} className="max-w-xl">
          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em]">
            {LANDING_CONTENT.features.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {LANDING_CONTENT.features.subtitle}
          </p>
        </motion.div>

        <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_CONTENT.features.items.map((item) => (
            <motion.div key={item.title} variants={motionConfig.fadeUp}>
              <dt className="font-semibold">{item.title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </dd>
            </motion.div>
          ))}
        </dl>
      </motion.div>
    </section>
  )
}

function SdkSection({
  motionConfig,
}: {
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  const { sdk } = LANDING_CONTENT

  return (
    <section id="sdk" className="border-t border-border bg-muted/40 px-5 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={motionConfig.stagger}
        className="mx-auto max-w-6xl"
      >
        <motion.div variants={motionConfig.fadeUp} className="max-w-xl">
          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em]">
            {sdk.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {sdk.subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={motionConfig.fadeUp}
          className="mt-8 inline-flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm"
        >
          <span className="text-muted-foreground">$</span>
          <span>{sdk.installCommand}</span>
        </motion.div>

        <div className="mt-8 flex flex-wrap gap-3">
          {sdk.runtimes.map((runtime) => (
            <motion.div
              key={runtime.name}
              variants={motionConfig.fadeUp}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="font-medium">{runtime.name}</span>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  runtime.status === "available"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {runtime.status === "available" ? "Available" : "Coming soon"}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <motion.div variants={motionConfig.fadeUp}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Client component
            </p>
            <CodeBlock code={sdk.clientExample} />
          </motion.div>
          <motion.div variants={motionConfig.fadeUp}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Server component
            </p>
            <CodeBlock code={sdk.serverExample} />
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-code-bg p-4 text-[13px] leading-relaxed text-code-foreground">
      <code>{code}</code>
    </pre>
  )
}

function HowItWorksSection({
  motionConfig,
}: {
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  const steps = LANDING_CONTENT.howItWorks.steps

  return (
    <section className="px-5 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={motionConfig.stagger}
        className="mx-auto max-w-6xl"
      >
        <motion.h2
          variants={motionConfig.fadeUp}
          className="max-w-lg text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em]"
        >
          {LANDING_CONTENT.howItWorks.title}
        </motion.h2>

        <div className="relative mt-14 md:mt-16">
          <div
            aria-hidden
            className="absolute inset-x-[calc(16.67%-1.25rem)] top-5 hidden h-px bg-linear-to-r from-primary/10 via-primary/35 to-primary/10 md:block"
          />

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={motionConfig.fadeUp}
                className="relative"
              >
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm ring-4 ring-background">
                  {step.number}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function SetupSection({
  isSignedIn,
  motionConfig,
}: {
  isSignedIn: boolean
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  const { setup } = LANDING_CONTENT
  const ctaHref = isSignedIn ? setup.cta.href : "/sign-in"

  return (
    <section id="setup" className="border-t border-border px-5 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={motionConfig.stagger}
        className="mx-auto max-w-6xl"
      >
        <motion.div variants={motionConfig.fadeUp} className="max-w-xl">
          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em]">
            {setup.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {setup.subtitle}
          </p>
        </motion.div>

        <ol className="relative mt-12 space-y-0 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-border">
          {setup.steps.map((step) => (
            <motion.li
              key={step.number}
              variants={motionConfig.fadeUp}
              className="relative flex gap-5 pb-10 last:pb-0"
            >
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-primary">
                {step.number}
              </div>
              <div className="pt-1.5">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>

        <motion.div variants={motionConfig.fadeUp} className="mt-8">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={ctaHref}
              className="inline-flex rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              {isSignedIn ? setup.cta.label : "Sign in to get started"}
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}

function FaqSection({
  motionConfig,
}: {
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  return (
    <section id="faq" className="border-t border-border bg-muted/40 px-5 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={motionConfig.stagger}
        className="mx-auto max-w-6xl"
      >
        <motion.h2
          variants={motionConfig.fadeUp}
          className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em]"
        >
          {LANDING_CONTENT.faq.title}
        </motion.h2>

        <div className="mt-10 max-w-2xl space-y-2">
          {LANDING_CONTENT.faq.items.map((item) => (
            <motion.div key={item.question} variants={motionConfig.fadeUp}>
              <details className="group rounded-lg border border-border bg-card open:bg-muted/30">
              <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium transition-colors group-open:text-foreground">
                <span className="flex items-center justify-between gap-4">
                  {item.question}
                  <span
                    aria-hidden
                    className="text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
              </details>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

function FinalCtaSection({
  isSignedIn,
  motionConfig,
}: {
  isSignedIn: boolean
  motionConfig: ReturnType<typeof useMotionConfig>
}) {
  const primaryCta = isSignedIn
    ? LANDING_CONTENT.signedInCta
    : LANDING_CONTENT.finalCta.primaryCta

  return (
    <section className="px-5 pb-20 pt-4 sm:pb-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={motionConfig.fadeUp}
        className="mx-auto max-w-6xl rounded-2xl border border-border bg-muted/50 px-6 py-12 sm:px-10 sm:py-14"
      >
        <h2 className="max-w-lg text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em]">
          {LANDING_CONTENT.finalCta.heading}
        </h2>
        <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
          {LANDING_CONTENT.finalCta.body}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={primaryCta.href}
              className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-shadow hover:shadow-md"
            >
              {primaryCta.label}
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={LANDING_CONTENT.finalCta.secondaryCta.href}
              className="inline-flex rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              {LANDING_CONTENT.finalCta.secondaryCta.label}
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t border-border px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {LANDING_CONTENT.brand.name}
          <span className="mx-2 text-border">·</span>
          Built as a personal project
        </p>
        <div className="flex gap-6">
          {LANDING_CONTENT.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
