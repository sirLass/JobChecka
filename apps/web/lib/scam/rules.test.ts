import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Post } from "@jobsafe/shared";
import { runRules } from "./rules";
import { combineRisk } from "./score";

const DATASET_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "eval",
  "dataset",
);

interface Seed {
  id: string;
  label: "scam" | "legit";
  expected_flags: string[];
  expected_min_level: string;
  title: string;
  company: string;
  description: string;
  contact: string;
  salary_text: string;
}

function loadSeeds(file: string): Seed[] {
  return readFileSync(path.join(DATASET_DIR, file), "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Seed);
}

function seedToPost(seed: Seed): Post {
  return {
    title: seed.title || undefined,
    company: seed.company || undefined,
    description: seed.description,
    contact: seed.contact || undefined,
    salaryText: seed.salary_text || undefined,
  };
}

const scamSeeds = loadSeeds("scam.jsonl");
const legitSeeds = loadSeeds("legit.jsonl");

describe("rule engine vs eval dataset", () => {
  it.each(scamSeeds.map((seed) => [seed.id, seed] as const))(
    "%s: flags expected signals and reaches high_risk",
    (_id, seed) => {
      const hits = runRules(seedToPost(seed));
      const ids = hits.map((hit) => hit.id);
      for (const flag of seed.expected_flags) {
        expect(ids, `${seed.id} must fire ${flag}`).toContain(flag);
      }
      expect(combineRisk(hits), `${seed.id} must reach high_risk`).toBe("high_risk");
    },
  );

  it.each(legitSeeds.map((seed) => [seed.id, seed] as const))(
    "%s: fires only the expected rule and stays at the expected level",
    (_id, seed) => {
      const hits = runRules(seedToPost(seed));
      const ids = hits.map((hit) => hit.id);
      for (const flag of seed.expected_flags) {
        expect(ids, `${seed.id} must fire ${flag}`).toContain(flag);
      }
      expect(combineRisk(hits), `${seed.id} must stay at ${seed.expected_min_level}`).toBe(
        seed.expected_min_level,
      );
    },
  );

  it("every hit's evidence is a verbatim quote of the checked text", () => {
    for (const seed of [...scamSeeds, ...legitSeeds]) {
      const post = seedToPost(seed);
      // Same join runRules() uses — evidence must be an exact slice of it.
      const checkedText = [post.title, post.description, post.contact, post.salaryText]
        .filter(Boolean)
        .join("\n");
      for (const hit of runRules(post)) {
        expect(
          checkedText.includes(hit.evidence),
          `${seed.id}/${hit.id}: evidence "${hit.evidence}" must be quoted from the post`,
        ).toBe(true);
      }
    }
  });
});

describe("targeted rule cases (English + Taglish)", () => {
  it("does not fire fee_request on negated payment wording", () => {
    const hits = runRules({
      description:
        "We never collect fees from applicants at any stage. Registration is free, so just bring yourself.",
    });
    expect(hits.map((h) => h.id)).not.toContain("fee_request");
  });

  it("returns no hits for a clean non-company post (walang bayad, no fee)", () => {
    const hits = runRules({
      company: "Southgate Store",
      description: "Walang hininging bayad sa kahit anong stage ng hiring po.",
    });
    expect(hits.map((h) => h.id)).toEqual([]);
  });

  it("reads Taglish urgency (ngayon na / mamaya)", () => {
    const hits = runRules({
      description: "Interview ngayon na po. Filled na ang slots mamaya!",
    });
    expect(hits.map((h) => h.id)).toContain("urgency_pressure");
  });

  it("escalates to high when the interview happens on the chat app", () => {
    const hits = runRules({
      company: "Gold Star Trading",
      description:
        "Message lang po directly sa personal Messenger account ni Ms. Tina, sa Messenger lang ang interview.",
      contact: "Ms. Tina Santos on Messenger",
    });
    const chat = hits.find((h) => h.id === "off_platform_chat");
    expect(chat?.severity).toBe("high");
  });

  it("stays medium when a walk-in interview exists (Viber slot confirmation)", () => {
    const hits = runRules({
      company: "Brick Oven Restaurant",
      description:
        "I-PM po sa Viber number namin para sa slot confirmation, tapos walk-in interview sa branch.",
      contact: "0917-555-2843 (Viber, slot confirmation only)",
    });
    const chat = hits.find((h) => h.id === "off_platform_chat");
    expect(chat?.severity).toBe("medium");
  });

  it("fires email_website_mismatch only when domains truly differ", () => {
    const mismatch = runRules({
      company: "Worldwide Finance Group",
      description: "Company website is wfg.finance. Contact our HR at hrwfg@gmail.com.",
      contact: "hrwfg@gmail.com",
    });
    expect(mismatch.map((h) => h.id)).toContain("email_website_mismatch");

    const matching = runRules({
      company: "VisibleWord Inc.",
      description: "Apply via careers@visiblewordbs.ph. Website: visiblewordbs.ph.",
      contact: "careers@visiblewordbs.ph",
    });
    expect(matching.map((h) => h.id)).not.toContain("email_website_mismatch");
  });

  it("flags shortened links but not normal company links", () => {
    const short = runRules({
      description: "Registration and task list here: http://bit.ly/tasks-dailypay-2x",
    });
    expect(short.map((h) => h.id)).toContain("suspicious_link");

    const normal = runRules({
      description: "Details: https://careers.acme.ph/hr-role-4",
    });
    expect(normal.map((h) => h.id)).toEqual([]);
  });

  it("returns no hits for a totally clean post", () => {
    const hits = runRules({
      company: "St. Gabriel Medical Center",
      description:
        "St. Gabriel Medical Center is accepting nursing aides for the ER ward. Duties include patient monitoring, charting, and assisting nurses on shift. Send qualifications to hr@stgabrielmc.ph only.",
      contact: "hr@stgabrielmc.ph",
      salaryText: "P18,000 monthly",
    });
    expect(hits).toEqual([]);
  });
});
