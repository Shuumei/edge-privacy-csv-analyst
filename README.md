# Edge Privacy CSV Analyst

A privacy-focused browser application for querying and visualizing CSV spreadsheets using natural language. All data parsing, PII masking, and SQL queries execute locally in your browser — zero raw data rows are ever transmitted to external servers or LLM APIs.

---

## Why this exists

Traditional LLM data analytics tools typically require uploading your CSV files to cloud servers or third-party APIs. For sensitive datasets — like customer PII, patient records, or financial data — this introduces compliance risks under regulations such as PDPA, GDPR, and HIPAA.

This tool solves that with a **Zero-Data Egress** approach:
1. **Local CSV Parsing**: The browser parses the CSV file in memory using PapaParse.
2. **Client-Side PII Redaction**: Thai National IDs (validated via Modulus 11 checksum), phone numbers, emails, and credit cards are identified and redacted before generating the schema.
3. **Schema-Only Query Planning**: Only the anonymized table schema (column names and inferred data types) is sent to Google Gemini (or an offline rule-based parser) to produce standard SQL.
4. **In-Memory SQL Execution**: The generated SQL query runs directly against the in-memory dataset in your browser. Raw rows never leave your machine.

```
┌───────────────────────────────────────────────────────────┐
│                      Client Browser                       │
│                                                           │
│  CSV File ──► PapaParse ──► In-Memory SQL Engine          │
│                    │                  ▲                   │
│                    ▼                  │ (Runs SQL locally)│
│             PII Redaction &           │                   │
│             Schema Extractor          │                   │
│                    │                  │                   │
└────────────────────┼──────────────────┼───────────────────┘
                     │ (Schema Only)    │ (SQL String)
                     ▼                  │
          ┌───────────────────────────────────┐
          │      LLM SQL Generator (BYOK)     │
          │    (Gemini 2.5 Flash / Lite)      │
          │    * Receives 0 Data Rows *       │
          └───────────────────────────────────┘
```

---

## Features

- **Zero Raw Data Egress**: Raw rows never leave the client browser.
- **Thai PII Scanner**: Client-side detection for Thai citizen IDs (Modulus 11 checksum), phone numbers (06x/08x/09x), emails, and credit cards.
- **Dual SQL Generation**:
  - **Gemini API (BYOK)**: Connect your own Google AI Studio key to query via Gemini 2.5 Flash or 2.5 Flash Lite.
  - **Offline Fallback**: Basic queries (aggregations, filters, sorting) work without an API key or internet connection.
- **Sample Datasets Gallery**: One-click demo datasets for E-Commerce, Hospital Patients, HR Payroll, and SaaS Metrics.
- **Visualizations**: Automatic chart generation (Bar, Pie, Line) powered by Chart.js with high-res PNG export.
- **Network Audit Inspector**: Real-time inspection drawer to verify the exact payload sent to external endpoints.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **UI & Styling**: Tailwind CSS, shadcn/ui components, Lucide icons, Noto Sans Thai
- **Data Engine**: PapaParse, In-Memory Tabular SQL Engine
- **Charts**: Chart.js, react-chartjs-2
- **Testing**: Vitest

---

## Getting Started

### Prerequisites

- Node.js 18.18+ or 20+
- npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/<username>/edge-privacy-csv-analyst.git
cd edge-privacy-csv-analyst

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
npm run test
```

### Production Build

```bash
npm run build
npm run start
```

---

## Configuration

The application works out of the box with the offline heuristic SQL generator.

To use Gemini 2.5 Flash:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Click **API Key & Model** in the top navigation bar.
3. Paste your key and choose your model (`gemini-2.5-flash` or `gemini-2.5-flash-lite`).
4. The key is stored locally in your browser's `localStorage` and passed directly in request headers.

Alternatively, you can set an environment variable in `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
