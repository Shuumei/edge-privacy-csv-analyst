import type { ColumnSchema, DatasetMetadata, ColumnDataType } from "@/types/analyst";

/**
 * ตรวจสอบเลขบัตรประชาชนไทย 13 หลักตามสูตร Checksum โมดูลัส 11
 */
export function validateThaiNationalId(idStr: string): boolean {
  const cleanId = idStr.replace(/[^0-9]/g, "");
  if (cleanId.length !== 13) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(cleanId.charAt(12), 10);
}

/**
 * ตรวจหา PII (Personally Identifiable Information)
 */
export function detectPii(values: string[], columnName: string): { isPii: boolean; piiType?: ColumnSchema["piiType"] } {
  const colLower = columnName.toLowerCase();
  
  // ตรวจจากชื่อคอลัมน์ทั่วไป
  if (colLower.includes("citizen") || colLower.includes("id_card") || colLower.includes("บัตรประชาชน") || colLower.includes("national_id")) {
    return { isPii: true, piiType: "THAI_ID" };
  }
  if (colLower.includes("phone") || colLower.includes("tel") || colLower.includes("mobile") || colLower.includes("เบอร์โทร")) {
    return { isPii: true, piiType: "THAI_PHONE" };
  }
  if (colLower.includes("email") || colLower.includes("e-mail") || colLower.includes("อีเมล")) {
    return { isPii: true, piiType: "EMAIL" };
  }
  if (colLower.includes("credit") || colLower.includes("card_no") || colLower.includes("บัตรเครดิต")) {
    return { isPii: true, piiType: "CREDIT_CARD" };
  }
  if (colLower === "name" || colLower === "fullname" || colLower.includes("customer_name") || colLower.includes("ชื่อลูกค้า")) {
    return { isPii: true, piiType: "NAME" };
  }

  // ตรวจจากค่าจริงในแถว
  const nonNull = values.filter((v) => v && v.trim() !== "");
  const sampleToCheck = nonNull.slice(0, 30);

  for (const raw of sampleToCheck) {
    const val = raw.trim();

    // บัตรประชาชนไทย
    if (/^\d{13}$/.test(val) || /^\d{1}-\d{4}-\d{5}-\d{2}-\d{1}$/.test(val)) {
      if (validateThaiNationalId(val)) {
        return { isPii: true, piiType: "THAI_ID" };
      }
    }

    // เบอร์มือถือไทย 06x, 08x, 09x
    if (/^(0[689]\d{8}|0[689]-\d{4}-\d{4}|0[689]\s\d{4}\s\d{4})$/.test(val)) {
      return { isPii: true, piiType: "THAI_PHONE" };
    }

    // อีเมล
    if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(val)) {
      return { isPii: true, piiType: "EMAIL" };
    }

    // เลขบัตรเครดิต
    if (/^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})$/.test(val.replace(/[\s-]/g, ""))) {
      return { isPii: true, piiType: "CREDIT_CARD" };
    }
  }

  return { isPii: false };
}

/**
 * Infer ชนิดข้อมูลของคอลัมน์
 */
export function inferColumnType(values: string[]): ColumnDataType {
  const nonNull = values.filter((v) => v !== "" && v !== null && v !== undefined);
  if (nonNull.length === 0) return "string";

  // Check Number
  const isAllNum = nonNull.every((v) => {
    const clean = v.replace(/,/g, "").trim();
    return clean !== "" && !isNaN(Number(clean));
  });
  if (isAllNum) return "number";

  // Check Boolean
  const isAllBool = nonNull.every((v) => /^(true|false|0|1|yes|no|ใช่|ไม่ใช่)$/i.test(v.trim()));
  if (isAllBool) return "boolean";

  // Check Date (ISO, Thai/Common Date format)
  const isAllDate = nonNull.every((v) => {
    const parsed = Date.parse(v);
    return !isNaN(parsed) && v.length >= 8 && /\d/.test(v);
  });
  if (isAllDate) return "date";

  // Check Category (low cardinality)
  const uniqueCount = new Set(nonNull).size;
  if (nonNull.length >= 10 && uniqueCount / nonNull.length < 0.25) {
    return "category";
  }

  return "string";
}

