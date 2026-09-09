export interface SampleDatasetOption {
  id: string;
  name: string;
  category: string;
  fileName: string;
  description: string;
  badge: string;
  csv: string;
  suggestedQueries: string[];
}

export const SAMPLE_DATASETS: SampleDatasetOption[] = [
  {
    id: "sales",
    name: "Enterprise Sales & E-Commerce",
    category: "Retail & B2B",
    fileName: "enterprise_sales_q1_2026.csv",
    description: "ข้อมูลธุรกรรมการขาย คอลัมน์เลขบัตรประชาชน และเบอร์โทรลูกค้าไทย",
    badge: "PDPA Thai PII + Sales",
    csv: `Transaction_ID,Customer_Name,Citizen_ID,Mobile_Phone,Customer_Email,Region,Product_Category,Units_Sold,Unit_Price,Total_Revenue,Payment_Method,Transaction_Date
TXN-1001,Somchai Prasert,1103701234568,0812345678,somchai.p@example.com,Bangkok,Enterprise Cloud,12,1500,18000,Corporate Card,2026-01-15
TXN-1002,Kanya Wongsuwan,3400500987654,0923456789,kanya.w@workmail.co.th,Chiang Mai,AI Automation,5,8500,42500,Bank Transfer,2026-01-18
TXN-1003,Nattapong Srisuk,1509900876543,0898765432,nattapong.s@gmail.com,Phuket,Security Audit,2,25000,50000,Bank Transfer,2026-02-02
TXN-1004,Pimchanok Decha,3101201928374,0641122334,pimchanok.d@outlook.com,Bangkok,AI Automation,8,8500,68000,Corporate Card,2026-02-10
TXN-1005,Anan Ratanaporn,1100400392817,0859988776,anan.r@company.com,Khon Kaen,Enterprise Cloud,20,1500,30000,Bank Transfer,2026-02-14
TXN-1006,Siriporn Boonmee,3501400281928,0912233445,siriporn.b@email.co.th,Bangkok,Edge Vision Node,4,12000,48000,Corporate Card,2026-02-28
TXN-1007,Thanakorn Chaiya,1209700481920,0887766554,thanakorn.c@domain.com,Chonburi,Security Audit,3,25000,75000,Bank Transfer,2026-03-01
TXN-1008,Wipada Suksan,3100500671829,0823344556,wipada.s@workplace.com,Bangkok,AI Automation,15,8500,127500,Bank Transfer,2026-03-05
TXN-1009,Chatchai Somboon,1409900381928,0619988771,chatchai.s@tech.co.th,Chiang Mai,Enterprise Cloud,30,1500,45000,Corporate Card,2026-03-12
TXN-1010,Areeya Phonngam,3102000491827,0864455667,areeya.p@corp.th,Khon Kaen,Edge Vision Node,6,12000,72000,Bank Transfer,2026-03-15
TXN-1011,Kittisak Meesuk,1103701234568,0812345678,kittisak.m@example.com,Bangkok,Security Audit,1,25000,25000,Corporate Card,2026-03-20
TXN-1012,Warunee Jaroen,3300100492817,0945566778,warunee.j@cloud.co.th,Phuket,Enterprise Cloud,10,1500,15000,Bank Transfer,2026-03-25
`,
    suggestedQueries: [
      "สรุปยอดขายรวม (Total_Revenue) แยกตามหมวดหมู่สินค้า (Product_Category)",
      "แสดง 3 ภูมิภาค (Region) ที่มียอดขายรวมสูงสุด พร้อมจำนวนรายการ",
      "ยอดขายเฉลี่ยแยกตามวิธีการชำระเงิน (Payment_Method)",
      "มีลูกค้ากี่รายและยอดขายเท่าไรในกรุงเทพฯ (Bangkok)",
    ],
  },
  {
    id: "healthcare",
    name: "Hospital Patient Care & PDPA",
    category: "Healthcare & Medical",
    fileName: "hospital_patient_records.csv",
    description: "ข้อมูลประวัติผู้ป่วย ค่ารักษาพยาบาล โรคที่วินิจฉัย และเลขบัตร ปชช. ผู้ป่วย",
    badge: "Sensitive Medical PII",
    csv: `Patient_ID,Full_Name,Citizen_ID,Phone_Number,Hospital_Branch,Diagnosis,Treatment_Cost,Length_Of_Stay_Days,Insurance_Provider,Admission_Date
HN-50101,Chalermchai Kaew,1103701234568,0814455667,Siriraj Hospital,Type 2 Diabetes,18500,3,AIA Thailand,2026-01-05
HN-50102,Malinee Prasert,3400500987654,0921122334,Chulalongkorn Hospital,Hypertension,9200,1,Allianz Ayudhya,2026-01-12
HN-50103,Bordin Srivilai,1509900876543,0893344556,Bangkok Hospital,Cardiac Arrhythmia,84000,5,Muang Thai Life,2026-01-20
HN-50104,Nalinee Saetang,3101201928374,0649988771,Chiang Mai Ram,Acute Bronchitis,14200,2,AIA Thailand,2026-02-01
HN-50105,Pravit Udomsuk,1100400392817,0852233445,Siriraj Hospital,Dengue Fever,26500,4,Social Security,2026-02-08
HN-50106,Supaporn Nilkamol,3501400281928,0918877665,Bangkok Hospital,Orthopedic Fracture,65000,4,FWD Insurance,2026-02-15
HN-50107,Tawatchai Chantho,1209700481920,0881122334,Phuket International,Dengue Fever,32000,5,Allianz Ayudhya,2026-02-22
HN-50108,Rattana Phromsri,3100500671829,0827766554,Chulalongkorn Hospital,Type 2 Diabetes,16800,2,Social Security,2026-03-01
HN-50109,Narongrit Boonsoong,1409900381928,0614455667,Siriraj Hospital,Hypertension,8500,1,AIA Thailand,2026-03-09
HN-50110,Chanida Ruengrit,3102000491827,0869988776,Bangkok Hospital,Cardiac Arrhythmia,95000,6,Bupa Global,2026-03-14
HN-50111,Boonsong Wannachat,3300100492817,0942233445,Chiang Mai Ram,Acute Bronchitis,13500,2,Social Security,2026-03-22
`,
    suggestedQueries: [
      "สรุปค่ารักษาพยาบาลรวม (Treatment_Cost) แยกตามกลุ่มโรค (Diagnosis)",
      "ค่ารักษาเฉลี่ยและวันพักฟื้นเฉลี่ย (Length_Of_Stay_Days) ในแต่ละโรงพยาบาล (Hospital_Branch)",
      "นับจำนวนผู้ป่วยแยกตามบริษัทประกัน (Insurance_Provider)",
      "แสดง 3 อันดับโรคที่ค่ารักษาเฉลี่ยสูงสุด",
    ],
  },
  {
    id: "payroll",
    name: "HR Payroll & Compensation",
    category: "Internal HR Analytics",
    fileName: "hr_payroll_confidential.csv",
    description: "ฐานข้อมูลเงินเดือนพนักงาน โบนัสประจำปี และการประเมินผลงานลับขององค์กร",
    badge: "Confidential Payroll",
    csv: `Employee_ID,Employee_Name,Citizen_ID,Personal_Email,Department,Job_Level,Monthly_Salary,Annual_Bonus,Performance_Score,Hire_Date
EMP-0101,Teerawat Kongkaew,1103701234568,teerawat.k@gmail.com,Engineering,Senior,85000,170000,4.8,2021-03-15
EMP-0102,Sasithorn Chotima,3400500987654,sasithorn.c@hotmail.com,Product & Design,Lead,110000,250000,4.9,2020-07-01
EMP-0103,Krisada Theppan,1509900876543,krisada.t@yahoo.com,Sales & BD,Mid-Level,55000,140000,4.2,2023-01-10
EMP-0104,Kannikar Somchai,3101201928374,kannikar.s@gmail.com,Engineering,Mid-Level,65000,130000,4.5,2022-09-18
EMP-0105,Porntep Srikul,1100400392817,porntep.s@live.com,Customer Support,Senior,48000,72000,4.1,2021-11-20
EMP-0106,Rujira Suwannarat,3501400281928,rujira.s@gmail.com,Human Resources,Lead,95000,190000,4.7,2019-05-12
EMP-0107,Watchara Boonma,1209700481920,watchara.b@outlook.com,Finance & Accounting,Senior,78000,156000,4.6,2021-02-01
EMP-0108,Nutcha Wongkam,3100500671829,nutcha.w@gmail.com,Engineering,Junior,42000,63000,4.0,2024-06-15
EMP-0109,Danai Petchdee,1409900381928,danai.p@gmail.com,Sales & BD,Lead,105000,320000,4.9,2018-10-05
EMP-0110,Benjamart Raksasri,3102000491827,benjamart.r@yahoo.com,Product & Design,Mid-Level,68000,136000,4.4,2023-04-10
EMP-0111,Surachai Thongdee,3300100492817,surachai.t@gmail.com,Customer Support,Junior,32000,48000,3.9,2024-11-01
`,
    suggestedQueries: [
      "สรุปเงินเดือนเฉลี่ย (Monthly_Salary) แยกตามแผนก (Department)",
      "นับจำนวนพนักงานในแต่ละระดับตำแหน่ง (Job_Level)",
      "โบนัสรวม (Annual_Bonus) และเงินเดือนรวมแยกตามแผนก",
      "แผนกใดมีคะแนนประเมินเฉลี่ย (Performance_Score) สูงสุด",
    ],
  },
  {
    id: "saas",
    name: "SaaS Subscriptions & MRR Growth",
    category: "B2B Recurring Revenue",
    fileName: "saas_subscription_metrics.csv",
    description: "ข้อมูลรายได้ประจำ MRR ความเสี่ยงการยกเลิก (Churn Risk) และสัญญาบริการ B2B",
    badge: "B2B SaaS Metrics",
    csv: `Account_ID,Company_Name,Billing_Contact,Contact_Email,Subscription_Tier,Monthly_Recurring_Revenue,User_Licenses,Churn_Risk,Region,Renewal_Date
SUB-701,Siam FinTech Corp,Panya Wong,panya@siamfintech.io,Enterprise,45000,250,Low,Bangkok,2026-12-31
SUB-702,Lanna Logistics,Suda Chai,suda@lannalogistics.co.th,Professional,18500,80,Low,Chiang Mai,2026-08-15
SUB-703,Andaman Hospitality,Vichai Ratan,vichai@andamanresort.com,Starter,6500,20,High,Phuket,2026-04-30
SUB-704,Bangkok AI Labs,Chirawat P,chira@bangkokai.dev,Enterprise,62000,400,Low,Bangkok,2026-11-20
SUB-705,Isan Agrotech,Manop Suk,manop@isanagro.co.th,Growth,12000,50,Medium,Khon Kaen,2026-06-10
SUB-706,Eastern Auto Parts,Thawatchai K,thawat@easternparts.com,Professional,22000,100,Low,Chonburi,2026-09-01
SUB-707,Chao Phraya Media,Wannisa B,wannisa@cpmedia.co.th,Growth,14500,65,High,Bangkok,2026-05-15
SUB-708,Phuket Dive Hub,Artit Meesuk,artit@phuketdive.com,Starter,5500,15,Critical,Phuket,2026-03-31
SUB-709,Thai Healthtech Ltd,Darika N,darika@thaihealth.tech,Enterprise,55000,320,Low,Bangkok,2026-10-18
SUB-710,Northern Retailers,Somporn W,somporn@northretail.com,Professional,19500,90,Medium,Chiang Mai,2026-07-25
`,
    suggestedQueries: [
      "สรุปยอด MRR รวม (Monthly_Recurring_Revenue) แยกตามแพ็กเกจ (Subscription_Tier)",
      "นับจำนวนลูกค้าตามระดับความเสี่ยงการยกเลิก (Churn_Risk)",
      "จำนวนไลเซนส์ผู้ใช้รวม (User_Licenses) แยกตามภูมิภาค (Region)",
      "แพ็กเกจใดมี MRR เฉลี่ยสูงสุด พร้อมแสดงจำนวนบัญชี",
    ],
  },
];

// Default backward compatibility
export const SAMPLE_ENTERPRISE_SALES_CSV = SAMPLE_DATASETS[0].csv;
export const SAMPLE_QUERIES = SAMPLE_DATASETS[0].suggestedQueries;
