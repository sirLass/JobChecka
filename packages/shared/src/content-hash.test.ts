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
      description: "Urgent!   Apply\nnow.",
    });
    const b = await contentHash({
      title: "Customer  Service Rep",
      company: "ACME Corp",
      description: "apply\r\nnow. urgent!",
    });
    expect(a).toBe(b);
  });

  it("differs when meaningful content differs", async () => {
    const a = await contentHash({ description: "Texterarian widgets assembler" });
    const b = await contentHash({ description: "Texterarian widgets assembler 2" });
    expect(a).not.toBe(b);
  });
});
