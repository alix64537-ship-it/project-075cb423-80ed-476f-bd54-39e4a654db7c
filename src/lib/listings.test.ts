import { describe, expect, it } from "vitest";
import { ALL_CITIES, filterListings, formatPrice, formatTenge, MOCK_LISTINGS, type Filters } from "./listings";

const base: Filters = {
  mode: "goods",
  city: ALL_CITIES,
  category: null,
  query: "",
  priceFrom: null,
  priceTo: null,
  sort: "new",
};

describe("formatTenge", () => {
  it("groups thousands and adds ₸", () => {
    expect(formatTenge(420000).replace(/\u00A0/g, " ")).toBe("420 000 ₸");
  });
});

describe("formatPrice", () => {
  it("shows salary range", () => {
    expect(formatPrice({ price: 250000, priceMax: 400000, priceSuffix: "/ мес" }).replace(/\u00A0/g, " ")).toBe(
      "250 000–400 000 ₸ / мес",
    );
  });
  it("shows Договорная without price", () => {
    expect(formatPrice({ price: null })).toBe("Договорная");
  });
});

describe("filterListings", () => {
  it("has 6 goods and 6 jobs", () => {
    expect(filterListings(MOCK_LISTINGS, base)).toHaveLength(6);
    expect(filterListings(MOCK_LISTINGS, { ...base, mode: "jobs" })).toHaveLength(6);
  });
  it("filters by city", () => {
    const r = filterListings(MOCK_LISTINGS, { ...base, city: "Караганда" });
    expect(r.every((l) => l.city === "Караганда")).toBe(true);
    expect(r).toHaveLength(2);
  });
  it("sorts cheaper first", () => {
    const r = filterListings(MOCK_LISTINGS, { ...base, sort: "cheap" });
    expect(r[0]?.price).toBe(12000);
    expect(r.at(-1)?.price).toBe(420000);
  });
  it("applies price range От / До", () => {
    const r = filterListings(MOCK_LISTINGS, { ...base, priceFrom: 100000, priceTo: 300000 });
    expect(r.map((l) => l.id).sort()).toEqual(["g2", "g6"]);
  });
});
