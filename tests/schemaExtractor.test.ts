import { describe, it, expect } from "vitest";
import {
  validateThaiNationalId,
  detectPii,
  inferColumnType,
  extractDatasetMetadata,
  createAnonymizedSchemaPrompt,
} from "../src/lib/schemaExtractor";

describe("Schema Extractor & PII Detection Suite", () => {
  it("should validate Thai National ID checksum correctly", () => {
    // 1234567890121 Checksum test:
    // sum = 352 -> 352 % 11 = 0 -> check digit = (11 - 0) % 10 = 1
    expect(validateThaiNationalId("1234567890121")).toBe(true);
    expect(validateThaiNationalId("1234567890129")).toBe(false);
  });

  it("should detect Thai mobile phone numbers as PII", () => {
    const phones = ["0812345678", "0923456789", "0641122334"];
    const res = detectPii(phones, "contact_no");
    expect(res.isPii).toBe(true);
    expect(res.piiType).toBe("THAI_PHONE");
  });

  it("should detect Thai National ID in column name or content", () => {
    const res = detectPii(["1234567890121"], "Citizen_ID");
    expect(res.isPii).toBe(true);
    expect(res.piiType).toBe("THAI_ID");
  });

  it("should detect email addresses as PII", () => {
    const emails = ["user@example.com", "somchai@company.co.th"];
    const res = detectPii(emails, "user_email");
    expect(res.isPii).toBe(true);
    expect(res.piiType).toBe("EMAIL");
  });

  it("should infer types accurately", () => {
    expect(inferColumnType(["100", "250.5", "3000"])).toBe("number");
    expect(inferColumnType(["true", "false", "true"])).toBe("boolean");
    expect(inferColumnType(["2026-01-15", "2026-02-18", "2026-03-01"])).toBe("date");
    expect(inferColumnType(["Bangkok", "Chiang Mai", "Phuket"])).toBe("string");
  });

  it("should guarantee ZERO raw rows in anonymized schema prompt", () => {
    const mockRows = [
      {
        id: "1",
        Customer_Name: "Somchai",
        Citizen_ID: "1234567890121",
        Total_Revenue: "15000",
      },
    ];

    const metadata = extractDatasetMetadata("test.csv", 500, mockRows);
    const prompt = createAnonymizedSchemaPrompt(metadata);

    // Prompt ต้องไม่มีชื่อลูกค้าหรือเลขบัตรประชาชน
    expect(prompt).not.toContain("Somchai");
    expect(prompt).not.toContain("1234567890121");
    expect(prompt).toContain("SENSITIVE PII");
  });
});
