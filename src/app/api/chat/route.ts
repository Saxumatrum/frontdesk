import { NextResponse } from "next/server";
import { runHost, type ChatTurn } from "@/lib/agent";
import { rateLimit } from "@/lib/rateLimit";
import type { Booking } from "@/lib/restaurant";

export const maxDuration = 60;

const MAX_TURNS = 30;
const MAX_TEXT = 1000;

/**
 * Stateless: the visitor's browser holds the conversation and the bookings
 * they've made, and sends them with each message. Nothing is stored here,
 * so visitors never see each other's bookings.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "chat", 40);
  if (limited) return limited;

  let body: { history?: unknown; bookings?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const turns: ChatTurn[] = history
    .slice(-MAX_TURNS)
    .filter(
      (t): t is ChatTurn =>
        typeof t === "object" && t !== null &&
        ((t as ChatTurn).role === "user" || (t as ChatTurn).role === "assistant") &&
        typeof (t as ChatTurn).text === "string" && (t as ChatTurn).text.trim().length > 0,
    )
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_TEXT) }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must be from the guest." }, { status: 400 });
  }

  const bookings: Booking[] = (Array.isArray(body.bookings) ? body.bookings : [])
    .slice(0, 50)
    .filter(
      (b): b is Booking =>
        typeof b === "object" && b !== null &&
        typeof (b as Booking).date === "string" && typeof (b as Booking).time === "string" &&
        Number.isInteger((b as Booking).partySize) && (b as Booking).partySize > 0 && (b as Booking).partySize <= 8,
    );

  try {
    return NextResponse.json(await runHost(turns, bookings));
  } catch (error) {
    console.error("host failed:", error);
    return NextResponse.json({ error: "The assistant couldn't reply just now. Try again in a moment." }, { status: 500 });
  }
}
