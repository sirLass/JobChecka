import { describe, expect, it } from "vitest";
import { matchSalaryFamilyForPost, parseSalaries, salaryRiskLevel } from "./salary";

describe("parseSalaries", () => {
  it("normalizes per-day PHP amounts to monthly", () => {
    const got = parseSalaries("Earn P15,000 per day by encoding simple data.");
    expect(got).toHaveLength(1);
    expect(got[0]?.monthlyPhp).toBe(330_000);
    expect(got[0]?.period).toBe("day");
    expect(got[0]?.matchedText).toContain("P15,000 per day");
  });

  it("converts USD with the fixed reference rate", () => {
    const got = parseSalaries("Salary USD 2,800 per month plus housing.");
    expect(got[0]?.currency).toBe("USD");
    expect(got[0]?.monthlyPhp).toBe(2_800 * 58);
  });

  it("handles weekly rates and the word 'weekly'", () => {
    expect(parseSalaries("P8,500 weekly (part time)")[0]?.monthlyPhp).toBe(36_805);
    expect(parseSalaries("PHP 7,500 per week")[0]?.monthlyPhp).toBe(32_475);
  });

  it("parses ranges on the top of the range", () => {
    expect(parseSalaries("P25,000 - 45,000 monthly")[0]?.monthlyPhp).toBe(45_000);
  });

  it("reads bare '15000/day' numbers without a currency marker", () => {
    expect(parseSalaries("Salary: 15000/day")[0]?.monthlyPhp).toBe(330_000);
  });

  it("never reads one-time fee amounts as wages", () => {
    // glue words block period attachment on fee sentences
    expect(
      parseSalaries("One-time enrollment of P9,800 converts into daily profit sharing."),
    ).toEqual([]);
    expect(parseSalaries("Processing fee is P38,000 only, payable in full.")).toEqual([]);
    expect(parseSalaries("pay P2,500 and P1,200 for company uniform")).toEqual([]);
  });

  it("does not misread 'daily allowance' as a wage period", () => {
    expect(parseSalaries("Salary P16,000 base plus daily allowance and overtime.")).toEqual([]);
  });

  it("does not misread phone numbers as salaries", () => {
    expect(parseSalaries("Contact foreman at 0928-555-7734 for the reporting schedule.")).toEqual(
      [],
    );
    expect(parseSalaries("Call (02) 8988-7777 daily.")).toEqual([]);
  });

  it("attaches 'per task day' periods deliberately wide pay shows up", () => {
    const got = parseSalaries("Up to P4,000 per task day");
    expect(got[0]?.monthlyPhp).toBe(88_000);
  });

  it("skips text with no salary-like spans", () => {
    expect(parseSalaries("Per approved job order")).toEqual([]);
  });
});

describe("matchSalaryFamilyForPost", () => {
  it("prefers the role family named in the title", () => {
    expect(matchSalaryFamilyForPost("Farm Workers Canada - Certified Sponsor", "").family.id).toBe(
      "farm_agri",
    );
    expect(matchSalaryFamilyForPost("Junior Accountant", "").family.id).toBe("finance_accounting");
    expect(matchSalaryFamilyForPost("WORK FROM HOME ENCODER - NO EXPERIENCE", "").family.id).toBe(
      "encoding_data",
    );
    expect(matchSalaryFamilyForPost("Remote Administrative Assistant", "").family.id).toBe(
      "admin_office",
    );
  });

  it("falls back to the description, then to 'general'", () => {
    expect(
      matchSalaryFamilyForPost("", "Production operators for a factory in Japan").family.id,
    ).toBe("factory_operator");
    expect(
      matchSalaryFamilyForPost("Opening soon", "Be part of our growing community.").family.id,
    ).toBe("general");
  });
});

describe("salaryRiskLevel", () => {
  const family = {
    id: "encoding_data",
    label: "Encoding / data entry",
    match: [],
    floor: 16_000,
    median: 22_000,
    ceiling: 30_000,
  };

  it("stays quiet inside and near the band", () => {
    expect(salaryRiskLevel(family, 29_000)).toBeNull();
    expect(salaryRiskLevel(family, 60_000)).toBeNull(); // 2.0x is exactly at boundary
  });

  it("escalates with the multiple of the ceiling", () => {
    expect(salaryRiskLevel(family, 70_000)).toBe("medium"); // 2.33x
    expect(salaryRiskLevel(family, 95_000)).toBe("high"); // 3.17x
  });
});
