import type { QueryExecutionResult } from "@/types/analyst";

/**
 * Robust Client-side SQL Ingestion & Execution Engine
 * ทำงานบน In-memory Browser Runtime 100%
 */
export class EdgeSqlEngine {
  private rows: Record<string, any>[] = [];
  private tableName = "dataset";

  public loadData(rows: Record<string, any>[], tableName = "dataset") {
    this.rows = rows;
    this.tableName = tableName;
  }

  public async executeSql(sql: string): Promise<QueryExecutionResult> {
    const startTime = performance.now();
    const cleanSql = sql.trim().replace(/;$/, "");

    try {
      const res = await this.executeFallbackSql(cleanSql);
      const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
      return {
        ...res,
        executionTimeMs,
      };
    } catch (err: any) {
      throw new Error(`SQL Execution Error: ${err.message}`);
    }
  }

  /**
   * Lightweight Tabular SQL Interpreter สำหรับ In-Memory Dataset
   */
  private async executeFallbackSql(sql: string): Promise<Omit<QueryExecutionResult, "executionTimeMs">> {
    if (this.rows.length === 0) {
      return {
        queryPlan: "Empty Dataset",
        generatedSql: sql,
        columns: [],
        rows: [],
        rowCount: 0,
        explanation: "No records found in dataset",
      };
    }

    const lower = sql.toLowerCase();
    
    // Parse LIMIT
    let limit = Infinity;
    const limitMatch = lower.match(/limit\s+(\d+)/);
    if (limitMatch) {
      limit = parseInt(limitMatch[1], 10);
    }

    // Parse WHERE simple filter
    let filtered = [...this.rows];
    const whereMatch = sql.match(/where\s+(.*?)(?:\s+group\s+by|\s+order\s+by|\s+limit|$)/i);
    if (whereMatch) {
      const conditionStr = whereMatch[1].trim();
      const eqMatch = conditionStr.match(/["']?(\w+)["']?\s*(=|LIKE|ILIKE)\s*['"]?([^'"]+)['"]?/i);
      if (eqMatch) {
        const col = eqMatch[1];
        const val = eqMatch[3].toLowerCase();
        filtered = filtered.filter((r) => {
          const cell = String(r[col] ?? "").toLowerCase();
          return cell.includes(val);
        });
      }
    }

    // Parse GROUP BY
    const groupMatch = sql.match(/group\s+by\s+(.*?)(?:\s+order\s+by|\s+limit|$)/i);
    const groupByCols = groupMatch
      ? groupMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
      : [];

    // Parse SELECT
    const selectMatch = sql.match(/select\s+(.*?)\s+from/i);
    const selectStr = selectMatch ? selectMatch[1].trim() : "*";

    let resultCols: string[] = [];
    let resultRows: (string | number | boolean | null)[][] = [];

    if (groupByCols.length > 0) {
      const groups: Record<string, Record<string, any>[]> = {};
      for (const row of filtered) {
        const key = groupByCols.map((c) => String(row[c] ?? "")).join(" | ");
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }

      const selectItems = selectStr.split(",").map((s) => s.trim());
      resultCols = selectItems.map((item) => {
        const asMatch = item.match(/\bas\s+["']?([^"'\s]+)["']?/i);
        if (asMatch) return asMatch[1];
        return item.replace(/^["']|["']$/g, "");
      });

      for (const [, items] of Object.entries(groups)) {
        const rowVals: any[] = [];
        for (const item of selectItems) {
          const rawItem = item.replace(/\bas\s+["']?[^"'\s]+["']?/i, "").trim().replace(/^["']|["']$/g, "");
          
          if (groupByCols.includes(rawItem)) {
            rowVals.push(items[0][rawItem]);
          } else if (/count\s*\(/i.test(rawItem)) {
            rowVals.push(items.length);
          } else if (/sum\s*\((.*?)\)/i.test(rawItem)) {
            const m = rawItem.match(/sum\s*\((.*?)\)/i);
            const col = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
            const sum = items.reduce((acc, cur) => acc + (Number(cur[col]) || 0), 0);
            rowVals.push(Number(sum.toFixed(2)));
          } else if (/avg\s*\((.*?)\)/i.test(rawItem)) {
            const m = rawItem.match(/avg\s*\((.*?)\)/i);
            const col = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
            const sum = items.reduce((acc, cur) => acc + (Number(cur[col]) || 0), 0);
            rowVals.push(Number((sum / items.length).toFixed(2)));
          } else if (/max\s*\((.*?)\)/i.test(rawItem)) {
            const m = rawItem.match(/max\s*\((.*?)\)/i);
            const col = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
            const max = Math.max(...items.map((cur) => Number(cur[col]) || 0));
            rowVals.push(max);
          } else if (/min\s*\((.*?)\)/i.test(rawItem)) {
            const m = rawItem.match(/min\s*\((.*?)\)/i);
            const col = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
            const min = Math.min(...items.map((cur) => Number(cur[col]) || 0));
            rowVals.push(min);
          } else {
            rowVals.push(items[0][rawItem] ?? null);
          }
        }
        resultRows.push(rowVals);
      }
    } else {
      if (selectStr === "*") {
        resultCols = Object.keys(filtered[0] || {});
        resultRows = filtered.map((r) => resultCols.map((c) => r[c] ?? null));
      } else {
        const selectItems = selectStr.split(",").map((s) => s.trim());
        resultCols = selectItems.map((item) => {
          const asMatch = item.match(/\bas\s+["']?([^"'\s]+)["']?/i);
          return asMatch ? asMatch[1] : item.replace(/^["']|["']$/g, "");
        });

        const hasAgg = selectItems.some((s) => /sum|avg|count|min|max/i.test(s));
        if (hasAgg) {
          const rowVals: any[] = [];
          for (const item of selectItems) {
            if (/count\s*\(/i.test(item)) {
              rowVals.push(filtered.length);
            } else if (/sum\s*\((.*?)\)/i.test(item)) {
              const m = item.match(/sum\s*\((.*?)\)/i);
              const col = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
              const sum = filtered.reduce((acc, cur) => acc + (Number(cur[col]) || 0), 0);
              rowVals.push(Number(sum.toFixed(2)));
            } else if (/avg\s*\((.*?)\)/i.test(item)) {
              const m = item.match(/avg\s*\((.*?)\)/i);
              const col = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
              const sum = filtered.reduce((acc, cur) => acc + (Number(cur[col]) || 0), 0);
              rowVals.push(Number((sum / filtered.length).toFixed(2)));
            } else {
              rowVals.push(filtered[0]?.[item] ?? null);
            }
          }
          resultRows.push(rowVals);
        } else {
          resultRows = filtered.map((r) =>
            selectItems.map((item) => r[item.replace(/^["']|["']$/g, "")] ?? null)
          );
        }
      }
    }

    // Parse ORDER BY
    const orderMatch = sql.match(/order\s+by\s+["']?([^"'\s]+)["']?(?:\s+(asc|desc))?/i);
    if (orderMatch) {
      const orderCol = orderMatch[1].replace(/^["']|["']$/g, "");
      const isDesc = (orderMatch[2] || "asc").toLowerCase() === "desc";
      const colIdx = resultCols.findIndex((c) => c.toLowerCase() === orderCol.toLowerCase());
      if (colIdx >= 0) {
        resultRows.sort((a, b) => {
          const valA = a[colIdx];
          const valB = b[colIdx];
          if (typeof valA === "number" && typeof valB === "number") {
            return isDesc ? valB - valA : valA - valB;
          }
          return isDesc
            ? String(valB).localeCompare(String(valA))
            : String(valA).localeCompare(String(valB));
        });
      }
    }

    if (limit < resultRows.length) {
      resultRows = resultRows.slice(0, limit);
    }

    let chartSuggestion: QueryExecutionResult["chartSuggestion"] = undefined;
    if (resultCols.length === 2) {
      const numericColIdx = resultRows[0]?.findIndex((val) => typeof val === "number");
      if (numericColIdx !== -1 && numericColIdx !== undefined) {
        const labelColIdx = numericColIdx === 0 ? 1 : 0;
        const labelColName = resultCols[labelColIdx].toLowerCase();
        const isTimeOrDate = /date|month|year|day|time|quarter|period|week|ไตรมาส|ปี|เดือน|วัน/i.test(labelColName);
        chartSuggestion = {
          type: isTimeOrDate ? "line" : (resultRows.length <= 6 ? "pie" : "bar"),
          xKey: resultCols[labelColIdx],
          yKeys: [resultCols[numericColIdx]],
          title: `${resultCols[numericColIdx]} by ${resultCols[labelColIdx]}`,
        };
      }
    } else if (resultCols.length > 2) {
      const firstNum = resultCols.find((c, i) => typeof resultRows[0]?.[i] === "number");
      if (firstNum) {
        chartSuggestion = {
          type: "bar",
          xKey: resultCols[0],
          yKeys: [firstNum],
          title: `${firstNum} by ${resultCols[0]}`,
        };
      }
    }

    return {
      queryPlan: "In-Browser Tabular SQL Execution Plan",
      generatedSql: sql,
      columns: resultCols,
      rows: resultRows,
      rowCount: resultRows.length,
      explanation: `ประมวลผลสำเร็จบนเครื่องผู้ใช้: พบข้อมูล ${resultRows.length} รายการ`,
      chartSuggestion,
    };
  }
}

export const edgeSqlEngine = new EdgeSqlEngine();
