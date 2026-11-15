/**
 * The demo restaurant. Everything the assistant knows comes from this file,
 * which is the point of the demo: for a real restaurant this would be their
 * menu, their rules and their booking system, not the model's imagination.
 */

export const RESTAURANT = {
  name: "Ember & Fig",
  blurb: "A made-up neighbourhood restaurant in north London, cooking over wood fire.",
  area: "Islington, London (demo restaurant, not a real address)",
  phone: "020 0000 0000 (demo)",
};

/** Opening hours by weekday (0 = Sunday). Last booking is 90 minutes before close. */
export const HOURS: Record<number, { open: string; close: string }[]> = {
  0: [{ open: "12:00", close: "17:00" }],
  1: [],
  2: [{ open: "17:30", close: "22:30" }],
  3: [{ open: "17:30", close: "22:30" }],
  4: [{ open: "17:30", close: "22:30" }],
  5: [{ open: "12:00", close: "15:00" }, { open: "17:30", close: "23:00" }],
  6: [{ open: "12:00", close: "15:00" }, { open: "17:30", close: "23:00" }],
};
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const POLICIES = [
  "Hours: Tue-Thu 17:30-22:30; Fri-Sat 12:00-15:00 and 17:30-23:00; Sun 12:00-17:00; closed Mondays.",
  "Last booking is 90 minutes before closing. Tables are held for 15 minutes after the booking time.",
  "Online bookings are for 1 to 8 people. Groups of 9 or more, private hire and events go to the team.",
  "Bookings of 6 or more need a £10 per person deposit, taken by the team after booking; it comes off the bill.",
  "Cancellations: free up to 24 hours before. Later cancellations of 6+ lose the deposit.",
  "Walk-ins welcome at the bar (8 seats), first come first served.",
  "Children welcome until 20:00; high chairs available (mention it in the booking notes).",
  "Dogs welcome in the bar area only, not the dining room.",
  "Step-free entrance and an accessible toilet on the ground floor.",
  "No parking; Highbury & Islington station is 5 minutes' walk (demo detail).",
  "Corkage £20 per bottle, max 2 bottles, Sunday to Thursday only.",
  "12.5% optional service charge, all of it goes to staff.",
  "Allergens: the kitchen handles all 14 major allergens, so it can't guarantee anything is completely free of traces. Severe allergies should be noted in the booking and mentioned to the server.",
  "Gift vouchers and private hire: the team handles these by email.",
];

export type Allergen =
  | "gluten" | "crustaceans" | "eggs" | "fish" | "peanuts" | "soya" | "milk"
  | "nuts" | "celery" | "mustard" | "sesame" | "sulphites" | "lupin" | "molluscs";

export interface MenuItem {
  name: string;
  section: "Small plates" | "Large plates" | "Sides" | "Desserts";
  description: string;
  price: number;
  allergens: Allergen[];
  diet: ("vegetarian" | "vegan")[];
}

export const MENU: MenuItem[] = [
  { name: "Flatbread, whipped feta, hot honey", section: "Small plates", description: "Wood-fired flatbread with whipped feta and chilli honey", price: 7, allergens: ["gluten", "milk"], diet: ["vegetarian"] },
  { name: "Charred hispi cabbage", section: "Small plates", description: "With miso butter and crispy shallots", price: 9, allergens: ["soya", "milk"], diet: ["vegetarian"] },
  { name: "Grilled squid, nduja, lemon", section: "Small plates", description: "Cornish squid, spicy nduja, lemon and parsley", price: 12, allergens: ["molluscs", "sulphites"], diet: [] },
  { name: "Beetroot, walnut, labneh", section: "Small plates", description: "Roast beetroot, toasted walnuts, labneh, dill", price: 9, allergens: ["nuts", "milk"], diet: ["vegetarian"] },
  { name: "Crispy chickpeas, smoked paprika", section: "Small plates", description: "A bowl of fried chickpeas to snack on", price: 5, allergens: [], diet: ["vegan", "vegetarian"] },
  { name: "Burrata, blood orange, pistachio", section: "Small plates", description: "Burrata with blood orange and pistachio crumb", price: 11, allergens: ["milk", "nuts"], diet: ["vegetarian"] },
  { name: "Wood-fired half chicken", section: "Large plates", description: "Brined half chicken, salsa verde, charred lemon", price: 22, allergens: ["mustard"], diet: [] },
  { name: "Hake, mussels, saffron broth", section: "Large plates", description: "Pan-roast hake with mussels in a saffron and fennel broth", price: 24, allergens: ["fish", "molluscs", "celery", "sulphites"], diet: [] },
  { name: "Lamb shoulder, flatbread, tahini", section: "Large plates", description: "Slow-cooked lamb to share, with flatbread and tahini yoghurt (serves 2)", price: 48, allergens: ["gluten", "sesame", "milk"], diet: [] },
  { name: "Ember-roast squash, romesco", section: "Large plates", description: "Whole roast squash, romesco, toasted seeds, herbs", price: 18, allergens: ["nuts", "sulphites"], diet: ["vegan", "vegetarian"] },
  { name: "Mushroom and lentil ragu, polenta", section: "Large plates", description: "Slow-cooked mushroom and lentil ragu on soft polenta", price: 17, allergens: ["celery"], diet: ["vegan", "vegetarian"] },
  { name: "Fries, rosemary salt", section: "Sides", description: "Skin-on fries (cooked in a shared fryer with gluten)", price: 5, allergens: [], diet: ["vegan", "vegetarian"] },
  { name: "Green salad, mustard dressing", section: "Sides", description: "Leaves, herbs, mustard vinaigrette", price: 5, allergens: ["mustard", "sulphites"], diet: ["vegan", "vegetarian"] },
  { name: "Burnt Basque cheesecake", section: "Desserts", description: "With poached rhubarb", price: 8, allergens: ["milk", "eggs", "gluten"], diet: ["vegetarian"] },
  { name: "Dark chocolate mousse, olive oil", section: "Desserts", description: "Aquafaba chocolate mousse with sea salt and olive oil", price: 7, allergens: ["soya"], diet: ["vegan", "vegetarian"] },
  { name: "Sorbet of the day", section: "Desserts", description: "Ask the server; always vegan", price: 5, allergens: [], diet: ["vegan", "vegetarian"] },
];

