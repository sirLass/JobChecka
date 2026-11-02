import { describe, expect, it } from "vitest";
import { buildVerificationLinks } from "./links";

describe("buildVerificationLinks", () => {
  it("named company adds the SEC checker", () => {
    const links = buildVerificationLinks({
      companyName: "VisibleWord Business Solutions Inc.",
      description: "Customer experience representatives, office in Mandaluyong.",
      sourcePlatform: "manual",
    });
    expect(links.map((l) => l.label)).toEqual([
      "SEC check: company name",
      "JobStreet: safe job searching",
    ]);
    const sec = links[0];
    expect(sec?.url).toEqual("https://checkwithsec.sec.gov.ph/");
  });

  it("abroad/agency postings get DMW lists plus advisories", () => {
    const links = buildVerificationLinks({
      companyName: "North Star Overseas Solutions",
      description: "Certified sponsor can process you for Canada farm work.",
      sourcePlatform: "manual",
    });
    const labels = links.map((l) => l.label);
    expect(labels).toContain("DMW list: licensed agencies");
    expect(labels).toContain("DMW advisories: named warnings");
    expect(labels[0]).toEqual("SEC check: company name");
    expect(links).toHaveLength(3); // SEC + DMW list + DMW advisories
  });

  it("DOLE only fills a nearly-empty panel", () => {
    const bare = buildVerificationLinks({ description: "Some vague text with no company." });
    expect(bare.map((l) => l.label)).toEqual([
      "JobStreet: safe job searching",
      "DOLE news & warnings",
    ]);

    const withCompany = buildVerificationLinks({
      companyName: "Local BPO Inc.",
      description: "Call center agents for common accounts.",
    });
    expect(withCompany.map((l) => l.label)).not.toContain("DOLE news & warnings");
    expect(withCompany.map((l) => l.label)).toContain("JobStreet: safe job searching");
  });

  it("JobStreet captures put the platform guide in place", () => {
    const fromPlatform = buildVerificationLinks({
      sourcePlatform: "jobstreet",
      description: "Hiring delivery riders.",
    });
    expect(fromPlatform[0]?.url).toEqual("https://www.jobstreet.com.ph/safe-job-searching/");

    const fromUrl = buildVerificationLinks({
      sourceUrl: "https://www.jobstreet.com.ph/en/job/1234",
      description: "Hiring riders.",
    });
    expect(fromUrl.map((l) => l.label)).toContain("JobStreet: safe job searching");
  });

  it("caps total links at four", () => {
    const links = buildVerificationLinks({
      companyName: "Kitamura Manpower Solutions",
      description: "Licensed agency (POEA-045-LB-2023) filing for production operators in Japan.",
      sourcePlatform: "jobstreet",
    });
    expect(links).toHaveLength(4);
  });

  it("never suggests scraping or automated lookups in copy", () => {
    const links = buildVerificationLinks({
      companyName: "Anything Inc.",
      description: "Any text.",
    });
    for (const link of links) {
      expect(link.description.toLowerCase()).not.toContain("we will verify for you");
    }
  });
});
