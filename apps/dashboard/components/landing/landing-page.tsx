"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"

import { LANDING_CONTENT } from "@/components/landing/content"
import {
  getAnnualSavingsLabel,
  getBillingCopy,
  getNavbarState,
  type BillingPeriod,
  type NavbarState,
} from "@/components/landing/landing-state"

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
}

const staggerContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}

/** Conversion page orchestrates the full landing funnel from trigger to CTA. */
export function LandingPage({ isSignedIn }: { isSignedIn: boolean }) {
  const [navbarState, setNavbarState] = useState<NavbarState>("expanded")
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly")

  useEffect(() => {
    const onScroll = () => {
      setNavbarState(getNavbarState(window.scrollY))
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <main className="bg-[#0a0a0a] text-foreground">
      <LandingStyle />
      <LandingNavbar navbarState={navbarState} isSignedIn={isSignedIn} />
      <HeroSection isSignedIn={isSignedIn} />
      <SocialProofSection />
      <ProblemSection />
      <PreviewSection />
      <BenefitsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection
        isSignedIn={isSignedIn}
        billingPeriod={billingPeriod}
        onBillingChange={setBillingPeriod}
      />
      <FinalCtaSection isSignedIn={isSignedIn} />
    </main>
  )
}

/** Conversion header keeps the primary CTA visible while users scroll. */
function LandingNavbar({
  navbarState,
  isSignedIn,
}: {
  navbarState: NavbarState
  isSignedIn: boolean
}) {
  const navHeightClass = navbarState === "compact" ? "h-[60px]" : "h-[80px]"
  const primaryCta = isSignedIn
    ? LANDING_CONTENT.signedInCta
    : LANDING_CONTENT.nav.primaryCta

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-10">
      <div
        className={`mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/15 bg-white/5 px-4 backdrop-blur-xl transition-all duration-300 sm:px-6 ${navHeightClass}`}
      >
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.02em] text-white sm:text-base"
        >
          {LANDING_CONTENT.brand.name}
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {LANDING_CONTENT.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-white/75 transition-colors duration-200 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={LANDING_CONTENT.nav.ghostCta.href}
            className="rounded-full border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 transition-all duration-200 hover:border-white/40 hover:text-white"
          >
            {LANDING_CONTENT.nav.ghostCta.label}
          </a>
          <Link
            href={primaryCta.href}
            className="landing-cta-pulse rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-12px_rgba(124,58,237,0.9)]"
          >
            {primaryCta.label}
          </Link>
        </div>
      </div>
    </header>
  )
}

/** Conversion hero creates immediate emotional resonance and drives first click. */
function HeroSection({ isSignedIn }: { isSignedIn: boolean }) {
  const primaryCta = isSignedIn
    ? LANDING_CONTENT.signedInCta
    : LANDING_CONTENT.hero.primaryCta

  return (
    <section className="landing-hero-mesh relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 lg:px-10 lg:pb-28 lg:pt-44">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainerVariants}
        className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
      >
        <div className="space-y-7">
          <motion.p
            variants={sectionVariants}
            className="inline-flex rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm text-white/80"
          >
            {LANDING_CONTENT.hero.proofBadge}
          </motion.p>
          <motion.h1
            variants={sectionVariants}
            className="max-w-2xl text-5xl font-bold tracking-[-0.03em] text-white sm:text-6xl lg:text-[72px] lg:leading-[0.95]"
          >
            {LANDING_CONTENT.hero.headline}
          </motion.h1>
          <motion.p
            variants={sectionVariants}
            className="max-w-xl text-base leading-[1.7] text-white/70 sm:text-lg"
          >
            {LANDING_CONTENT.hero.subheadline}
          </motion.p>
          <motion.div variants={sectionVariants} className="flex flex-wrap gap-3">
            <Link
              href={primaryCta.href}
              className="landing-cta-pulse rounded-full bg-[#7C3AED] px-6 py-3 text-base font-semibold text-white shadow-[0_14px_40px_-16px_rgba(124,58,237,0.9)] transition-all duration-200 hover:-translate-y-0.5"
            >
              {primaryCta.label}
            </Link>
            <a
              href={LANDING_CONTENT.hero.secondaryCta.href}
              className="rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-white/90 transition-colors duration-200 hover:border-white/40 hover:text-white"
            >
              {LANDING_CONTENT.hero.secondaryCta.label}
            </a>
          </motion.div>
        </div>
        <motion.div
          variants={sectionVariants}
          className="relative rounded-3xl border border-white/15 bg-white/5 p-4 shadow-[0_30px_80px_-35px_rgba(124,58,237,0.75)] backdrop-blur-xl"
        >
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            {LANDING_CONTENT.hero.statCards.map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.3 }}
                className="rounded-xl border border-white/10 bg-white/3 p-4"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-white/45">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
              </motion.div>
            ))}
          </div>
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#7C3AED]/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
        </motion.div>
      </motion.div>
    </section>
  )
}

