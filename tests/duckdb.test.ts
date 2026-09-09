import { describe, it, expect, beforeEach } from "vitest";
import { EdgeSqlEngine } from "../src/lib/duckdb";

describe("EdgeSqlEngine (In-Memory Tabular SQL Engine)", () => {
  let engine: EdgeSqlEngine;

  const sampleRows = [
    { id: "1", Region: "Bangkok", Date: "2026-01-10", Units: 10, Revenue: 5000 },
    { id: "2", Region: "Bangkok", Date: "2026-01-15", Units: 5, Revenue: 2500 },
    { id: "3", Region: "Chiang Mai", Date: "2026-02-01", Units: 8, Revenue: 4000 },
    { id: "4", Region: "Phuket", Date: "2026-02-20", Units: 12, Revenue: 7200 },
    { id: "5", Region: "Khon Kaen", Date: "2026-03-05", Units: 4, Revenue: 1800 },
  ];

  beforeEach(() => {
    engine = new EdgeSqlEngine();
    engine.loadData(sampleRows);
  });

  it("should execute SELECT * and return all rows", async () => {
    const result = await engine.executeSql("SELECT * FROM dataset");
    expect(result.rowCount).toBe(5);
    expect(result.columns).toContain("Region");
    expect(result.columns).toContain("Revenue");
  });

  it("should filter rows using WHERE clause", async () => {
    const result = await engine.executeSql("SELECT * FROM dataset WHERE Region = 'Bangkok'");
    expect(result.rowCount).toBe(2);
    expect(result.rows.every((r) => r[1] === "Bangkok")).toBe(true);
  });

  it("should aggregate data with GROUP BY and SUM", async () => {
    const result = await engine.executeSql(
      'SELECT "Region", SUM("Revenue") AS "Total_Revenue" FROM dataset GROUP BY "Region" ORDER BY "Total_Revenue" DESC'
    );
    expect(result.columns).toEqual(["Region", "Total_Revenue"]);
    expect(result.rowCount).toBe(4);
    
    // Bangkok sum = 5000 + 2500 = 7500 (highest, should be first)
    expect(result.rows[0][0]).toBe("Bangkok");
    expect(result.rows[0][1]).toBe(7500);
  });

  it("should support AVG, COUNT, MIN, MAX aggregations", async () => {
    const result = await engine.executeSql(
      'SELECT "Region", AVG("Revenue") AS "Avg_Rev", COUNT(*) AS "Total_Count", MIN("Revenue") AS "Min_Rev", MAX("Revenue") AS "Max_Rev" FROM dataset GROUP BY "Region"'
    );
    expect(result.columns).toEqual(["Region", "Avg_Rev", "Total_Count", "Min_Rev", "Max_Rev"]);
    const bkkRow = result.rows.find((r) => r[0] === "Bangkok");
    expect(bkkRow).toBeDefined();
    if (bkkRow) {
      expect(bkkRow[1]).toBe(3750); // (5000 + 2500) / 2
      expect(bkkRow[2]).toBe(2);    // 2 transactions
      expect(bkkRow[3]).toBe(2500); // min
      expect(bkkRow[4]).toBe(5000); // max
    }
  });

  it("should respect LIMIT clause", async () => {
    const result = await engine.executeSql(
      'SELECT "Region", SUM("Revenue") AS "Total" FROM dataset GROUP BY "Region" ORDER BY "Total" DESC LIMIT 2'
    );
    expect(result.rowCount).toBe(2);
  });

  it("should suggest line chart for date columns and pie chart for categories <= 6", async () => {
    // 1. Line chart for date
    const dateResult = await engine.executeSql(
      'SELECT "Date", SUM("Revenue") AS "Daily_Revenue" FROM dataset GROUP BY "Date" ORDER BY "Date" ASC'
    );
    expect(dateResult.chartSuggestion?.type).toBe("line");

    // 2. Pie chart for 4 regions
    const regionResult = await engine.executeSql(
      'SELECT "Region", SUM("Revenue") AS "Total_Revenue" FROM dataset GROUP BY "Region"'
    );
    expect(regionResult.chartSuggestion?.type).toBe("pie");
  });

  it("should handle empty dataset gracefully", async () => {
    const emptyEngine = new EdgeSqlEngine();
    emptyEngine.loadData([]);
    const result = await emptyEngine.executeSql("SELECT * FROM dataset");
    expect(result.rowCount).toBe(0);
    expect(result.rows).toEqual([]);
  });
});
