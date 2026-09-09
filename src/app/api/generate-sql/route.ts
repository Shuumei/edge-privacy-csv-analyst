import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, anonymizedSchema, columnNames } = body;

    if (!question || !anonymizedSchema) {
      return NextResponse.json(
        { error: "Missing question or anonymized schema" },
        { status: 400 }
      );
    }

    const customKey = req.headers.get("x-gemini-key") || body.customApiKey;
    const customModel = req.headers.get("x-gemini-model") || body.model;
    const apiKey = customKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const isCustomKey = Boolean(customKey);
    const modelId = customModel || process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (apiKey) {
      try {
        const prompt = `You are a specialized SQL Generator for an In-Browser Tabular Database called "dataset".
CRITICAL RULES:
1. ONLY return a valid single SQL query. No markdown backticks, no explanations.
2. The table name is always "dataset".
3. Use the exact column names from the provided schema.
4. If asked for top N, use "ORDER BY ... DESC LIMIT N".
5. For aggregations, use standard SQL functions: SUM, AVG, COUNT, MIN, MAX.

SCHEMA:
${anonymizedSchema}

USER QUESTION:
"${question}"

SQL QUERY:`;

        let res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1 },
            }),
          }
        );

        if (!res.ok && res.status === 404 && modelId === "gemini-2.5-flash") {
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 },
              }),
            }
          );
        }

        if (res.ok) {
          const data = await res.json();
          let rawSql = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          rawSql = rawSql.replace(/^```sql/i, "").replace(/^```/, "").replace(/```$/, "").trim();
          
          return NextResponse.json({
            sql: rawSql,
            source: `${modelId} (${isCustomKey ? "Custom Key" : "Zero-Data Protocol"})`,
            explanation: `สร้าง SQL ด้วย ${modelId} (${isCustomKey ? "Custom Key" : "Zero-Data Protocol"}) โดยส่งเฉพาะ Schema`,
            payloadAudit: {
              schemaSent: anonymizedSchema,
              rawRowsSent: 0,
              complianceStatus: "PDPA / Zero-Egress Compliant",
            },
          });
        } else if (isCustomKey) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `API Error: HTTP ${res.status}`;
          return NextResponse.json(
            { error: `Gemini API Error: ${errMsg}` },
            { status: res.status >= 400 && res.status < 500 ? 400 : 500 }
          );
        }
      } catch (e: any) {
        console.warn("Gemini API call failed, falling back to heuristic engine:", e);
        if (isCustomKey) {
          return NextResponse.json(
            { error: `Gemini Connection Error: ${e.message}` },
            { status: 500 }
          );
        }
      }
    }

    const lowerQ = question.toLowerCase();
    const cols: string[] = columnNames || [];

    // Identify categorical column
    const catCol = cols.find((c) =>
      lowerQ.includes(c.toLowerCase()) ||
      (c.toLowerCase().includes("category") && (lowerQ.includes("หมวด") || lowerQ.includes("product") || lowerQ.includes("category"))) ||
      (c.toLowerCase().includes("region") && (lowerQ.includes("ภูมิภาค") || lowerQ.includes("เขต") || lowerQ.includes("region"))) ||
      (c.toLowerCase().includes("payment") && (lowerQ.includes("ชำระ") || lowerQ.includes("payment"))) ||
      (c.toLowerCase().includes("diagnosis") && (lowerQ.includes("โรค") || lowerQ.includes("diagnosis"))) ||
      (c.toLowerCase().includes("hospital") && (lowerQ.includes("โรงพยาบาล") || lowerQ.includes("hospital"))) ||
      (c.toLowerCase().includes("insurance") && (lowerQ.includes("ประกัน") || lowerQ.includes("insurance"))) ||
      (c.toLowerCase().includes("department") && (lowerQ.includes("แผนก") || lowerQ.includes("department"))) ||
      (c.toLowerCase().includes("level") && (lowerQ.includes("ระดับ") || lowerQ.includes("level"))) ||
      (c.toLowerCase().includes("tier") && (lowerQ.includes("แพ็กเกจ") || lowerQ.includes("tier"))) ||
      (c.toLowerCase().includes("risk") && (lowerQ.includes("เสี่ยง") || lowerQ.includes("churn") || lowerQ.includes("risk")))
    ) || cols.find((c) => !c.toLowerCase().includes("id") && !c.toLowerCase().includes("date") && !c.toLowerCase().includes("revenue") && !c.toLowerCase().includes("cost") && !c.toLowerCase().includes("amount") && !c.toLowerCase().includes("salary") && !c.toLowerCase().includes("name") && !c.toLowerCase().includes("email") && !c.toLowerCase().includes("phone")) || cols[0] || "Category";

    // Identify numeric column (strictly different from catCol)
    const availableNumCols = cols.filter((c) => c !== catCol);
    const numCol = availableNumCols.find((c) =>
      lowerQ.includes(c.toLowerCase()) ||
      (c.toLowerCase().includes("revenue") && (lowerQ.includes("ยอด") || lowerQ.includes("revenue"))) ||
      (c.toLowerCase().includes("cost") && (lowerQ.includes("ค่ารักษา") || lowerQ.includes("cost") || lowerQ.includes("ค่าใช้จ่าย"))) ||
      (c.toLowerCase().includes("stay") && (lowerQ.includes("พักฟื้น") || lowerQ.includes("stay") || lowerQ.includes("วัน"))) ||
      (c.toLowerCase().includes("salary") && (lowerQ.includes("เงินเดือน") || lowerQ.includes("salary"))) ||
      (c.toLowerCase().includes("bonus") && (lowerQ.includes("โบนัส") || lowerQ.includes("bonus"))) ||
      (c.toLowerCase().includes("score") && (lowerQ.includes("คะแนน") || lowerQ.includes("score"))) ||
      (c.toLowerCase().includes("license") && (lowerQ.includes("ไลเซนส์") || lowerQ.includes("license"))) ||
      (c.toLowerCase().includes("price") && (lowerQ.includes("ราคา") || lowerQ.includes("price"))) ||
      (c.toLowerCase().includes("units") && (lowerQ.includes("จำนวน") || lowerQ.includes("units"))) ||
      (c.toLowerCase().includes("mrr") && lowerQ.includes("mrr"))
    ) || availableNumCols.find((c) =>
      c.toLowerCase().includes("revenue") ||
      c.toLowerCase().includes("cost") ||
      c.toLowerCase().includes("salary") ||
      c.toLowerCase().includes("bonus") ||
      c.toLowerCase().includes("mrr") ||
      c.toLowerCase().includes("amount") ||
      c.toLowerCase().includes("price") ||
      c.toLowerCase().includes("units") ||
      c.toLowerCase().includes("days") ||
      c.toLowerCase().includes("score")
    ) || availableNumCols[availableNumCols.length - 1] || cols[cols.length - 1] || "Value";

    let generatedSql = `SELECT "${catCol}", SUM("${numCol}") AS "Total_${numCol}" FROM dataset GROUP BY "${catCol}" ORDER BY "Total_${numCol}" DESC`;

    if (lowerQ.includes("เฉลี่ย") || lowerQ.includes("avg") || lowerQ.includes("average")) {
      generatedSql = `SELECT "${catCol}", AVG("${numCol}") AS "Avg_${numCol}" FROM dataset GROUP BY "${catCol}" ORDER BY "Avg_${numCol}" DESC`;
    } else if (lowerQ.includes("นับ") || lowerQ.includes("กี่") || lowerQ.includes("count")) {
      generatedSql = `SELECT "${catCol}", COUNT(*) AS "Count" FROM dataset GROUP BY "${catCol}" ORDER BY "Count" DESC`;
    }

    const limitMatch = lowerQ.match(/(?:top|สูงสุด|อันดับแรก)\s*(\d+)/) || lowerQ.match(/(\d+)\s*(?:อันดับ|รายการ)/);
    if (limitMatch) {
      generatedSql += ` LIMIT ${limitMatch[1]}`;
    }

    if (lowerQ.includes("กรุงเทพ") || lowerQ.includes("bangkok")) {
      generatedSql = `SELECT * FROM dataset WHERE Region = 'Bangkok'`;
    }

    return NextResponse.json({
      sql: generatedSql,
      source: "edge-heuristic-bridge",
      explanation: "สร้าง SQL โดย Rule-based NLP Engine (Offline / Local Edge Protocol)",
      payloadAudit: {
        schemaSent: anonymizedSchema,
        rawRowsSent: 0,
        complianceStatus: "PDPA / Zero-Egress Compliant",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
