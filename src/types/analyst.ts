export type ColumnDataType = "string" | "number" | "date" | "boolean" | "category";

export interface ColumnSchema {
  name: string;
  inferredType: ColumnDataType;
  distinctCount: number;
  nullCount: number;
  sampleValues: string[];
  isSensitivePiiCandidate: boolean;
  piiType?: "THAI_ID" | "THAI_PHONE" | "EMAIL" | "CREDIT_CARD" | "NAME";
  min?: number | string;
  max?: number | string;
  mean?: number;
}

export interface DatasetMetadata {
  fileName: string;
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnSchema[];
  detectedDelimiter: string;
  samplePreview: Record<string, string | number | null>[];
}

export interface PrivacyGuardReport {
  rawRowsExposedToCloud: 0;
  piiMaskedColumns: string[];
  sentMetadataSummary: string;
  timestamp: string;
  payloadInspector: {
    endpoint: string;
    method: string;
    requestBody: any;
    redactedFieldsCount: number;
  };
}

export interface QueryExecutionResult {
  queryPlan: string;
  generatedSql: string;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  executionTimeMs: number;
  explanation: string;
  chartSuggestion?: {
    type: "bar" | "line" | "pie";
    xKey: string;
    yKeys: string[];
    title: string;
  };
}
