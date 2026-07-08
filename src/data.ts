export const HERO_STATS = [
  { label: "ANA Titer",     value: "1:1280",  sub: "speckled pattern",  trend: "↔ stable", status: "bad"  as const, spark: [] },
  { label: "Hemoglobin",    value: "11.8",    sub: "g/dL · near limit", trend: "↓ −1.3",   status: "warn" as const, spark: [12.6,13.1,12.4,12.9,12.0,11.8] },
  { label: "Complement C4", value: "11",      sub: "mg/dL · low × 3",   trend: "↓ trend",  status: "bad"  as const, spark: [18,12,11,11] },
  { label: "LDL Particles", value: "1,262",   sub: "nmol/L",            trend: "↑ +57%",   status: "bad"  as const, spark: [802,1262] },
  { label: "Inflammation",  value: "0.2",     sub: "hs-CRP mg/L",       trend: "↔ stable", status: "ok"   as const, spark: [0.4,0.2,0.2,0.2,0.2] },
];

export const SYSTEMS = [
  {
    id: "autoimmune",
    label: "Autoimmune",
    alert: "5 abnormal",
    alertColor: "red" as const,
    markers: [
      { label: "ANA titer",     value: "1:1280",  trend: "↔",  status: "bad"  as const, note: "Strongly positive. Speckled pattern AC-2,4,5,29. Stable across all draws." },
      { label: "Anti-SSB/La",   value: "Positive",trend: "—",  status: "bad"  as const, note: "1.1 AI (Sep 2025). Sjögren's/SLE/neonatal lupus risk. Critical given IVF history." },
      { label: "C3 complement", value: "75",      trend: "↓",  status: "bad"  as const, note: "79→78→75 mg/dL. Below ref 83–193 at all three draws." },
      { label: "C4 complement", value: "11",      trend: "↔",  status: "bad"  as const, note: "12→11→11 mg/dL. Below ref 15–57. Stuck at 11." },
      { label: "β2-GPI × 3",   value: "Elevated",trend: "↓",  status: "bad"  as const, note: "IgG 32.6, IgM 32.1, IgA 30.9 U/mL. All above 20 threshold." },
      { label: "Anti-CL IgM",  value: "17.7",    trend: "↓",  status: "warn" as const, note: "Was 31.3 (positive) Oct 2025; now below 20 threshold. Monitor." },
      { label: "dRVVT",        value: "41 sec",  trend: "↑",  status: "warn" as const, note: "Lupus AC rising (28→41 sec). Cutoff 45 sec." },
      { label: "Anti-dsDNA",   value: "<1",      trend: "↓",  status: "ok"   as const, note: "Was indeterminate (2 IU/mL); now negative. Reduces nephritis concern." },
      { label: "hs-CRP",       value: "0.2",     trend: "↔",  status: "ok"   as const, note: "Optimal (<1.0 mg/L). Stable." },
    ],
  },
  {
    id: "cardiovascular",
    label: "Cardiovascular",
    alert: "3 above optimal",
    alertColor: "amber" as const,
    markers: [
      { label: "LDL-P total",  value: "1,262",  trend: "↑",  status: "bad"  as const, note: "802→1,262 nmol/L. Above optimal 1,138." },
      { label: "LDL Medium",   value: "329",    trend: "↑",  status: "bad"  as const, note: "169→329 nmol/L. Above optimal <215 and reference range." },
      { label: "LDL Small",    value: "175",    trend: "↑",  status: "warn" as const, note: "133→175 nmol/L. Above optimal <142." },
      { label: "HDL Large",    value: "8,935",  trend: "↑",  status: "ok"   as const, note: "4,682→8,935 nmol/L. Now in optimal range >6,729." },
      { label: "LDL-C",        value: "79",     trend: "↑",  status: "ok"   as const, note: "Standard LDL still normal (<100 mg/dL)." },
      { label: "Triglycerides",value: "82",     trend: "↓",  status: "ok"   as const, note: "139→82 mg/dL. Improved." },
    ],
  },
  {
    id: "blood",
    label: "Blood",
    alert: "2 declining",
    alertColor: "amber" as const,
    markers: [
      { label: "Hemoglobin",  value: "11.8",  trend: "↓",  status: "warn" as const, note: "13.1→11.8 g/dL over 16 months. Iron stores normal." },
      { label: "Hematocrit",  value: "36.3%", trend: "↓",  status: "warn" as const, note: "40.1→36.3%. In range but declining." },
      { label: "Platelets",   value: "246",   trend: "↓",  status: "ok"   as const, note: "304→246 K/uL. Well above lower ref 150." },
      { label: "WBC",         value: "4.0",   trend: "↔",  status: "ok"   as const, note: "Stable. No suppression on hydroxychloroquine." },
      { label: "Iron/Ferritin",value: "ok",   trend: "↔",  status: "ok"   as const, note: "Iron 64, Ferritin 40, Sat 23%. Normal." },
    ],
  },
  {
    id: "hormones",
    label: "Hormones",
    alert: "3 watch",
    alertColor: "amber" as const,
    markers: [
      { label: "SHBG",         value: "151",   trend: "↓",  status: "warn" as const, note: "179→146→151 nmol/L. Above ref 17–124." },
      { label: "Pregnenolone", value: "17",    trend: "—",  status: "warn" as const, note: "Below ref 22–237. Single draw. Retest." },
      { label: "Leptin",       value: "1.4",   trend: "—",  status: "warn" as const, note: "Below female ref 4.7–23.7 ng/mL. BMI 17.75." },
      { label: "AMH",          value: "1.53",  trend: "↔",  status: "ok"   as const, note: "Normal ovarian reserve (ref 0.18–5.68)." },
      { label: "TSH",          value: "1.23",  trend: "↔",  status: "ok"   as const, note: "Was 0.48 (borderline low) May 2024. Now normal." },
    ],
  },
  {
    id: "metabolic",
    label: "Metabolic",
    alert: "mostly optimal",
    alertColor: "green" as const,
    markers: [
      { label: "eGFR",         value: "117",   trend: "↑",  status: "ok"   as const, note: "109→117 mL/min. No kidney injury." },
      { label: "HbA1c",        value: "5.4%",  trend: "↑",  status: "ok"   as const, note: "5.3→5.4%. Below prediabetes 5.7%." },
      { label: "Vitamin B12",  value: "642",   trend: "↓",  status: "warn" as const, note: "1,000→726→642 pg/mL. Declining. Still in range." },
      { label: "Vitamin D",    value: "52",    trend: "↔",  status: "ok"   as const, note: "52 ng/mL. Optimal (30–100)." },
      { label: "Folate",       value: "19.8",  trend: "↑",  status: "ok"   as const, note: "12.7→19.8 ng/mL. Rising." },
      { label: "ALT / ALP",    value: "15/33", trend: "↔",  status: "ok"   as const, note: "Normal. No liver injury from hydroxychloroquine." },
    ],
  },
] as const;

export type MarkerStatus = "ok" | "warn" | "bad" | "info";