/**
 * สร้าง Metadata ละเอียดพร้อม Privacy Guard
 */
export function extractDatasetMetadata(
  fileName: string,
  fileSizeBytes: number,
  rows: Record<string, string>[],
  detectedDelimiter = ","
): DatasetMetadata {
  if (!rows || rows.length === 0) {
    return {
      fileName,
      fileSizeBytes,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      detectedDelimiter,
      samplePreview: [],
    };
  }

  const columnNames = Object.keys(rows[0]);
  const rowCount = rows.length;

  const columns: ColumnSchema[] = columnNames.map((name) => {
    const rawValues = rows.map((r) => r[name]?.toString() || "");
    const nonNullValues = rawValues.filter((v) => v !== "" && v !== null && v !== undefined);
    const nullCount = rowCount - nonNullValues.length;
    const distinctSet = new Set(nonNullValues);
    const distinctCount = distinctSet.size;

    const inferredType = inferColumnType(rawValues);
    const piiCheck = detectPii(rawValues, name);

    let min: number | string | undefined = undefined;
    let max: number | string | undefined = undefined;
    let mean: number | undefined = undefined;

    if (inferredType === "number") {
      const nums = nonNullValues.map((v) => Number(v.replace(/,/g, ""))).filter((n) => !isNaN(n));
      if (nums.length > 0) {
        min = Math.min(...nums);
        max = Math.max(...nums);
        const sum = nums.reduce((a, b) => a + b, 0);
        mean = Number((sum / nums.length).toFixed(2));
      }
    }

    // เก็บเฉพาะตัวอย่างที่ไม่ใช่ PII
    const sampleValues = piiCheck.isPii
      ? ["[REDACTED_PII_PROTECTED]"]
      : Array.from(distinctSet).slice(0, 3);

    return {
      name,
      inferredType,
      distinctCount,
      nullCount,
      sampleValues,
      isSensitivePiiCandidate: piiCheck.isPii,
      piiType: piiCheck.piiType,
      min,
      max,
      mean,
    };
  });

  // สร้าง preview ตัวอย่าง 5 แถวแรกโดย mask PII
  const samplePreview = rows.slice(0, 5).map((row) => {
    const safeRow: Record<string, string | number | null> = {};
    for (const col of columns) {
      if (col.isSensitivePiiCandidate) {
        safeRow[col.name] = "*** PROTECTED PII ***";
      } else {
        safeRow[col.name] = row[col.name] ?? null;
      }
    }
    return safeRow;
  });

  return {
    fileName,
    fileSizeBytes,
    rowCount,
    columnCount: columns.length,
    columns,
    detectedDelimiter,
    samplePreview,
  };
}

/**
 * สร้าง Schema Prompt สรุปสำหรับส่งไปให้ LLM
 * **การันตี: ไม่มีข้อมูลดิบของแถวส่งออกไปแม้แต่แถวเดียว**
 */
export function createAnonymizedSchemaPrompt(metadata: DatasetMetadata): string {
  const columnLines = metadata.columns.map((c) => {
    if (c.isSensitivePiiCandidate) {
      return `  - "${c.name}" (TYPE: ${c.inferredType}) -> [STATUS: SENSITIVE PII (${c.piiType}), RAW SAMPLES COMPLETELY MASKED]`;
    }
    let stats = `distinct_count: ${c.distinctCount}, nulls: ${c.nullCount}`;
    if (c.inferredType === "number" && c.min !== undefined && c.max !== undefined) {
      stats += `, range: [${c.min}..${c.max}], avg: ${c.mean}`;
    }
    const samplePreview = c.sampleValues.map((v) => JSON.stringify(v)).join(", ");
    return `  - "${c.name}" (TYPE: ${c.inferredType}) -> ${stats}, safe_categorical_examples: [${samplePreview}]`;
  });

  return `
TABLE_NAME: "dataset"
TOTAL_ROWS: ${metadata.rowCount}
COLUMNS:
${columnLines.join("\n")}
`.trim();
}