// ---------- availability ----------

export const MAX_PARTY_ONLINE = 8;
const COVERS_PER_SLOT = 20; // seats that can start a meal in any 30-minute window
const SEAT_MINUTES = 120;

export interface Booking {
  ref: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  partySize: number;
  phone?: string;
  notes?: string;
  createdAt: string;
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Today's date in London as YYYY-MM-DD. */
export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}

export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Every bookable start time on a date (every 30 minutes until 90 minutes before close). */
export function slots(date: string): string[] {
  const out: string[] = [];
  for (const { open, close } of HOURS[weekday(date)] ?? []) {
    for (let m = toMin(open); m <= toMin(close) - 90; m += 30) out.push(toTime(m));
  }
  return out;
}

/**
 * Covers already taken by "other guests", made up but stable for a given
 * date and time so the demo has realistic busy and quiet nights.
 */
function seededCovers(date: string, time: string): number {
  let h = 2166136261;
  for (const c of date + time) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const base = (h >>> 0) % 13;
  const m = toMin(time);
  const peak = m >= toMin("19:00") && m <= toMin("20:30") ? 7 : 0;
  const weekend = [5, 6].includes(weekday(date)) ? 4 : 0;
  return Math.min(COVERS_PER_SLOT, base + peak + weekend);
}

function coversAt(date: string, time: string, bookings: Booking[]): number {
  const m = toMin(time);
  const visitor = bookings
    .filter((b) => b.date === date && Math.abs(toMin(b.time) - m) < 30)
    .reduce((s, b) => s + b.partySize, 0);
  return seededCovers(date, time) + visitor;
}

export type Availability =
  | { ok: true; date: string; time: string; partySize: number }
  | { ok: false; reason: string; alternatives: string[] };

export function checkAvailability(date: string, time: string, partySize: number, bookings: Booking[], today = londonToday()): Availability {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { ok: false, reason: "That date isn't valid.", alternatives: [] };
  }
  if (date < today) return { ok: false, reason: "That date is in the past.", alternatives: [] };
  const days = (Date.parse(date) - Date.parse(today)) / 86_400_000;
  if (days > 60) return { ok: false, reason: "Bookings open 60 days ahead.", alternatives: [] };
  if (partySize > MAX_PARTY_ONLINE) {
    return { ok: false, reason: `Groups over ${MAX_PARTY_ONLINE} are booked by the team, not online.`, alternatives: [] };
  }
  const open = slots(date);
  if (open.length === 0) {
    return { ok: false, reason: `Closed on ${DAY_NAMES[weekday(date)]}s.`, alternatives: [] };
  }
  const free = open.filter((t) => coversAt(date, t, bookings) + partySize <= COVERS_PER_SLOT);
  if (date === today) {
    const nowMin = toMin(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    for (let i = free.length - 1; i >= 0; i--) if (toMin(free[i]) <= nowMin + 30) free.splice(i, 1);
  }
  const t = /^\d{2}:\d{2}$/.test(time) ? time : "";
  if (t && free.includes(t)) return { ok: true, date, time: t, partySize };
  const near = free
    .slice()
    .sort((a, b) => Math.abs(toMin(a) - toMin(t || "19:00")) - Math.abs(toMin(b) - toMin(t || "19:00")))
    .slice(0, 4)
    .sort();
  const reason = !t
    ? "No time given."
    : !open.includes(t)
      ? `${t} isn't a bookable time that day (open ${HOURS[weekday(date)].map((h) => `${h.open}-${h.close}`).join(" and ")}, last booking 90 minutes before close).`
      : `No table for ${partySize} at ${t}.`;
  return { ok: false, reason, alternatives: near };
}

export function bookingRef(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "EF-" + Array.from({ length: 5 }, () => a[Math.floor(Math.random() * a.length)]).join("");
}

export { SEAT_MINUTES };
