import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Mic } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <Link href="/" className="text-xl font-semibold text-[#0b1e3f]">
          WalkNotes
        </Link>
        <nav className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal" redirectUrl="/dashboard">
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
                <SignUpButton mode="modal" redirectUrl="/dashboard">
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
      </main>
    </div>
  );
}