/** Conversion trust bar lowers skepticism through recognizable social evidence. */
function SocialProofSection() {
  return (
    <section id="proof" className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 rounded-3xl border border-white/10 bg-white/3 p-6 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {LANDING_CONTENT.socialProof.logos.map((logo) => (
            <div
              key={logo}
              className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-sm font-semibold text-white/70"
            >
              {logo}
            </div>
          ))}
        </div>
        <div className="overflow-hidden">
          <div className="landing-marquee flex min-w-max gap-10 py-2">
            {[...LANDING_CONTENT.socialProof.ticker, ...LANDING_CONTENT.socialProof.ticker].map(
              (item, index) => (
                <p key={`${item}-${index}`} className="text-sm text-white/65">
                  {item}
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Conversion narrative reframes pain and urgency before presenting solution. */
function ProblemSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainerVariants}
        className="mx-auto max-w-7xl"
      >
        <motion.h2
          variants={sectionVariants}
          className="max-w-3xl text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl lg:text-[48px]"
        >
          {LANDING_CONTENT.narrative.title}
        </motion.h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {LANDING_CONTENT.narrative.panels.map((panel) => (
            <motion.article
              key={panel.step}
              variants={sectionVariants}
              className="rounded-2xl border border-white/12 bg-white/3 p-6"
            >
              <p className="text-xs tracking-[0.14em] text-white/50">{panel.step}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{panel.heading}</h3>
              <p className="mt-3 text-base leading-[1.7] text-white/70">{panel.body}</p>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/** Conversion preview gives users a rewarding product glimpse before signup. */
function PreviewSection() {
  return (
    <section id="product" className="px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainerVariants}
          className="space-y-6"
        >
          <motion.h2
            variants={sectionVariants}
            className="text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl lg:text-[48px]"
          >
            {LANDING_CONTENT.preview.title}
          </motion.h2>
          <motion.p variants={sectionVariants} className="text-lg leading-[1.7] text-white/70">
            {LANDING_CONTENT.preview.body}
          </motion.p>
          <motion.div variants={staggerContainerVariants} className="space-y-3">
            {LANDING_CONTENT.preview.steps.map((step) => (
              <motion.div
                key={step.title}
                variants={sectionVariants}
                className="rounded-xl border border-white/10 bg-white/3 p-4"
              >
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-base text-white/65">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35 }}
          className="relative rounded-3xl border border-white/12 bg-black/35 p-5"
        >
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/2 p-4">
            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/40 px-4 py-3">
              <p className="text-sm text-white/70">Checkout v2 rollout</p>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300">
                Healthy
              </span>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/40 p-4">
              <div className="mb-3 flex items-center justify-between text-sm text-white/65">
                <span>Exposure</span>
                <span>42%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "42%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="h-2 rounded-full bg-[#7C3AED]"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="Error rate" value="-37%" />
              <MiniStat label="Latency" value="-21%" />
              <MiniStat label="Revenue" value="+14%" />
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-20 right-10 h-44 w-44 rounded-full bg-[#7C3AED]/25 blur-3xl" />
        </motion.div>
      </div>
    </section>
  )
}

/** Conversion stat chips provide fast evidence for decision confidence. */
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

/** Conversion benefit cards transform features into tangible user outcomes. */
function BenefitsSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl lg:text-[48px]"
        >
          {LANDING_CONTENT.benefits.title}
        </motion.h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {LANDING_CONTENT.benefits.cards.map((card) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              className="group rounded-2xl border border-white/12 bg-white/3 p-6 transition-colors duration-200 hover:border-[#7C3AED]/50"
            >
              <h3 className="text-2xl font-semibold text-white">{card.title}</h3>
              <p className="mt-3 text-base leading-[1.7] text-white/70">{card.short}</p>
              <p className="mt-3 max-h-0 overflow-hidden text-base leading-[1.7] text-white/75 transition-all duration-300 group-hover:max-h-36">
                {card.detail}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Conversion process section lowers cognitive load with a simple 3-step flow. */
function HowItWorksSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl lg:text-[48px]">
          {LANDING_CONTENT.howItWorks.title}
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {LANDING_CONTENT.howItWorks.steps.map((step) => (
            <article
              key={step.number}
              className="rounded-2xl border border-white/12 bg-white/3 p-6"
            >
              <p className="text-sm font-semibold text-[#A78BFA]">{step.number}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-base leading-[1.7] text-white/70">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Conversion testimonials provide quantified social proof to reduce risk perception. */
function TestimonialsSection() {
  const cards = useMemo(
    () => [...LANDING_CONTENT.testimonials.items, ...LANDING_CONTENT.testimonials.items],
    []
  )

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl lg:text-[48px]">
          {LANDING_CONTENT.testimonials.title}
        </h2>
        <div className="mt-10 overflow-hidden">
          <div className="landing-testimonial-track flex min-w-max gap-4 hover:paused">
            {cards.map((item, index) => (
              <article
                key={`${item.name}-${index}`}
                className="w-[320px] rounded-2xl border border-white/12 bg-white/3 p-5"
              >
                <p className="text-base leading-[1.7] text-white/80">{item.quote}</p>
                <p className="mt-5 text-sm font-semibold text-white">
                  {item.name} · {item.role}
                </p>
                <p className="text-sm text-white/60">{item.company}</p>
                <p className="mt-2 text-sm font-semibold text-[#A78BFA]">{item.metric}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Conversion pricing clarifies value and removes purchase friction at decision time. */
function PricingSection({
  isSignedIn,
  billingPeriod,
  onBillingChange,
}: {
  isSignedIn: boolean
  billingPeriod: BillingPeriod
  onBillingChange: (period: BillingPeriod) => void
}) {
  const billingCopy = getBillingCopy(billingPeriod)
  const savingsLabel = getAnnualSavingsLabel(
    LANDING_CONTENT.pricing.annualSavingsPercentage
  )

  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl lg:text-[48px]">
          {LANDING_CONTENT.pricing.title}
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-[1.7] text-white/70">
          {LANDING_CONTENT.pricing.subtitle}
        </p>

        <div className="mt-8 inline-flex items-center rounded-full border border-white/15 bg-white/3 p-1">
          <ToggleButton
            isActive={billingPeriod === "monthly"}
            label={LANDING_CONTENT.pricing.periodToggle.monthly}
            onClick={() => onBillingChange("monthly")}
          />
          <ToggleButton
            isActive={billingPeriod === "annual"}
            label={LANDING_CONTENT.pricing.periodToggle.annual}
            onClick={() => onBillingChange("annual")}
          />
          <span className="ml-1 rounded-full bg-[#7C3AED]/20 px-3 py-1 text-xs font-semibold text-[#C4B5FD]">
            {savingsLabel}
          </span>
        </div>

        <p className="mt-3 text-sm text-white/60">
          {billingCopy.periodLabel} · {billingCopy.helperLabel}
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {LANDING_CONTENT.pricing.tiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-2xl border p-6 ${
                "featured" in tier && tier.featured
                  ? "border-[#7C3AED]/65 bg-[#7C3AED]/10 shadow-[0_24px_70px_-36px_rgba(124,58,237,0.9)]"
                  : "border-white/12 bg-white/3"
              }`}
            >
              <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
              <p className="mt-2 text-sm text-white/70">{tier.blurb}</p>
              <p className="mt-6 text-4xl font-semibold text-white">{tier.price}</p>
              <p className="mt-1 text-sm text-white/60">{tier.cadence}</p>
              <ul className="mt-5 space-y-2">
                {tier.highlights.map((item) => (
                  <li key={item} className="text-sm text-white/75">
                    • {item}
                  </li>
                ))}
              </ul>
              <Link
                href={
                  isSignedIn
                    ? LANDING_CONTENT.signedInCta.href
                    : LANDING_CONTENT.hero.primaryCta.href
                }
                className="mt-7 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:-translate-y-0.5"
              >
                {isSignedIn ? LANDING_CONTENT.signedInCta.label : tier.cta}
              </Link>
            </article>
          ))}
        </div>

        <div id="faq" className="mt-10 space-y-3">
          {LANDING_CONTENT.pricing.faq.map((item) => (
            <details
              key={item.question}
              className="rounded-xl border border-white/12 bg-white/3 p-4"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-white">
                {item.question}
              </summary>
              <p className="mt-2 text-base leading-[1.7] text-white/70">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Conversion billing switch nudges users toward an annual commitment frame. */
function ToggleButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
        isActive ? "bg-white text-black" : "text-white/70 hover:text-white"
      }`}
    >
      {label}
    </button>
  )
}

/** Conversion footer repeats urgency and risk reversal for final signup push. */
function FinalCtaSection({ isSignedIn }: { isSignedIn: boolean }) {
  const primaryCta = isSignedIn
    ? LANDING_CONTENT.signedInCta
    : LANDING_CONTENT.finalCta.primaryCta

  return (
    <section className="px-4 pb-24 pt-20 sm:px-6 lg:px-10 lg:pb-28 lg:pt-32">
      <div className="mx-auto max-w-7xl rounded-3xl border border-white/15 bg-linear-to-br from-[#7C3AED]/30 via-[#7C3AED]/8 to-transparent p-8 sm:p-10 lg:p-14">
        <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl lg:text-[48px]">
          {LANDING_CONTENT.finalCta.heading}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-[1.7] text-white/75">
          {LANDING_CONTENT.finalCta.body}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href={primaryCta.href}
            className="landing-cta-pulse rounded-full bg-white px-6 py-3 text-base font-semibold text-black transition-all duration-200 hover:-translate-y-0.5"
          >
            {primaryCta.label}
          </Link>
          <p className="text-sm font-medium text-white/75">
            {LANDING_CONTENT.finalCta.microcopy}
          </p>
        </div>
      </div>
    </section>
  )
}

/** Conversion animation styles create motion cues that guide attention to CTA moments. */
function LandingStyle() {
  return (
    <style jsx global>{`
      .landing-hero-mesh::before {
        content: "";
        position: absolute;
        inset: -30% -10% auto;
        height: 520px;
        background: radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.35), transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.18), transparent 45%),
          radial-gradient(circle at 50% 80%, rgba(124, 58, 237, 0.2), transparent 45%);
        filter: blur(10px);
        pointer-events: none;
      }

      .landing-cta-pulse {
        position: relative;
      }

      .landing-cta-pulse::after {
        content: "";
        position: absolute;
        inset: -4px;
        border-radius: 9999px;
        border: 1px solid rgba(196, 181, 253, 0.7);
        animation: landingPulse 2.4s ease-out infinite;
      }

      .landing-marquee {
        animation: landingMarquee 22s linear infinite;
      }

      .landing-testimonial-track {
        animation: landingMarquee 30s linear infinite;
      }

      @keyframes landingPulse {
        0% {
          transform: scale(1);
          opacity: 0.8;
        }
        70% {
          transform: scale(1.05);
          opacity: 0;
        }
        100% {
          transform: scale(1.05);
          opacity: 0;
        }
      }

      @keyframes landingMarquee {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(-50%);
        }
      }
    `}</style>
  )
}
