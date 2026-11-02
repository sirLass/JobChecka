import { describe, expect, it } from "vitest";
import { emailDomain, extractContacts, isShortenedUrl, urlHost } from "./extract-contacts";

describe("extractContacts", () => {
  it("finds emails, phones, urls, and chat handles at once", () => {
    const got = extractContacts(
      "Email hiring.acme@gmail.com or call 0917-123-4567. Apply: https://bit.ly/applyfast",
    );
    expect(got.emails).toEqual(["hiring.acme@gmail.com"]);
    expect(got.phones[0]).toEqual("09171234567");
    expect(got.urls).toEqual(["https://bit.ly/applyfast"]);
  });

  it("handles Taglish contact lines and OFW-style +63 numbers", () => {
    const got = extractContacts(
      "I-message niyo po ako sa Telegram: @fastencodehr o tawag +63 917 555 8899",
    );
    expect(got.chatHandles[0]).toMatchObject({ platform: "telegram" });
    expect(got.phones.join(" ")).toContain("639175558899");
  });

  it("does not treat email-local digits as phone numbers", () => {
    const got = extractContacts("Send to hr12349999@company.ph");
    expect(got.phones).toEqual([]);
    expect(got.emails).toEqual(["hr12349999@company.ph"]);
  });

  it("finds bare company domains without scheme", () => {
    const got = extractContacts(
      "Company website is wfg.finance. Visit example.com.ph or www.jobs.ph",
    );
    expect(got.urls.join(" ")).toContain("wfg.finance");
    expect(got.urls.join(" ")).toContain("example.com.ph");
    expect(got.urls.join(" ")).toContain("www.jobs.ph");
  });

  it("returns empty groups for empty input", () => {
    expect(extractContacts("")).toEqual({ emails: [], phones: [], urls: [], chatHandles: [] });
  });
});

describe("helpers", () => {
  it("emailDomain is case-insensitive", () => {
    expect(emailDomain("HR@WFG.Finance")).toEqual("wfg.finance");
  });

  it("urlHost strips www and tolerates bare hosts", () => {
    expect(urlHost("https://www.WFG.finance/jobs")).toEqual("wfg.finance");
    expect(urlHost("example.com.ph/x")).toEqual("example.com.ph");
    expect(urlHost("not a url")).toEqual("");
  });

  it("flags known shorteners", () => {
    expect(isShortenedUrl(urlHost("bit.ly/applyfast"))).toBe(true);
    expect(isShortenedUrl(urlHost("careers.acme.ph"))).toBe(false);
  });
});
