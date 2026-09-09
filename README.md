# Edge Privacy CSV Analyst 🛡️📊

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Privacy](https://img.shields.io/badge/Privacy-Zero--Data%20Egress-brightgreen)](#zero-data-egress-architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **In-Browser Privacy-Preserving AI CSV Analyst**  
> วิเคราะห์ข้อมูล CSV ด้วยภาษาธรรมชาติ (Natural Language) และ SQL บนเบราว์เซอร์ 100% โดย **ข้อมูลแถวจริง (Raw Data Rows) จะไม่มีวันหลุดออกจากเครื่องผู้ใช้** รองรับการตรวจจับและคัดกรองข้อมูลส่วนบุคคล (PII) ตามมาตรฐาน **PDPA / GDPR**

---

## 🌟 จุดเด่นและภาพรวม (Overview)

เครื่องมือวิเคราะห์ข้อมูลด้วย LLM ส่วนใหญ่ในปัจจุบันมักต้องอัปโหลดไฟล์ข้อมูลทั้งหมดไปยัง Cloud Server หรือ Third-party API ซึ่งมีความเสี่ยงสูงต่อข้อมูลละเอียดอ่อน เช่น ข้อมูลลูกค้า, ประวัติคนไข้, เงินเดือน หรือรายงานทางการเงิน

**Edge Privacy CSV Analyst** แก้ปัญหานี้ด้วยสถาปัตยกรรม **Zero-Data Egress**:
1. **Local CSV Parsing & Ingestion**: อ่านและแปลงไฟล์ CSV บน Memory ของเบราว์เซอร์ด้วย PapaParse
2. **Client-Side Thai & Global PII Scanner**: ตรวจจับและมาสก์ข้อมูลระบุตัวตน (เช่น บัตรประชาชนไทย 13 หลักด้วย Modulus 11 Checksum, เบอร์โทรศัพท์, อีเมล, บัตรเครดิต) ก่อนสร้าง Metadata Schema
3. **Schema-Only Query Planning**: ส่งเฉพาะชื่อคอลัมน์และประเภทข้อมูล (Schema) ที่ถูก Anonymize แล้วไปยัง Google Gemini API (หรือใช้ Offline Rule-based Parser ในเครื่อง) เพื่อแปลงคำถามภาษาธรรมชาติเป็นคำสั่ง SQL
4. **In-Browser SQL Execution**: รันคำสั่ง SQL โดยตรงบน In-Memory SQL Engine ภายในเครื่อง ข้อมูลดิบไม่ถูกส่งผ่านเน็ต
5. **Interactive Charts & Export**: แสดงผลลัพธ์เป็นตารางและกราฟ Interactive (Bar, Pie, Line) พร้อมส่งออกเป็น CSV และ PNG คุณภาพสูง
6. **Network Audit Inspector**: มีระบบตรวจสอบ Network Payload แบบ Real-time ผู้ใช้สามารถเปิดดูได้ทันทีว่าไม่มี Data Row ใดๆ ถูกส่งออกไปภายนอก

---

## 🏗️ สถาปัตยกรรมการทำงาน (Zero-Data Egress Architecture)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Browser                                │
│                                                                         │
│  [CSV File] ──► PapaParse ──► In-Memory Tabular SQL Engine ──────────┐  │
│                      │                         ▲                     │  │
│                      ▼                         │ (Executes SQL)      │  │
│             [PII Redaction Engine]             │                     │  │
│             - Thai ID (Modulus 11)             │                     │  │
│             - Phone / Email / Credit Cards     │                     │  │
│                      │                         │                     │  │
│                      ▼                         │                     │  │
│             [Schema Extractor]                 │                     │  │
│             (Column names + Types only)        │                     │  │
└──────────────────────┼─────────────────────────┼─────────────────────┘──┘
                       │ (Schema & Question Only)│ (SQL Query String)
                       ▼                         │
            ┌───────────────────────────────────────────┐
            │          LLM SQL Generator (BYOK)         │
            │        (Gemini 2.5 Flash / Lite)          │
            │                                           │
            │       🔒 GUARANTEE: 0 Data Rows Sent      │
            └───────────────────────────────────────────┘
```

---

## ⚡ ตารางเปรียบเทียบ (Privacy Comparison)

| มิติการเปรียบเทียบ | Cloud AI Analytics ทั่วไป | Edge Privacy CSV Analyst |
| :--- | :--- | :--- |
| **การประมวลผลข้อมูล (Data Processing)** | อัปโหลดขึ้น Server ภายนอก | รันในเบราว์เซอร์ของผู้ใช้ 100% |
| **ข้อมูลที่ส่งไปยัง LLM API** | ส่งข้อมูลจริงทั้งตาราง / บรรทัด | **ส่งเฉพาะ Schema (0 แถวข้อมูล)** |
| **การตรวจสอบข้อมูลส่วนบุคคล (PII)** | ไม่มี หรือทำบนคลาวด์ | กรองบนเบราว์เซอร์ทันที (รองรับบัตรประชาชนไทย) |
| **การปฏิบัติตาม PDPA / GDPR** | ต้องทำ Data Processing Agreement (DPA) | **Zero-Risk** ข้อมูลไม่เคยออกจากเครื่อง |
| **การทำงานแบบ Offline** | ไม่สามารถทำงานได้ | **ทำงานได้** (มี Offline Rule-based SQL) |
| **การจัดเก็บ API Key** | เสี่ยงรั่วไหลหากเก็บไว้ที่ Server | **BYOK** จัดเก็บใน `localStorage` ของผู้ใช้เท่านั้น |

---

## 🚀 ฟีเจอร์หลัก (Key Features)

- 🔒 **Zero Raw Data Egress**: การันตีแถวข้อมูลดิบไม่ถูกส่งออกนอกเบราว์เซอร์
- 🇹🇭 **Smart Thai PII Redaction**:
  - เลขบัตรประชาชนไทย 13 หลัก (ตรวจสอบความถูกต้องด้วยอัลกอริทึม **Modulus 11**)
  - เบอร์โทรศัพท์ไทย (`06x`, `08x`, `09x` ทั้งแบบมีขีดและไม่มีขีด)
  - อีเมล และเลขบัตรเครดิต (Luhn Check)
- 🧠 **Dual SQL Generation Modes**:
  - **Gemini 2.5 Flash / Lite (BYOK)**: ใช้งาน Google AI Studio API Key ของตนเอง สร้าง SQL ที่ซับซ้อนได้อย่างแม่นยำ
  - **Offline Heuristic Parser**: วิเคราะห์คำถามพื้นฐาน (Aggregate, Filter, Sort, Limit) ได้ทันทีแม้ไม่มีเน็ตและไม่มี API Key
- 📊 **Dynamic Data Visualizations**: สร้างกราฟอัตโนมัติ (Bar Chart, Pie Chart, Line Chart) ผ่าน Chart.js พร้อมปุ่มดาวน์โหลดรูปภาพ High-Res PNG
- 🔍 **Real-Time Network Inspector Drawer**: ให้ผู้ใช้ตรวจสอบ Payload ที่ถูกส่งออกไปภายนอกแบบโปร่งใส 100%
- 📂 **Sample Datasets Included**: มีชุดข้อมูลจำลองให้ทดลองใช้งานได้ในคลิกเดียว:
  - 🛒 E-Commerce Transactions
  - 🏥 Hospital Patients (ตัวอย่างที่มี PII ชัดเจน)
  - 💼 HR Payroll & Employees
  - 📈 SaaS Subscription Metrics
- 🎨 **Enterprise Modern UI**: ออกแบบด้วยธีม Dark/Glassmorphism สไตล์โมเดิร์น พร้อม Typography รองรับภาษาไทยสมบูรณ์แบบ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Core Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5.7](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Data & Parsing**: [PapaParse](https://www.papaparse.com/), Edge Tabular In-Memory Engine, [@duckdb/duckdb-wasm](https://github.com/duckdb/duckdb-wasm)
- **Charts**: [Chart.js](https://www.chartjs.org/), [react-chartjs-2](https://github.com/reactchartjs/react-chartjs-2)
- **Unit Testing**: [Vitest](https://vitest.dev/)

---

## 📦 เริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)

- **Node.js**: เวอร์ชัน 18.18+ หรือ 20+
- **Package Manager**: `npm`, `pnpm`, หรือ `yarn`

### ขั้นตอนการติดตั้ง (Installation)

```bash
# 1. Clone repository
git clone https://github.com/<username>/edge-privacy-csv-analyst.git
cd edge-privacy-csv-analyst

# 2. ติดตั้ง Dependencies
npm install

# 3. รัน Development Server
npm run dev
```

เปิดเว็บเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

### คำสั่งการทดสอบ (Testing)

```bash
# รัน Unit Tests ด้วย Vitest
npm run test
```

### การ Build สำหรับ Production

```bash
# Build โปรเจกต์
npm run build

# รัน Production Server
npm run start
```

---

## ⚙️ การตั้งค่า API Key (Configuration)

ระบบสามารถใช้งานได้ทันทีโดยไม่ต้องใส่ API Key (ใช้งานในโหมด Offline Heuristic Parser)

หากต้องการความสามารถในการประมวลผลคำสั่งภาษาธรรมชาติขั้นสูงด้วย **Gemini 2.5 Flash / Lite**:
1. รับ API Key ฟรีได้จาก [Google AI Studio](https://aistudio.google.com/)
2. กดปุ่ม **API Key & Model** บริเวณแถบเมนูด้านบนของเว็บไซต์
3. กรอก API Key และเลือกรุ่นโมเดลที่ต้องการ
4. API Key จะถูกบันทึกไว้ใน `localStorage` ของเบราว์เซอร์ท่านเท่านั้น ไม่มีการส่งไปเก็บที่เซิร์ฟเวอร์ใดๆ

หรือจะตั้งค่าผ่านไฟล์ `.env.local` ในเครื่องสำหรับ Local Development:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🧪 การทดสอบความปลอดภัย (Security Verification)

ท่านสามารถพิสูจน์การทำงานของระบบได้ด้วยตนเอง:
1. เปิด **Developer Tools** ในเบราว์เซอร์ (`F12` -> แถบ `Network`)
2. ทำการอัปโหลดไฟล์ CSV และยิงคำถาม
3. ตรวจสอบ Request ไปยัง `/api/generate-sql`
4. จะพบว่าข้อมูลใน Request Payload มีเพียง `question` และ `anonymizedSchema` โดยที่ **ไม่มีข้อมูลในแถว (Data Rows) ถูกส่งออกไปแม้แต่แถวเดียว**

---

## 📄 ใบอนุญาต (License)

โปรเจกต์นี้เผยแพร่ภายใต้สัญญาอนุญาต [MIT License](LICENSE)
