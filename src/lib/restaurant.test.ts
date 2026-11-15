import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAvailability, slots } from "./restaurant.ts";

const TODAY = "2026-11-16"; // a Monday

test("closed on Mondays", () => {
  const r = checkAvailability("2026-11-16", "19:00", 2, [], TODAY);
  assert.equal(r.ok, false);
});

test("Saturday has lunch and dinner slots, last booking 90 min before close", () => {
  const s = slots("2026-11-21");
  assert.ok(s.includes("12:00") && s.includes("13:30") && !s.includes("14:00"));
  assert.ok(s.includes("21:30") && !s.includes("22:00"));
});

test("big groups go to the team", () => {
  const r = checkAvailability("2026-11-21", "19:00", 12, [], TODAY);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /team/);
});

test("visitor bookings fill a slot until it offers alternatives", () => {
  const bookings = Array.from({ length: 5 }, (_, i) => ({
    ref: `r${i}`, name: "x", date: "2026-11-18", time: "19:30", partySize: 8, createdAt: "",
  }));
  const r = checkAvailability("2026-11-18", "19:30", 2, bookings, TODAY);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.alternatives.length > 0 && !r.alternatives.includes("19:30"));
});

test("past dates rejected", () => {
  assert.equal(checkAvailability("2026-11-01", "19:00", 2, [], TODAY).ok, false);
});
