import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ChevronDown, Clock, FileText, Globe, Mic, ShieldCheck, Sparkles, Share2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const faqs = [
    {
      question: "Do I need to be online to record?",
      answer:
        "No. WalkNotes caches recordings offline and syncs them once you reconnect, so you never lose a thought.",
    },
    {
      question: "What styles can I choose from?",
      answer:
        "Start with built-in presets like product update, meeting recap, investor memo, coaching session, and craft your own tone.",
    },
    {
      question: "Can I export my notes?",
      answer:
        "Yes. Send polished notes to email, Notion, Google Drive, or download as Markdown with one tap.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Recordings are encrypted in transit and at rest. You control retention periods, and we never train models on your data.",
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-xl font-semibold text-[#0b1e3f]">
          WalkNotes
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="#how-it-works" className="transition hover:text-[#0b1e3f]">
            How it works
          </Link>
          <Link href="#features" className="transition hover:text-[#0b1e3f]">
            Features
          </Link>
          <Link href="#use-cases" className="transition hover:text-[#0b1e3f]">
            Use cases
          </Link>
          <Link href="#pricing" className="transition hover:text-[#0b1e3f]">
            Pricing
          </Link>
          <Link href="#faq" className="transition hover:text-[#0b1e3f]">
            FAQ
          </Link>
        </nav>
        <nav className="flex items-center gap-3">
          <SignedOut>
            <SignInButton
              mode="modal"
              forceRedirectUrl="/dashboard"
              fallbackRedirectUrl="/dashboard"
            >
              <Button variant="ghost" className="text-sm font-medium">
                Log In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button asChild variant="ghost" className="text-sm font-medium text-[#0b1e3f]">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-24">
        <section className="flex flex-col items-start gap-12 rounded-[40px] bg-[#f7f6f2] px-10 py-16 shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-xl flex-col gap-6">
            <span className="rounded-full bg-[#0b1e3f]/10 px-5 py-2 text-sm font-medium text-[#0b1e3f]">
              Turn your spoken thoughts into notes
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-[#0b1e3f] md:text-5xl">
              WalkNotes makes every idea sound like your smartest self.
            </h1>
            <p className="text-lg text-slate-600">
              Record while you walk, drive, or think on the fly. Pick a writing style and let the AI
              polish your words instantly.
            </p>
            <SignedOut>
              <div className="flex flex-col gap-4 sm:flex-row">
                <SignUpButton
                  mode="modal"
                  forceRedirectUrl="/dashboard"
                  fallbackRedirectUrl="/dashboard"
                >
                  <Button size="lg" className="px-10">
                    Sign Up for Free
                  </Button>
                </SignUpButton>
                <Button asChild variant="secondary" size="lg">
                  <Link href="#how-it-works">See How It Works</Link>
                </Button>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="px-10">
                  <Link href="/dashboard">Open Dashboard</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="#how-it-works">See How It Works</Link>
                </Button>
              </div>
            </SignedIn>
          </div>
          <div className="relative flex w-full max-w-sm flex-col items-center justify-center gap-6 rounded-3xl bg-[#0b1e3f] px-10 py-14 text-white shadow-xl">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
              <Mic className="h-14 w-14 animate-pulse" />
            </div>
            <p className="text-center text-lg font-medium">
              “Turn your spoken thoughts into beautifully written notes.”
            </p>
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              Recording ready
            </div>
          </div>
        </section>

        <section id="how-it-works" className="flex flex-col gap-14">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold text-[#0b1e3f]">How WalkNotes works</h2>
            <p className="text-lg text-slate-600">
              A simple three-step flow that keeps you in motion and hands-free.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Record",
                description: "Tap the floating mic button to start a 10-minute recording overlay.",
              },
              {
                title: "Choose Style",
                description:
                  "Pick from curated writing styles that instantly reshape your spoken thoughts.",
              },
              {
                title: "Get Your Note",
                description:
                  "WalkNotes transcribes and rewrites your note, ready to copy, share, or revisit later.",
              },
            ].map((step, index) => (
              <div
                key={step.title}
                className="flex flex-col gap-4 rounded-3xl border border-[#0b1e3f]/15 bg-white p-8 shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b1e3f] text-lg font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="text-2xl font-semibold text-[#0b1e3f]">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="flex flex-col gap-14">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold text-[#0b1e3f]">Designed for frictionless thinking</h2>
            <p className="text-lg text-slate-600">
              WalkNotes pairs effortless capture with instant AI polish so your smartest ideas never get lost.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Live voice clean-up",
                description: "AI removes filler words and rewrites transcripts with your chosen tone within seconds.",
                icon: Sparkles,
              },
              {
                title: "Offline-friendly capture",
                description: "Record confidently during commutes or hikes—uploads resume when you reconnect.",
                icon: Globe,
              },
              {
                title: "Automatic structure",
                description: "Turn rambling audio into organized summaries, action items, and shareable briefs.",
                icon: FileText,
              },
              {
                title: "Context aware styles",
                description: "Save presets for investor updates, journals, coaching notes, and switch in one tap.",
                icon: Share2,
              },
              {
                title: "Time smart playback",
                description: "Skim recordings with smart timestamps and re-listen only to the moments that matter.",
                icon: Clock,
              },
              {
                title: "Enterprise-grade security",
                description: "Your recordings are encrypted end to end and you control retention and exports.",
                icon: ShieldCheck,
              },
            ].map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="flex flex-col gap-4 rounded-3xl border border-[#0b1e3f]/10 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b1e3f]/10 text-[#0b1e3f]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-[#0b1e3f]">{title}</h3>
                <p className="text-base text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="use-cases"
          className="flex flex-col gap-12 rounded-[40px] bg-[#0b1e3f] px-10 py-16 text-white shadow-lg md:px-16"
        >
          <div className="flex flex-col gap-4">
            <span className="text-sm uppercase tracking-[0.3em] text-white/70">Use cases</span>
            <h2 className="text-3xl font-semibold md:text-4xl">The note-taker you need when your hands are busy</h2>
            <p className="text-lg text-white/70">
              WalkNotes keeps pace with every fast-moving role and routine.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Founders on the move",
                description: "Capture product ideas, investor updates, or stand-up recaps between meetings.",
              },
              {
                title: "Coaches & therapists",
                description: "Summarize sessions instantly while insights are fresh, with clear action items.",
              },
              {
                title: "Field reporters",
                description: "Record interviews on location and turn them into clean copy before you get back to the desk.",
              },
              {
                title: "Daily reflections",
                description: "Build a mindful habit with effortless voice journals that sound like your best writing.",
              },
            ].map(({ title, description }) => (
              <div key={title} className="rounded-3xl bg-white/5 p-8">
                <h3 className="text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-white/70">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="testimonials" className="flex flex-col gap-14">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold text-[#0b1e3f]">Loved by fast thinkers</h2>
            <p className="text-lg text-slate-600">
              Teams and solo founders use WalkNotes to stay aligned without slowing down.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "I walk around the block after each investor meeting and WalkNotes transforms my ramble into the follow-up email I send minutes later.",
                name: "Lina • Startup Founder",
              },
              {
                quote:
                  "My coaching notes went from scattered voice memos to crisp summaries clients rave about.",
                name: "Blake • Executive Coach",
              },
              {
                quote:
                  "I capture scenes on set, get structured bullet points, and publish faster than ever.",
                name: "Harper • Documentary Producer",
              },
            ].map(({ quote, name }) => (
              <div
                key={name}
                className="flex h-full flex-col gap-6 rounded-3xl border border-[#0b1e3f]/10 bg-white p-8 shadow-sm"
              >
                <p className="text-lg text-slate-700">&ldquo;{quote}&rdquo;</p>
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0b1e3f]">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="flex flex-col gap-12">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold text-[#0b1e3f]">Upgrade once, keep clarity forever</h2>
            <p className="text-lg text-slate-600">
              Simple, transparent pricing designed for builders who prefer ownership over subscriptions.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-between gap-8 rounded-3xl border border-[#0b1e3f]/15 bg-[#f7f6f2] p-10 shadow-lg">
              <div className="flex flex-col gap-5">
                <span className="self-start rounded-full bg-[#0b1e3f]/10 px-4 py-1 text-sm font-medium text-[#0b1e3f]">
                  One-time purchase
                </span>
                <h3 className="text-4xl font-semibold text-[#0b1e3f]">$50</h3>
                <p className="text-base text-slate-600">
                  Pay once and unlock lifetime access to WalkNotes features and updates.
                </p>
                <ul className="flex flex-col gap-3 text-sm text-slate-700">
                  {[
                    "Unlimited high-quality voice recordings",
                    "AI writing styles with tone presets and templates",
                    "Export to email, Notion, Drive, and more",
                    "Lifetime updates and priority support",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#0b1e3f]" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <SignedOut>
                <SignUpButton
                  mode="modal"
                  forceRedirectUrl="/dashboard"
                  fallbackRedirectUrl="/dashboard"
                >
                  <Button size="lg" className="w-full">
                    Get lifetime access
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button asChild size="lg" className="w-full">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              </SignedIn>
            </div>
            <div className="flex flex-col justify-between gap-8 rounded-3xl border border-[#0b1e3f]/15 bg-[#f7f6f2] p-10 shadow-lg">
              <div className="flex flex-col gap-5">
                <span className="self-start rounded-full bg-[#0b1e3f]/10 px-4 py-1 text-sm font-medium text-[#0b1e3f]">
                  Free plan
                </span>
                <h3 className="text-4xl font-semibold text-[#0b1e3f]">$0</h3>
                <p className="text-base text-slate-600">
                  Try WalkNotes and keep your first notes while you explore the workflow.
                </p>
                <ul className="flex flex-col gap-3 text-sm text-slate-700">
                  {["3 notes", "AI writing styles with tone presets and templates"].map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#0b1e3f]" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <SignedOut>
                <SignUpButton
                  mode="modal"
                  forceRedirectUrl="/dashboard"
                  fallbackRedirectUrl="/dashboard"
                >
                  <Button size="lg" className="w-full">
                    Record now
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button asChild size="lg" className="w-full">
                  <Link href="/dashboard">Record now</Link>
                </Button>
              </SignedIn>
            </div>
          </div>
        </section>

        <section
          id="cta"
          className="flex flex-col items-start gap-8 rounded-[40px] bg-gradient-to-r from-[#0b1e3f] via-[#132b5a] to-[#226bb5] px-10 py-16 text-white shadow-xl md:flex-row md:items-center md:justify-between md:px-16"
        >
          <div className="flex max-w-2xl flex-col gap-4">
            <h2 className="text-3xl font-semibold md:text-4xl">Take WalkNotes on your next walk</h2>
            <p className="text-lg text-white/80">
              Capture voice-first ideas, choose your tone, and deliver polished notes before you get back to your desk.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <SignedOut>
              <SignUpButton
                mode="modal"
                forceRedirectUrl="/dashboard"
                fallbackRedirectUrl="/dashboard"
              >
                <Button size="lg" className="min-w-[200px] bg-white text-[#0b1e3f] hover:bg-white/90">
                  Record now
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button asChild size="lg" className="min-w-[200px] bg-white text-[#0b1e3f] hover:bg-white/90">
                <Link href="/dashboard">Record now</Link>
              </Button>
            </SignedIn>
          </div>
        </section>

        <section id="faq" className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-semibold text-[#0b1e3f]">Questions, answered</h2>
            <p className="text-lg text-slate-600">
              Everything you need to know before bringing WalkNotes into your routine.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {faqs.map(({ question, answer }) => (
              <details
                key={question}
                className="group rounded-3xl border border-[#0b1e3f]/15 bg-white p-6 shadow-sm transition open:shadow-md"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-lg font-semibold text-[#0b1e3f] [&::-webkit-details-marker]:hidden">
                  {question}
                  <ChevronDown className="h-5 w-5 text-[#0b1e3f] transition group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-base text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
