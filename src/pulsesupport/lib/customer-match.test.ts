import { describe, it, expect } from "vitest";
import { pickBest, phoneKey } from "./customer-match";

const cands = [
  { id: 1, name: "Émilie Papa", phones: ["+33 6 66 10 10 00"] },
  { id: 2, name: "Jean Martin", phones: ["0692 12 34 56"] },
];

describe("customer matching", () => {
  it("ignores phone formatting and country prefix", () => {
    expect(phoneKey("+33 6 66 10 10 00")).toBe(phoneKey("0666101000"));
  });
  it("finds customer by phone + last name despite accents", () => {
    expect(pickBest(cands, { first_name: "Emilie", last_name: "papa", phone: "06 66 10 10 00" }).match?.id).toBe(1);
  });
  it("tolerates a misheard name when the phone matches", () => {
    expect(pickBest(cands, { first_name: "Jean", last_name: "Martine", phone: "0692123456" }).match?.id).toBe(2);
  });
  it("finds by both names when phone is wrong", () => {
    expect(pickBest(cands, { first_name: "Jean", last_name: "Martin", phone: "0600000000" }).match?.id).toBe(2);
  });
  it("refuses a match on phone alone", () => {
    expect(pickBest(cands, { first_name: "Paul", last_name: "Durand", phone: "0692123456" }).match).toBeNull();
  });
});
