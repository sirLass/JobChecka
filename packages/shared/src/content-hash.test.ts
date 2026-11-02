import { describe, expect, it } from "vitest";
import { contentHash } from "./content-hash";

describe("contentHash", () => {
  it("returns a 64-char sha256 hex string", async () => {
    const hash = await contentHash({ description: "Customer Service Representative" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is identical for whitespace/formatting differences", async () => {
    const a = await contentHash({
      title: "Customer Service Rep",
      company: "ACME Corp",
      description: "Urgent!   Apply\nnow.  Visit our office.",
    });
    // Same tokens in the same order, different whitespace and letter case.
    const b = await contentHash({
      title: "Customer  Service Rep",
      company: "ACME Corp",
      description: "urgent!\tapply\r\nnow. visit our office.",
    });
    expect(a).toBe(b);
  });

  it("is identical up to case differences", async () => {
    const a = await contentHash({ description: "Data Encoder, Monday to Friday" });
    const b = await contentHash({ description: "DATA ENCODER, Monday to Friday" });
    expect(a).toBe(b);
  });

  it("differs when meaningful content differs", async () => {
    const a = await contentHash({ description: "Texterarian widgets assembler" });
    const b = await contentHash({ description: "Texterarian widgets assembler 2" });
    expect(a).not.toBe(b);
  });
});
