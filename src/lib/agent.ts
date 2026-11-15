import { generateText, isStepCount, tool, type ModelMessage } from "ai";
import { z } from "zod";
import {
  bookingRef,
  checkAvailability,
  DAY_NAMES,
  londonToday,
  MENU,
  POLICIES,
  RESTAURANT,
  weekday,
  type Allergen,
  type Booking,
} from "./restaurant";

const MODEL = process.env.FRONTDESK_MODEL ?? "anthropic/claude-sonnet-5";

export interface Handoff {
  id: string;
  reason: "large group" | "private hire" | "complaint" | "allergy" | "other";
  summary: string;
  contact?: string;
  createdAt: string;
}

export type TraceStep =
  | { type: "tool-call"; toolName: string; args: unknown }
  | { type: "tool-result"; toolName: string; result: unknown };

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

const ALLERGENS = [
  "gluten", "crustaceans", "eggs", "fish", "peanuts", "soya", "milk",
  "nuts", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs",
] as const;

function systemPrompt(today: string) {
  return [
    `You are the online host for ${RESTAURANT.name}, ${RESTAURANT.blurb}`,
    `Today is ${DAY_NAMES[weekday(today)]} ${today} (London time). Work out dates like "Saturday" or "tomorrow" from this.`,
    "",
    "What you know about the restaurant (this is ALL you know; never invent anything else):",
    ...POLICIES.map((p) => `- ${p}`),
    "",
    "How to work:",
    "- For any menu, dish, price, dietary or allergen question, call searchMenu. Never describe dishes from memory.",
    "- Allergens: report the allergen list exactly as the tool gives it, and always add that the kitchen can't rule out traces. For a severe allergy, suggest noting it on the booking.",
    "- Bookings: you need name, date, time and party size (a phone number is optional). Call checkAvailability first. If it's free, read the details back and ask the guest to confirm. Only call createBooking after they clearly say yes. If it's not free, offer the alternative times the tool returned.",
    "- Hand off with handOffToStaff (and tell the guest the team will reply by email or phone within a day) for: groups over 8, private hire or events, complaints, refunds, deposits already paid, gift vouchers, anything you can't answer from the facts above. Ask for an email or phone number for the team first if they haven't given one.",
    "- Never take card details. Never promise anything the facts above don't say.",
    "- Style: warm, short, plain text (no markdown, no bullet symbols), like a good host replying on WhatsApp. Two to four sentences unless listing dishes.",
  ].join("\n");
}

export async function runHost(history: ChatTurn[], bookings: Booking[]) {
  const today = londonToday();
  const trace: TraceStep[] = [];
  const newBookings: Booking[] = [];
  const handoffs: Handoff[] = [];
  const all = () => [...bookings, ...newBookings];

  const tools = {
    searchMenu: tool({
      description:
        "Look up dishes on the menu. Filter by words in the name/description, by diet, and by allergens to avoid. Returns dishes with prices and their full allergen list.",
      inputSchema: z.object({
        query: z.string().optional().describe("Words to match, e.g. 'chicken', 'dessert', 'small plates'. Leave empty for the whole menu."),
        diet: z.enum(["vegetarian", "vegan"]).optional(),
        avoidAllergens: z.array(z.enum(ALLERGENS)).optional().describe("Allergens the guest must avoid"),
      }),
      execute: async ({ query, diet, avoidAllergens }) => {
        const words = (query ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);
        const items = MENU.filter((m) => {
          const hay = `${m.name} ${m.description} ${m.section}`.toLowerCase();
          if (words.length && !words.some((w) => hay.includes(w) || hay.includes(w.replace(/s$/, "")))) return false;
          if (diet && !m.diet.includes(diet)) return false;
          if (avoidAllergens?.some((a) => m.allergens.includes(a as Allergen))) return false;
          return true;
        });
        return {
          dishes: (items.length || !words.length ? items : MENU.filter((m) =>
            (!diet || m.diet.includes(diet)) && !avoidAllergens?.some((a) => m.allergens.includes(a as Allergen))))
            .map((m) => ({ ...m, price: `£${m.price}` })),
          note: items.length || !words.length ? undefined : "No dish matched those words, so this is the full list that fits the filters.",
        };
      },
    }),

    checkAvailability: tool({
      description: "Check whether a table is free. Always call before offering or making a booking.",
      inputSchema: z.object({
        date: z.string().describe("YYYY-MM-DD"),
        time: z.string().describe("HH:MM, 24-hour"),
        partySize: z.number().int().min(1).max(50),
      }),
      execute: async ({ date, time, partySize }) => checkAvailability(date, time, partySize, all(), today),
    }),

    createBooking: tool({
      description: "Book the table. Only call after checkAvailability succeeded AND the guest confirmed the details.",
      inputSchema: z.object({
        name: z.string().min(1),
        date: z.string(),
        time: z.string(),
        partySize: z.number().int().min(1).max(8),
        phone: z.string().optional(),
        notes: z.string().optional().describe("Allergies, high chair, occasion, accessibility needs"),
      }),
      execute: async (b) => {
        const check = checkAvailability(b.date, b.time, b.partySize, all(), today);
        if (!check.ok) return { booked: false, ...check };
        const booking: Booking = { ...b, ref: bookingRef(), createdAt: new Date().toISOString() };
        newBookings.push(booking);
        return {
          booked: true,
          booking,
          deposit: b.partySize >= 6 ? `£${b.partySize * 10} deposit; the team will send a payment link` : "none",
        };
      },
    }),

    handOffToStaff: tool({
      description: "Pass something to a human on the team. Use for anything outside the facts you have or outside online booking.",
      inputSchema: z.object({
        reason: z.enum(["large group", "private hire", "complaint", "allergy", "other"]),
        summary: z.string().describe("One or two lines the team can act on without reading the chat"),
        contact: z.string().optional().describe("Guest's email or phone, if given"),
      }),
      execute: async (h) => {
        const handoff: Handoff = { ...h, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        handoffs.push(handoff);
        return { passedToTeam: true, promise: "The team replies within a day." };
      },
    }),
  };

  const messages: ModelMessage[] = history.map((t) => ({ role: t.role, content: t.text }));

  const result = await generateText({
    model: MODEL,
    system: systemPrompt(today),
    messages,
    tools,
    stopWhen: isStepCount(6),
    onStepEnd: ({ toolCalls, toolResults }) => {
      for (const c of toolCalls) trace.push({ type: "tool-call", toolName: c.toolName, args: c.input });
      for (const r of toolResults) trace.push({ type: "tool-result", toolName: r.toolName, result: r.output });
    },
  });

  return { reply: result.text.trim(), trace, newBookings, handoffs };
}
