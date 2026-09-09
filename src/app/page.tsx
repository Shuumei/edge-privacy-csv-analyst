"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import Papa from "papaparse";
import {
  ShieldCheck,
  UploadCloud,
  FileSpreadsheet,
  Terminal,
  BarChart3,
  Table as TableIcon,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Database,
  ExternalLink,
  Code2,
  CheckCircle2,
  Download,
  Key,
  Trash2,
  ImageDown,
  Check,
  Play,
  RotateCcw,
  Loader2,
  Activity,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

import type { DatasetMetadata, QueryExecutionResult } from "@/types/analyst";
import { extractDatasetMetadata, createAnonymizedSchemaPrompt } from "@/lib/schemaExtractor";
import { edgeSqlEngine } from "@/lib/duckdb";
import { SAMPLE_DATASETS, SampleDatasetOption } from "@/lib/sampleDatasets";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Home() {
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
  const [, setRawRows] = useState<Record<string, any>[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("sales");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loadingPhase, setLoadingPhase] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<QueryExecutionResult | null>(null);
  const [viewMode, setViewMode] = useState<string>("table");
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [, setLastAuditPayload] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom Gemini API Key & Chart Export states
  const [customApiKey, setCustomApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [tempModel, setTempModel] = useState<string>("gemini-2.5-flash");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [showKeyText, setShowKeyText] = useState(false);
  const [keyToast, setKeyToast] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  const isQueryLoading = isPending || Boolean(loadingPhase);

  const activePreset = SAMPLE_DATASETS.find((d) => d.id === selectedDatasetId);
  const activeQueries = activePreset
    ? activePreset.suggestedQueries
    : dataset
    ? [
        `นับจำนวนแถวทั้งหมดใน ${dataset.fileName}`,
        `แสดงภาพรวมของข้อมูล 10 แถวแรก`,
      ]
    : [];

  useEffect(() => {
    handleLoadSample();
    try {
      const savedKey = localStorage.getItem("edge_analyst_gemini_key");
      if (savedKey) {
        setCustomApiKey(savedKey);
      }
      const savedModel = localStorage.getItem("edge_analyst_gemini_model");
      if (savedModel) {
        setSelectedModel(savedModel);
        setTempModel(savedModel);
      }
    } catch (e) {
      console.warn("localStorage not accessible:", e);
    }
  }, []);

  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    try {
      localStorage.setItem("edge_analyst_gemini_model", tempModel);
      setSelectedModel(tempModel);

      if (trimmed) {
        localStorage.setItem("edge_analyst_gemini_key", trimmed);
        setCustomApiKey(trimmed);
        setKeyToast(`บันทึก Gemini API Key & โมเดล ${tempModel} สำเร็จ`);
      } else {
        localStorage.removeItem("edge_analyst_gemini_key");
        setCustomApiKey("");
        setKeyToast(`อัปเดตโมเดลเป็น ${tempModel} (กลับสู่โหมดเริ่มต้น)`);
      }
    } catch (e) {
      console.warn("Failed saving key:", e);
    }
    setTimeout(() => setKeyToast(null), 3000);
    setIsKeyModalOpen(false);
  };

  const handleClearApiKey = () => {
    try {
      localStorage.removeItem("edge_analyst_gemini_key");
    } catch (e) {}
    setCustomApiKey("");
    setTempApiKey("");
    setKeyToast("ลบ API Key เรียบร้อยแล้ว");
    setTimeout(() => setKeyToast(null), 3000);
  };

  const handleExportChartPng = () => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    let dataUrl = "";
    if (typeof chart.toBase64Image === "function") {
      dataUrl = chart.toBase64Image("image/png", 1);
    } else if (chart.canvas && typeof chart.canvas.toDataURL === "function") {
      dataUrl = chart.canvas.toDataURL("image/png");
    }
    if (!dataUrl) {
      setErrorMsg("ไม่สามารถสร้างไฟล์ภาพจากกราฟได้");
      return;
    }

    const titleSlug = execResult?.chartSuggestion?.title
      ? execResult.chartSuggestion.title.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "_").replace(/^_+|_+$/g, "")
      : "chart_analytics";
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${titleSlug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseCsvString = (csvText: string, fileName: string) => {
    setErrorMsg(null);
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setErrorMsg("ไม่พบข้อมูลในไฟล์ CSV");
          return;
        }
        const rows = results.data;
        setRawRows(rows);
        edgeSqlEngine.loadData(rows);

        const metadata = extractDatasetMetadata(fileName, csvText.length, rows);
        setDataset(metadata);
        setExecResult(null);
      },
      error: (err: Error) => {
        setErrorMsg(`Parse Error: ${err.message}`);
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedDatasetId("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleParseCsvString(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleSelectDataset = (ds: SampleDatasetOption) => {
    setSelectedDatasetId(ds.id);
    handleParseCsvString(ds.csv, ds.fileName);
    setQuery(ds.suggestedQueries[0] || "");
    setErrorMsg(null);
  };

  const handleDownloadSampleCsv = (ds: SampleDatasetOption, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([ds.csv.trim() + "\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ds.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    const defaultDs = SAMPLE_DATASETS[0];
    handleSelectDataset(defaultDs);
  };

  const handleRunQuery = async (queryToRun?: string) => {
    const q = queryToRun || query;
    if (!q.trim() || !dataset) return;
    setErrorMsg(null);
    setLoadingPhase("llm");

    startTransition(async () => {
      try {
        const anonymizedSchema = createAnonymizedSchemaPrompt(dataset);
        const columnNames = dataset.columns.map((c) => c.name);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-gemini-model": selectedModel,
        };
        if (customApiKey.trim()) {
          headers["x-gemini-key"] = customApiKey.trim();
        }

        const response = await fetch("/api/generate-sql", {
          method: "POST",
          headers,
          body: JSON.stringify({
            question: q,
            anonymizedSchema,
            columnNames,
            customApiKey: customApiKey.trim() || undefined,
            model: selectedModel,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "เกิดข้อผิดพลาดในการสร้างคำสั่ง SQL");
        }

        const data = await response.json();
        setLastAuditPayload(data.payloadAudit);

        setLoadingPhase("engine");
        // Give a slight visual beat so user sees engine phase
        await new Promise((resolve) => setTimeout(resolve, 120));

        const result = await edgeSqlEngine.executeSql(data.sql);

        if (result.chartSuggestion) {
          setLoadingPhase("chart");
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        setExecResult({
          ...result,
          explanation: data.explanation || result.explanation,
        });

        if (result.chartSuggestion) {
          setViewMode("chart");
        } else {
          setViewMode("table");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "การประมวลผลล้มเหลว");
      } finally {
        setLoadingPhase(null);
      }
    });
  };

  const handleExportCsv = () => {
    if (!execResult || execResult.rows.length === 0) return;
    const csvContent = [
      execResult.columns.join(","),
      ...execResult.rows.map((row) => row.map((cell) => JSON.stringify(cell ?? "")).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "analyst_query_result.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderChart = () => {
    if (!execResult || !execResult.chartSuggestion) return null;
    const { type, xKey, yKeys, title } = execResult.chartSuggestion;
    const xIdx = execResult.columns.indexOf(xKey);
    const yIdx = execResult.columns.indexOf(yKeys[0]);

    if (xIdx === -1 || yIdx === -1) return null;

    const labels = execResult.rows.map((r) => String(r[xIdx] ?? ""));
    const dataValues = execResult.rows.map((r) => Number(r[yIdx]) || 0);

    const chartColors = [
      "rgba(16, 185, 129, 0.85)", // Emerald
      "rgba(59, 130, 246, 0.85)",  // Blue
      "rgba(245, 158, 11, 0.85)",  // Amber
      "rgba(139, 92, 246, 0.85)",  // Violet
      "rgba(236, 72, 153, 0.85)",  // Pink
      "rgba(14, 165, 233, 0.85)",  // Sky
    ];

    const chartData = {
      labels,
      datasets: [
        {
          label: yKeys[0],
          data: dataValues,
          backgroundColor: type === "pie" ? chartColors.slice(0, labels.length) : "rgba(16, 185, 129, 0.8)",
          borderColor: type === "pie" ? "#ffffff" : "#059669",
          borderWidth: type === "pie" ? 2 : 1,
          borderRadius: 6,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type === "pie",
          labels: { color: "#475569", font: { size: 12 } },
        },
        title: {
          display: true,
          text: title,
          color: "#0f172a",
          font: { size: 14, weight: "bold" as const },
          padding: { bottom: 16 },
        },
      },
      scales:
        type === "pie"
          ? {}
          : {
              x: { ticks: { color: "#64748b" }, grid: { color: "#f1f5f9" } },
              y: { ticks: { color: "#64748b" }, grid: { color: "#f1f5f9" } },
            },
    };

    return (
      <div className="h-[380px] w-full p-4 bg-white rounded-xl">
        {type === "bar" && <Bar ref={chartRef} data={chartData} options={options} />}
        {type === "pie" && <Pie ref={chartRef} data={chartData} options={options} />}
        {type === "line" && <Line ref={chartRef} data={chartData} options={options} />}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* Navigation Header */}
      <header className="border-b border-border/80 bg-white/95 backdrop-blur-xs sticky top-0 z-30 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Privacy-Preserving Edge CSV Analyst
              </h1>
              <Badge variant="success">PDPA Zero-Egress</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              ระบบวิเคราะห์ข้อมูลตารางในหน่วยความจำเบราว์เซอร์ 100% โดยไม่ส่งแถวข้อมูลขึ้น Cloud
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {keyToast && (
            <Badge variant="success" className="hidden sm:flex items-center gap-1.5 py-1 px-3">
              <Check className="w-3.5 h-3.5" />
              <span>{keyToast}</span>
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTempApiKey(customApiKey);
              setTempModel(selectedModel);
              setShowKeyText(false);
              setIsKeyModalOpen(true);
            }}
            title="ตั้งค่า Gemini API Key และเลือกรุ่นโมเดล (BYOK)"
            className="gap-2"
          >
            <Key className={`w-4 h-4 ${customApiKey ? "text-emerald-600" : "text-slate-400"}`} />
            <span>API Key & Model</span>
            {customApiKey ? (
              <Badge variant="success" className="px-1.5 py-0 text-[11px] font-mono">
                {selectedModel === "gemini-2.5-flash-lite" ? "2.5 Lite" : "2.5 Flash"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-mono text-slate-500">
                Default ({selectedModel === "gemini-2.5-flash-lite" ? "2.5 Lite" : "2.5 Flash"})
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInspectorOpen(true)}
            className="gap-2"
          >
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Audit Network (0 Raw Rows)</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2"
          >
            <a
              href="https://github.com/Shuumei/edge-privacy-csv-analyst"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Code2 className="w-4 h-4 text-slate-500" />
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Section 1: Preset Datasets Gallery */}
        <Card className="border-border shadow-xs overflow-hidden bg-white">
          <CardHeader className="p-5 sm:p-6 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">
                    ชุดข้อมูลตัวอย่างสำหรับทดลองระบบ (Quick 1-Click Presets)
                  </CardTitle>
                </div>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  คลิกเพื่อโหลดชุดข้อมูลเข้าสู่ Edge SQL Engine ทันที หรือกดไอคอนดาวน์โหลดเพื่อบันทึกไฟล์ .csv นำไปทดสอบใน Dropzone
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                4 Enterprise Datasets
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 pt-0">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {SAMPLE_DATASETS.map((ds) => {
                const isSelected = selectedDatasetId === ds.id;
                return (
                  <Card
                    key={ds.id}
                    onClick={() => handleSelectDataset(ds)}
                    className={cn(
                      "group relative flex flex-col justify-between cursor-pointer transition-all duration-200 border-2 overflow-hidden",
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/25 shadow-md ring-2 ring-emerald-500/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md"
                    )}
                  >
                    <CardHeader className="p-4 sm:p-5 pb-3">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <Badge
                          variant={
                            ds.id === "sales"
                              ? "info"
                              : ds.id === "healthcare"
                              ? "destructive"
                              : ds.id === "payroll"
                              ? "warning"
                              : "success"
                          }
                          className="font-medium text-[11px]"
                        >
                          {ds.badge}
                        </Badge>
                        {isSelected ? (
                          <Badge variant="success" className="gap-1 px-2 py-0.5 text-[11px] font-semibold">
                            <Check className="w-3 h-3" />
                            <span>กำลังใช้งาน</span>
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground group-hover:text-slate-700 transition-colors">
                            คลิกเพื่อโหลด
                          </span>
                        )}
                      </div>

                      <CardTitle className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                        {ds.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600 line-clamp-2 mt-1.5 leading-relaxed min-h-[36px]">
                        {ds.description}
                      </CardDescription>
                    </CardHeader>

                    <CardFooter className="p-4 sm:p-5 pt-3 mt-auto flex items-center justify-between gap-2 border-t border-slate-100/90 bg-slate-50/40">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ds.id === "sales" ? "12 แถว" : ds.id === "healthcare" ? "11 แถว" : "10 แถว"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDownloadSampleCsv(ds, e)}
                          title={`ดาวน์โหลด ${ds.fileName}`}
                          className="h-8 px-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="text-xs">CSV</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "default" : "secondary"}
                          onClick={() => handleSelectDataset(ds)}
                          className={cn(
                            "h-8 px-3.5 text-xs font-medium transition-all",
                            isSelected
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          )}
                        >
                          {isSelected ? "Active" : "Load"}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Active Dataset & Privacy Protocol (Grid) */}
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          <Card className="lg:col-span-8 flex flex-col justify-between shadow-xs border-border bg-white">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 text-sm font-medium text-slate-700">
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>ชุดข้อมูลปัจจุบัน (Active):</span>
                  <span className="text-slate-900 font-mono font-semibold">
                    {dataset ? dataset.fileName : "ยังไม่ได้โหลดไฟล์"}
                  </span>
                  {dataset && (
                    <span className="text-xs text-muted-foreground font-mono">
                      ({dataset.rowCount.toLocaleString()} แถว, {dataset.columnCount} คอลัมน์)
                    </span>
                  )}
                  {selectedDatasetId ? (
                    <Badge variant="info" className="font-mono text-xs">
                      Preset: {SAMPLE_DATASETS.find((d) => d.id === selectedDatasetId)?.name.split(" ")[0]}
                    </Badge>
                  ) : dataset ? (
                    <Badge variant="secondary" className="font-mono text-xs">
                      Custom Upload
                    </Badge>
                  ) : null}
                </div>

                {selectedDatasetId !== "sales" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadSample}
                    className="text-xs text-muted-foreground hover:text-slate-900 gap-1.5 h-8"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Reset to Sales</span>
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 pt-2">
              <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50/70 rounded-2xl p-8 text-center cursor-pointer transition-all block bg-slate-50/40">
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2.5" />
                <p className="text-base font-semibold text-slate-800">
                  คลิกเพื่อเลือกไฟล์ หรือลากวางไฟล์ .csv ของคุณที่นี่
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-lg mx-auto leading-relaxed">
                  ข้อมูลจะถูกโหลดเข้าสู่หน่วยความจำเบราว์เซอร์เท่านั้น และระบบจะสแกนตรวจจับพร้อม Masking ข้อมูล PII ก่อนสร้างคำถาม SQL ทุกครั้ง
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4 flex flex-col justify-between shadow-xs border-border bg-white">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span>Enterprise Privacy Protocol</span>
              </div>
              <CardDescription className="text-xs sm:text-sm leading-relaxed mt-2 text-slate-600">
                คลาวด์ LLM จะได้รับเฉพาะ <strong className="text-slate-800">Anonymous Schema Metadata</strong> (ชื่อคอลัมน์, สถิติรวม, ชนิดข้อมูล) 
                เพื่อสังเคราะห์ SQL เท่านั้น <strong className="text-slate-900">แถวข้อมูลจริง 100% จะถูกประมวลผลบนเครื่องของคุณ</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 pt-0">
              <Separator className="my-3.5" />
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Raw Rows Egress:</span>
                  <Badge variant="success" className="font-mono font-bold">0 Records (Zero)</Badge>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Thai ID / Phone Scanner:</span>
                  <Badge variant="secondary" className="font-mono text-slate-800 font-medium">Active (Auto-Mask)</Badge>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>In-Memory SQL Runtime:</span>
                  <Badge variant="secondary" className="font-mono text-slate-800 font-medium">DuckDB-Wasm / Edge</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Schema & PII Security Badges */}
        {dataset && (
          <Card className="shadow-xs border-border bg-white">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 uppercase tracking-wider">
                  <Database className="w-4 h-4 text-slate-500" />
                  <span>คอลัมน์ที่ตรวจพบ และสถานะการปกป้องข้อมูล PII (Schema Metadata)</span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {dataset.columns.filter((c) => c.isSensitivePiiCandidate).length} คอลัมน์ที่ตรวจพบ PII (ซ่อนข้อมูลตัวอย่างแล้ว)
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 pt-1">
              <div className="flex flex-wrap gap-2.5">
                {dataset.columns.map((col) => (
                  <div
                    key={col.name}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono border flex items-center gap-2.5 shadow-2xs transition-colors",
                      col.isSensitivePiiCandidate
                        ? "bg-amber-50/80 border-amber-200/90 text-amber-950"
                        : "bg-slate-50/80 border-border text-slate-800"
                    )}
                  >
                    <span className="font-semibold">{col.name}</span>
                    <Badge variant="outline" className="bg-white text-[11px] font-normal px-2 py-0">
                      {col.inferredType}
                    </Badge>
                    {col.isSensitivePiiCandidate ? (
                      <Badge variant="warning" className="gap-1 px-2 py-0.5 text-[11px] font-bold">
                        <EyeOff className="w-3 h-3" />
                        <span>{col.piiType || "PII"} MASKED</span>
                      </Badge>
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Query Input Bar */}
        <Card className="shadow-xs border-border bg-white">
          <CardHeader className="p-5 sm:p-6 pb-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span>ถามข้อมูลด้วยภาษาธรรมชาติ (Natural Language Query)</span>
              </label>
              <span className="text-xs sm:text-sm text-muted-foreground">รองรับทั้งภาษาไทยและอังกฤษ</span>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 pt-1 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isPending && handleRunQuery()}
                  disabled={isPending}
                  placeholder={
                    activeQueries[0]
                      ? `เช่น ${activeQueries[0]}`
                      : "พิมพ์คำถามการวิเคราะห์ภาษาไทย เช่น สรุปยอดรวม หรือนับจำนวน..."
                  }
                  className="h-12 text-sm sm:text-base shadow-2xs px-4"
                />
              </div>
              <Button
                onClick={() => handleRunQuery()}
                disabled={isPending || !dataset}
                size="lg"
                className="h-12 gap-2 text-sm sm:text-base font-semibold px-6 shadow-sm shrink-0"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังวิเคราะห์...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Execute Analysis</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs sm:text-sm text-muted-foreground mr-1 flex items-center gap-1.5 font-medium">
                <span>คำถามด่วน (Quick Prompts):</span>
                {activePreset && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {activePreset.name.split(" ")[0]}
                  </Badge>
                )}
              </span>
              {activeQueries.map((qText, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    setQuery(qText);
                    handleRunQuery(qText);
                  }}
                  className="rounded-full text-xs sm:text-sm text-slate-700 hover:text-slate-900 border-border/80 h-auto py-1 px-3.5 hover:bg-slate-100 transition-colors"
                >
                  {qText}
                </Button>
              ))}
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-xs sm:text-sm text-destructive flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 5: Loading State Card (When Query or Chart is Generating) */}
        {isPending && (
          <Card className="shadow-md border-2 border-emerald-500/40 overflow-hidden bg-white animate-in fade-in duration-200">
            <CardHeader className="p-5 sm:p-6 border-b border-emerald-100 bg-emerald-50/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                        กำลังวิเคราะห์ข้อมูลและสร้างชาร์ตแสดงผล...
                      </CardTitle>
                      <Badge variant="success" className="animate-pulse font-mono text-xs">
                        Processing
                      </Badge>
                    </div>
                    <CardDescription className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      ระบบกำลังคำนวณบนหน่วยความจำของเครื่องคุณ (Zero Data Egress)
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-emerald-800 bg-emerald-100/70 px-3.5 py-1.5 rounded-lg border border-emerald-200">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  <span className="font-medium">
                    {loadingPhase === "llm" && "แปลงคำถามเป็น SQL (Gemini 2.5 Flash)..."}
                    {loadingPhase === "engine" && "รันคำสั่ง SQL บนเบราว์เซอร์..."}
                    {loadingPhase === "chart" && "เรนเดอร์ชาร์ตและสร้างภาพ..."}
                    {!loadingPhase && "กำลังประมวลผล..."}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Visual Workflow Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div
                  className={cn(
                    "p-3.5 rounded-xl border flex items-center gap-3 transition-all",
                    loadingPhase === "llm"
                      ? "bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      loadingPhase === "llm"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {loadingPhase === "llm" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "✓"
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">1. Gemini SQL Planning</div>
                    <div className="text-[11px] font-normal opacity-80">แปลงภาษาธรรมชาติเป็น SQL</div>
                  </div>
                </div>

                <div
                  className={cn(
                    "p-3.5 rounded-xl border flex items-center gap-3 transition-all",
                    loadingPhase === "engine"
                      ? "bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      loadingPhase === "engine"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {loadingPhase === "engine" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "2"
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">2. In-Memory Execution</div>
                    <div className="text-[11px] font-normal opacity-80">รัน DuckDB SQL ในเบราว์เซอร์</div>
                  </div>
                </div>

                <div
                  className={cn(
                    "p-3.5 rounded-xl border flex items-center gap-3 transition-all",
                    loadingPhase === "chart"
                      ? "bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      loadingPhase === "chart"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {loadingPhase === "chart" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "3"
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">3. Visual Rendering</div>
                    <div className="text-[11px] font-normal opacity-80">วาดชาร์ตกราฟด้วย Chart.js</div>
                  </div>
                </div>
              </div>

              {/* Chart Skeleton Simulation */}
              <div className="h-[280px] w-full p-6 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-56 bg-slate-200" />
                    <Skeleton className="h-3.5 w-32 bg-slate-200/70" />
                  </div>
                  <Skeleton className="h-7 w-28 rounded-lg bg-slate-200/80" />
                </div>

                {/* Simulated pulsing chart bars */}
                <div className="flex items-end justify-around h-36 gap-4 pt-4 px-6 border-b border-slate-200/80">
                  <Skeleton className="w-14 h-20 rounded-t-lg bg-emerald-200/60 animate-pulse" />
                  <Skeleton className="w-14 h-32 rounded-t-lg bg-emerald-300/80 animate-pulse" />
                  <Skeleton className="w-14 h-24 rounded-t-lg bg-emerald-200/70 animate-pulse" />
                  <Skeleton className="w-14 h-28 rounded-t-lg bg-emerald-300/80 animate-pulse" />
                  <Skeleton className="w-14 h-16 rounded-t-lg bg-emerald-200/60 animate-pulse" />
                </div>

                <div className="flex items-center justify-around pt-2">
                  <Skeleton className="h-3 w-12 bg-slate-200" />
                  <Skeleton className="h-3 w-12 bg-slate-200" />
                  <Skeleton className="h-3 w-12 bg-slate-200" />
                  <Skeleton className="h-3 w-12 bg-slate-200" />
                  <Skeleton className="h-3 w-12 bg-slate-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 5: Query Execution Result (Table & Chart) */}
        {!isPending && execResult && (
          <Card className="shadow-xs overflow-hidden border-border bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-slate-50/80">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted-foreground">
                    <Terminal className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-slate-700">Generated SQL (รันบน Edge In-Memory):</span>
                    <Badge variant="success" className="font-mono font-bold">
                      ⚡ {execResult.executionTimeMs}ms
                    </Badge>
                  </div>
                  <code className="text-xs sm:text-sm font-mono text-slate-900 bg-white px-3 py-1.5 rounded-lg block border border-border shadow-2xs overflow-x-auto">
                    {execResult.generatedSql}
                  </code>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 p-1 text-muted-foreground border border-border">
                    <button
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer",
                        viewMode === "table"
                          ? "bg-white text-slate-900 font-semibold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <TableIcon className="w-4 h-4 mr-1.5" />
                      <span>Table</span>
                    </button>
                    <button
                      onClick={() => setViewMode("chart")}
                      className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer",
                        viewMode === "chart"
                          ? "bg-white text-slate-900 font-semibold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <BarChart3 className="w-4 h-4 mr-1.5" />
                      <span>Chart</span>
                    </button>
                  </div>

                  {viewMode === "chart" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportChartPng}
                      title="ดาวน์โหลดกราฟเป็นภาพ PNG ความละเอียดสูง"
                      className="gap-1.5 h-10"
                    >
                      <ImageDown className="w-4 h-4 text-slate-600" />
                      <span>Export PNG</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCsv}
                    className="gap-1.5 h-10"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {viewMode === "table" ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        {execResult.columns.map((col, idx) => (
                          <TableHead key={idx} className="font-bold text-slate-800">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {execResult.rows.map((row, rIdx) => (
                        <TableRow key={rIdx} className="hover:bg-slate-50/60">
                          {row.map((cell, cIdx) => (
                            <TableCell key={cIdx}>
                              {typeof cell === "number"
                                ? cell.toLocaleString()
                                : String(cell ?? "-")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                renderChart()
              )}
            </CardContent>

            <CardFooter className="px-5 py-3 bg-slate-50/80 border-t border-border/80 text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-700">{execResult.explanation}</span>
              <Badge variant="outline" className="bg-white font-mono text-xs">
                Returned {execResult.rowCount} rows
              </Badge>
            </CardFooter>
          </Card>
        )}

        {/* Section 6: First 5 Rows Preview (Auto-Masked) */}
        {dataset && dataset.samplePreview.length > 0 && !execResult && !isPending && (
          <Card className="shadow-xs border-border bg-white">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-800">
                  ตัวอย่าง 5 แถวแรกของข้อมูล (First 5 Rows Preview - Auto-Masked)
                </CardTitle>
                <Badge variant="success" className="font-mono font-medium">Zero PII Leakage</Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 pt-0">
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      {dataset.columns.map((col) => (
                        <TableHead key={col.name} className="font-semibold text-slate-700">
                          {col.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataset.samplePreview.map((row, rIdx) => (
                      <TableRow key={rIdx} className="hover:bg-slate-50/60">
                        {dataset.columns.map((col) => (
                          <TableCell key={col.name} className="whitespace-nowrap">
                            {col.isSensitivePiiCandidate ? (
                              <Badge variant="warning" className="text-[11px] font-bold py-0.5">
                                [MASKED]
                              </Badge>
                            ) : (
                              String(row[col.name] ?? "-")
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Network Audit Inspector Dialog */}
      <Dialog open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle>Zero-Data Network Egress Inspector</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    ตรวจสอบ Request Payload ที่ส่งออกไปยัง LLM API เพื่อยืนยันความปลอดภัยตาม PDPA
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInspectorOpen(false)}
                className="text-muted-foreground hover:text-slate-800"
              >
                ✕ ปิด
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              เครื่องมือนี้ช่วยให้ผู้ตรวจประเมินความปลอดภัย (Security & Compliance Auditor) สามารถตรวจสอบ Request Payload จริงที่แอพพลิเคชันส่งไปยัง Cloud LLM API ได้ด้วยตาตนเอง เพื่อรับประกันการปฏิบัติตามมาตรฐาน PDPA/GDPR อย่างเคร่งครัด
            </p>

            <div className="bg-slate-900 rounded-xl p-4.5 font-mono text-xs sm:text-sm border border-slate-800 text-slate-200 max-h-72 overflow-y-auto space-y-2.5 shadow-inner">
              <div className="text-emerald-400 font-bold">
                ENDPOINT: POST /api/generate-sql
              </div>
              <div className="text-slate-200 font-semibold">
                RAW_DATA_ROWS_SENT_TO_CLOUD: 0 (GUARANTEED ZERO EGRESS)
              </div>
              <div className="text-slate-400 text-xs">
                LLM_AUTH_MODE: {customApiKey ? `Client Custom API Key (••••${customApiKey.slice(-4)}) via x-gemini-key` : "Default Server Key / Edge Heuristic Fallback"}
              </div>
              <div className="text-slate-400 text-xs">
                SCHEMA_PAYLOAD_SENT (ONLY ANONYMOUS METADATA):
              </div>
              <pre className="text-slate-200 text-xs whitespace-pre-wrap bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                {dataset ? createAnonymizedSchemaPrompt(dataset) : "No dataset loaded"}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="default"
              onClick={() => setIsInspectorOpen(false)}
            >
              รับทราบและตรวจสอบเรียบร้อย
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Gemini API Key Dialog */}
      <Dialog open={isKeyModalOpen} onOpenChange={setIsKeyModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle>Custom Gemini API Key & Model</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    BYOK (Bring Your Own Key) &bull; Zero Server-Side Storage
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsKeyModalOpen(false)}
                className="text-muted-foreground hover:text-slate-800"
              >
                ✕ ปิด
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 pt-2">
            <p className="leading-relaxed">
              ใส่ Google Gemini API Key ของคุณเพื่อใช้โมเดล <span className="text-slate-900 font-mono font-semibold">Gemini 2.5 Flash</span> (หรือ 2.5 Flash Lite) ในการแปลงคำถามภาษาธรรมชาติเป็น SQL query อย่างแม่นยำสูง
            </p>

            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong className="text-emerald-800">PDPA & Privacy First:</strong> กุญแจ API จะถูกจัดเก็บบน <span className="text-emerald-800 font-mono font-medium">localStorage</span> ของเบราว์เซอร์คุณเท่านั้น ไม่มีการบันทึกลงฐานข้อมูลใดๆ และข้อมูลแถว CSV จะไม่มีวันถูกส่งออกนอกเครื่อง
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-medium">Gemini API Key:</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-700 hover:text-emerald-800 underline underline-offset-2 flex items-center gap-1 font-medium"
                >
                  <span>รับ API Key ฟรีที่ Google AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showKeyText ? "text" : "password"}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="pr-10 font-mono text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-800 font-medium">โมเดล Gemini ที่ต้องการใช้ (Model Selection):</label>
                <span className="text-xs text-muted-foreground font-mono">Google GenAI</span>
              </div>
              <select
                value={tempModel}
                onChange={(e) => setTempModel(e.target.value)}
                className="w-full bg-slate-50 border border-input focus:bg-white focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 transition-colors cursor-pointer font-medium"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (แนะนำ • ความแม่นยำสูง ฉลาด ตอบสนองเร็ว)</option>
                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (เร็วสูงสุด • ประหยัดโควตา Token / Free Tier)</option>
              </select>
              <p className="text-xs text-muted-foreground leading-normal">
                * ค่าเริ่มต้นของระบบคือ <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">gemini-2.5-flash</code> หากใช้ API Key ฟรีจาก Google AI Studio สามารถเลือกสลับรุ่น Flash หรือ Flash Lite ได้ตามที่ต้องการ
              </p>
            </div>

            {customApiKey && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border text-xs sm:text-sm">
                <span className="text-muted-foreground">สถานะกุญแจปัจจุบัน:</span>
                <span className="text-emerald-700 font-mono flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Custom Key (••••{customApiKey.slice(-4)})
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            {customApiKey ? (
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={handleClearApiKey}
                className="gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบ API Key</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="default"
                type="button"
                onClick={handleSaveApiKey}
              >
                บันทึกการตั้งค่า
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
