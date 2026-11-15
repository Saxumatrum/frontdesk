# FrontDesk

An AI host for a restaurant's website or WhatsApp. It answers menu, allergen and policy questions from the
restaurant's own data, checks free tables, takes bookings after the guest confirms, and hands anything it
shouldn't handle (big groups, private hire, complaints) to staff with a one-line summary.

Live demo: https://adjetei-martey.vercel.app/play/frontdesk (Ember & Fig is a made-up restaurant).

## How it works

- `src/lib/restaurant.ts` - the restaurant: hours, policies, menu with the UK's 14 allergens, and the
  availability logic (30-minute slots, covers per slot, last booking 90 minutes before close).
- `src/lib/agent.ts` - a tool-calling loop (Vercel AI SDK `generateText` + `tools` + `stopWhen`) with four tools:
  `searchMenu`, `checkAvailability`, `createBooking` (re-checks availability before booking) and `handOffToStaff`.
  The model only knows what the tools and policy list give it.
- `src/app/api/chat/route.ts` - stateless API with per-IP rate limiting. The browser keeps the chat and bookings
  and sends them with each message, so visitors never see each other's data.
- The page shows the guest chat next to the owner's view: bookings, hand-offs, and a trace of every tool call.

For a real business, `restaurant.ts` is replaced by their menu and their booking system's API
(or a simple database), and the same agent is connected to WhatsApp.

## Run

    npm install
    vercel env pull .env.local   # or set AI_GATEWAY_API_KEY
    npm run dev                  # http://localhost:3000/play/frontdesk
    npm test
