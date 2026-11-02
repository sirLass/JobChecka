import { describe, expect, it } from "vitest";
import type { RuleHit } from "./rules";
import { combineRisk, confidenceFor } from "./score";

function hit(id: string, severity: RuleHit["severity"]): RuleHit {
  return { id, severity, evidence: "placeholder", explanation: "..." };
}

describe("combineRisk", () => {
  it("returns low_signals only when nothing fired", () => {
    expect(combineRisk([])).toBe("low_signals");
  });

  it("any single medium hit earns caution (matches legit seeds)", () => {
    expect(combineRisk([hit("free_email", "medium")])).toBe("caution");
    expect(combineRisk([hit("off_platform_chat", "medium")])).toBe("caution");
  });

  it("multiple medium hits stay at caution, not high", () => {
    expect(combineRisk([hit("free_email", "medium"), hit("urgency_pressure", "medium")])).toBe(
      "caution",
    );
  });

  it("any high hit means high_risk", () => {
    expect(combineRisk([hit("fee_request", "high")])).toBe("high_risk");
    expect(combineRisk([hit("free_email", "medium"), hit("email_website_mismatch", "high")])).toBe(
      "high_risk",
    );
  });
});

describe("confidenceFor", () => {
  it("tracks how much rules signal stood behind the verdict", () => {
    expect(confidenceFor("high_risk")).toBe("high");
    expect(confidenceFor("caution")).toBe("medium");
    expect(confidenceFor("low_signals")).toBe("low");
  });
});
