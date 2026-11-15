"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatTurn, Handoff, TraceStep } from "@/lib/agent";
import type { Booking } from "@/lib/restaurant";
import { withBase } from "@/lib/basePath";

const STORE = "frontdesk-demo-v1";
const GREETING: ChatTurn = {
  role: "assistant",
  text: "Hi, welcome to Ember & Fig. I can book you a table, tell you what's on the menu, or check allergens. What can I do for you?",
};
const SUGGESTIONS = [
  "Table for 4 this Saturday at 8pm?",
  "What's vegan and nut-free?",
  "Does the hake have any allergens?",
  "Can I bring my dog?",
  "We'd like to hire the whole place for a 40th, about 35 people",
];

type Tab = "bookings" | "handoffs" | "trace";

interface Saved {
  chat: ChatTurn[];
  bookings: Booking[];
  handoffs: Handoff[];
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(s: Saved) {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    /* private mode: the demo still works, it just won't remember */
  }
}

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const TOOL_LABEL: Record<string, string> = {
  searchMenu: "Looked up the menu",
  checkAvailability: "Checked for a free table",
  createBooking: "Made the booking",
  handOffToStaff: "Passed it to the team",
};

export function FrontDeskApp() {
  const [chat, setChat] = useState<ChatTurn[]>([GREETING]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("bookings");
  const [flash, setFlash] = useState<Tab | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = load();
    if (s) {
      setChat(s.chat.length ? s.chat : [GREETING]);
      setBookings(s.bookings ?? []);
      setHandoffs(s.handoffs ?? []);
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    const next = [...chat, { role: "user" as const, text: msg }];
    setChat(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const res = await fetch(withBase("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The greeting is UI only; the model sees the conversation from the guest's first message.
        body: JSON.stringify({ history: next.slice(1), bookings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      const chat2 = [...next, { role: "assistant" as const, text: data.reply || "Sorry, could you say that again?" }];
      const b2 = [...bookings, ...data.newBookings];
      const h2 = [...handoffs, ...data.handoffs];
      setChat(chat2);
      setBookings(b2);
      setHandoffs(h2);
      setTrace(data.trace);
      if (data.newBookings.length) { setTab("bookings"); setFlash("bookings"); }
      else if (data.handoffs.length) { setTab("handoffs"); setFlash("handoffs"); }
      save({ chat: chat2, bookings: b2, handoffs: h2 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setChat(chat);
      setInput(msg);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setChat([GREETING]);
    setBookings([]);
    setHandoffs([]);
    setTrace([]);
    setError("");
    save({ chat: [], bookings: [], handoffs: [] });
  }

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  const sorted = [...bookings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="max-w-3xl">
        <p className="text-sm text-muted">Live demo · AI front desk for restaurants, salons and clinics</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Bookings and questions, answered while you cook.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">
          Play the guest on the left. The assistant answers from the restaurant&apos;s own menu and rules, checks real
          availability, takes bookings, and passes anything it shouldn&apos;t handle to a person. On the right is what
          the owner sees. <span className="text-foreground">Ember &amp; Fig is a made-up restaurant</span>; for a real
          one this would use your menu, your booking system and your WhatsApp number.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Guest view */}
        <section aria-label="Guest chat" className="flex h-[34rem] lg:h-[38rem] flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-serif text-lg text-white">E</div>
            <div className="min-w-0">
              <p className="font-medium">Ember &amp; Fig</p>
              <p className="text-xs text-muted">Guest view · replies in seconds, day or night</p>
            </div>
            <button onClick={reset} className="ml-auto shrink-0 whitespace-nowrap rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-accent hover:text-foreground">
              Start over
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
            {chat.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
                <p
                  className={
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed " +
                    (m.role === "user" ? "rounded-br-md bg-accent text-white" : "rounded-bl-md bg-sand/60")
                  }
                >
                  {m.text}
                </p>
              </div>
            ))}
            {busy && (
              <div className="flex">
                <p className="rounded-2xl rounded-bl-md bg-sand/60 px-4 py-3 text-sm text-muted">
                  <span className="inline-block animate-pulse">Checking…</span>
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {chat.length <= 2 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  className="shrink-0 rounded-full border border-line bg-background px-3 py-1.5 text-xs hover:border-accent disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {error && <p className="px-4 pb-2 text-sm text-accent">{error}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <label htmlFor="msg" className="sr-only">Message</label>
            <input
              id="msg"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Ask about a table, the menu, allergens…"
              className="min-w-0 flex-1 rounded-full border border-line bg-background px-4 py-2.5 text-[15px] outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>

        {/* Owner view */}
        <section aria-label="Owner view" className="flex h-[24rem] lg:h-[38rem] flex-col overflow-hidden rounded-3xl border border-line bg-background">
          <div className="border-b border-line px-5 pt-4">
            <p className="text-xs uppercase tracking-wider text-muted">Owner&apos;s view</p>
            <div role="tablist" className="mt-3 flex gap-1 overflow-x-auto">
              {([
                ["bookings", `Bookings (${bookings.length})`],
                ["handoffs", `Needs a person (${handoffs.length})`],
                ["trace", "What the AI did"],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={
                    "shrink-0 rounded-t-xl px-3 py-2 text-sm transition " +
                    (tab === id ? "bg-card font-medium text-foreground" : "text-muted hover:text-foreground") +
                    (flash === id ? " ring-2 ring-sun" : "")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-card px-5 py-5">
            {tab === "bookings" &&
              (sorted.length === 0 ? (
                <Empty>No bookings yet. Ask for a table in the chat and it lands here, already checked against free tables.</Empty>
              ) : (
                <ul className="space-y-3">
                  {sorted.map((b) => (
                    <li key={b.ref} className="rounded-2xl border border-line bg-background p-4">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <p className="font-medium">{b.name}</p>
                        <p className="text-sm text-muted">party of {b.partySize}</p>
                        <p className="ml-auto font-mono text-xs text-muted">{b.ref}</p>
                      </div>
                      <p className="mt-1 text-sm">
                        {fmtDate(b.date)} · {b.time}
                        {b.partySize >= 6 && <span className="ml-2 rounded-full bg-sun/25 px-2 py-0.5 text-xs">deposit due</span>}
                      </p>
                      {(b.phone || b.notes) && (
                        <p className="mt-1 text-sm text-muted">{[b.phone, b.notes].filter(Boolean).join(" · ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ))}

            {tab === "handoffs" &&
              (handoffs.length === 0 ? (
                <Empty>Nothing needs you. Big groups, private hire, complaints and anything the assistant isn&apos;t sure about appear here with a summary, so nobody has to read the whole chat.</Empty>
              ) : (
                <ul className="space-y-3">
                  {handoffs.map((h) => (
                    <li key={h.id} className="rounded-2xl border border-line bg-background p-4">
                      <p className="text-xs uppercase tracking-wider text-accent">{h.reason}</p>
                      <p className="mt-1 text-[15px] leading-relaxed">{h.summary}</p>
                      {h.contact && <p className="mt-1 text-sm text-muted">Contact: {h.contact}</p>}
                    </li>
                  ))}
                </ul>
              ))}

            {tab === "trace" &&
              (trace.length === 0 ? (
                <Empty>Send a message and this shows each step the assistant took for its last reply: what it looked up and what came back. Nothing is made up from thin air.</Empty>
              ) : (
                <ol className="space-y-3">
                  {trace.map((s, i) => (
                    <li key={i} className="rounded-2xl border border-line bg-background p-4">
                      <p className="text-sm font-medium">
                        {s.type === "tool-call" ? TOOL_LABEL[s.toolName] ?? s.toolName : "Result"}
                        <span className="ml-2 font-mono text-xs text-muted">{s.toolName}</span>
                      </p>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted">
                        {JSON.stringify(s.type === "tool-call" ? s.args : s.result, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ol>
              ))}
          </div>
        </section>
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted">
        Built by{" "}
        <a href="/" className="text-accent underline-offset-4 hover:underline">Adjetei Martey</a>. Your chat and bookings
        stay in your browser; nothing is saved on a server. Want this for your business?{" "}
        <a href="/services" className="text-accent underline-offset-4 hover:underline">See how it works</a>.
      </p>
    </main>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="max-w-sm text-[15px] leading-relaxed text-muted">{children}</p>;
}
