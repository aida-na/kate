import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { Sparkline } from "./components/Sparkline";
import { HERO_STATS, SYSTEMS } from "./data";
import type { MarkerStatus } from "./data";

// ─── Responsive hook ─────────────────────────────────────────────────────────

function useIsMobile(bp = 640) {
  const [mobile, setMobile] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < bp);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return mobile;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <span
        ref={ref}
        onMouseEnter={() => setRect(ref.current?.getBoundingClientRect() ?? null)}
        onMouseLeave={() => setRect(null)}
        style={{ fontSize: 10, color: "var(--faint)", cursor: "help", padding: "0 3px", userSelect: "none", lineHeight: 1 }}
      >ⓘ</span>
      {rect && createPortal(
        <div style={{
          position: "fixed",
          left: Math.min(rect.left + rect.width / 2, window.innerWidth - 276),
          top: rect.top - 8,
          transform: "translateY(-100%)",
          background: "#1e2a1a", color: "#eef0eb",
          padding: "10px 13px", borderRadius: 8, fontSize: 11.5,
          width: 268, zIndex: 9999, lineHeight: 1.65,
          pointerEvents: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        }}>
          {text}
          <div style={{
            position: "absolute", top: "100%", left: Math.min(rect.left + rect.width / 2, window.innerWidth - 276) > window.innerWidth - 280 ? "auto" : rect.left < 268 ? 10 : "50%",
            right: Math.min(rect.left + rect.width / 2, window.innerWidth - 276) > window.innerWidth - 280 ? 8 : "auto",
            transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid #1e2a1a",
          }} />
        </div>,
        document.body
      )}
    </span>
  );
}

// ─── Stat card expand data ────────────────────────────────────────────────────

const STAT_DETAILS: Record<string, {
  meaning: string;
  reference: string;
  history: { label: string; value: string }[];
  chartData?: { t: string; v: number }[];
  refLine?: { value: number; label: string; color: string };
}> = {
  "ANA Titer": {
    meaning: "The antinuclear antibody (ANA) titer measures how strongly your immune system is targeting your own cell nuclei. A titer of 1:1280 is 32× above the negative cutoff (<1:40). The speckled pattern (AC-2,4,5,29) is associated with SLE, MCTD, Sjögren's syndrome, and scleroderma overlap. Stable values mean the process isn't escalating — but it remains persistently active. This is the starting point for all the other autoimmune findings.",
    reference: "Negative: <1:40 · Low positive: 1:40–1:160 · High: ≥1:320",
    history: [
      { label: "Jun 2025 (Quest)", value: "Positive" },
      { label: "Sep 2025 (BILH)", value: "1:1280 · Speckled" },
      { label: "Mar 2026 (BILH)", value: "1:1280 · Speckled" },
      { label: "Apr 2026 (Quest)", value: "Positive" },
    ],
  },
  "Hemoglobin": {
    meaning: "Hemoglobin is the protein in red blood cells that carries oxygen. A 1.3 g/dL decline over 16 months — now approaching the lower reference limit — with normal iron stores points toward anemia of chronic disease rather than iron deficiency. Active autoimmune conditions and hydroxychloroquine can both reduce red blood cell production or lifespan. The trajectory matters more than any single value.",
    reference: "Normal female: 11.7–15.5 g/dL (Quest) · 12–16 g/dL (BILH)",
    history: [
      { label: "Jun 2024",       value: "12.6 g/dL" },
      { label: "Dec 2024",       value: "13.1 g/dL  ← peak" },
      { label: "Jun 2025 (Q)",   value: "12.4 g/dL" },
      { label: "Aug 2025 (BILH)",value: "12.9 g/dL" },
      { label: "Mar 2026 (BILH)",value: "12.0 g/dL" },
      { label: "Apr 2026 (Q)",   value: "11.8 g/dL" },
    ],
    chartData: [
      { t:"Jun '24",v:12.6},{t:"Dec '24",v:13.1},{t:"Jun '25",v:12.4},
      { t:"Aug '25",v:12.9},{t:"Mar '26",v:12.0},{t:"Apr '26",v:11.8},
    ],
    refLine: { value: 11.7, label: "Lower ref", color: "var(--red)" },
  },
  "Complement C4": {
    meaning: "C4 is a complement protein consumed when immune complexes are formed and cleared. Three consecutive draws below the reference range — with no rise in CRP — is the classic 'silent lupus' pattern: immune complexes are forming and consuming complement, but the liver's acute-phase response stays quiet (likely blunted by hydroxychloroquine). C4 is more specific to lupus activity than C3. The value stuck at 11 mg/dL suggests the process is ongoing.",
    reference: "Normal: 15–57 mg/dL (BILH)",
    history: [
      { label: "May 2024 (est.)", value: "18 mg/dL  ← in range" },
      { label: "Sep 2025 (BILH)", value: "12 mg/dL  ← below range" },
      { label: "Oct 2025 (BILH)", value: "11 mg/dL" },
      { label: "Mar 2026 (BILH)", value: "11 mg/dL" },
    ],
    chartData: [
      { t:"May '24",v:18},{t:"Sep '25",v:12},{t:"Oct '25",v:11},{t:"Mar '26",v:11},
    ],
    refLine: { value: 15, label: "Lower ref", color: "var(--red)" },
  },
  "LDL Particles": {
    meaning: "LDL particle number (LDL-P) counts total LDL particles — a more precise cardiovascular risk marker than standard LDL cholesterol. More particles create more chances for oxidation and arterial wall penetration. The 57% rise to 1,262 nmol/L, with increasing small and medium dense LDL fractions, suggests cytokine-driven hepatic lipid remodeling from chronic immune activation — an underrecognized mechanism that can raise particle risk even with normal BMI and blood sugar.",
    reference: "Optimal: <1,138 nmol/L · Borderline: 1,138–1,339 · High: >1,339",
    history: [
      { label: "Jul 2025", value: "802 nmol/L  ← optimal" },
      { label: "Apr 2026", value: "1,262 nmol/L  ← above optimal" },
    ],
    chartData: [
      { t:"Jul '25",v:802},{t:"Apr '26",v:1262},
    ],
    refLine: { value: 1138, label: "Optimal cutoff", color: "var(--amber)" },
  },
  "Inflammation": {
    meaning: "High-sensitivity CRP (hs-CRP) is secreted by the liver in response to inflammation. At 0.2 mg/L it is optimally low. Critically, hs-CRP remaining low despite high-titer ANA, elevated antiphospholipid antibodies, and low complement is a known paradox in SLE — immune complex disease can consume complement and drive autoantibody production without triggering the classic acute-phase response. This means CRP is not a reliable measure of SLE disease activity.",
    reference: "Optimal: <1.0 mg/L · Average risk: 1–3 · Elevated: >3",
    history: [
      { label: "May 2024", value: "0.4 mg/L" },
      { label: "Jun 2025 (Quest)", value: "0.2 mg/L" },
      { label: "Apr 2026 (Quest)", value: "0.2 mg/L" },
    ],
  },
};

// ─── Range detail data ────────────────────────────────────────────────────────

const RANGE_DETAILS = {
  "In range": [
    { label: "Anti-dsDNA",      value: "<1 IU/mL",    system: "Autoimmune",      tooltip: "Double-stranded DNA antibody — now negative after being indeterminate. Reduces concern for active lupus nephritis." },
    { label: "hs-CRP",          value: "0.2 mg/L",    system: "Autoimmune",      tooltip: "Ultra-low inflammation marker. Stable. Importantly low despite autoimmune activity." },
    { label: "HDL Large",       value: "8,935 nmol/L", system: "Cardiovascular", tooltip: "Protective HDL subfraction nearly doubled. Now well above optimal threshold of 6,729 nmol/L." },
    { label: "LDL-C",           value: "79 mg/dL",    system: "Cardiovascular",  tooltip: "Standard calculated LDL cholesterol. Normal (<100). Note: advanced LDL-P is elevated despite this." },
    { label: "Triglycerides",   value: "82 mg/dL",    system: "Cardiovascular",  tooltip: "Improved substantially from 139 mg/dL. Now well below the 150 mg/dL upper reference." },
    { label: "WBC",             value: "4.0 K/uL",    system: "Blood",           tooltip: "White blood cell count stable. No bone marrow suppression from hydroxychloroquine." },
    { label: "Platelets",       value: "246 K/uL",    system: "Blood",           tooltip: "Slowly declining (304→246) but well above the lower ref of 150 K/uL." },
    { label: "Iron / Ferritin", value: "64 / 40",     system: "Blood",           tooltip: "Iron stores normal. Rules out iron deficiency as the cause of declining hemoglobin." },
    { label: "AMH",             value: "1.53 ng/mL",  system: "Hormones",        tooltip: "Anti-Müllerian hormone — a marker of ovarian reserve. Normal (0.18–5.68). Reassuring given IVF history." },
    { label: "TSH",             value: "1.23 uIU/mL", system: "Hormones",        tooltip: "Thyroid stimulating hormone. Now stably normal. Was borderline low (0.48) in May 2024, possibly IVF-related." },
    { label: "eGFR",            value: "117 mL/min",  system: "Metabolic",       tooltip: "Kidney filtration rate — excellent and improving. No evidence of autoimmune kidney damage." },
    { label: "HbA1c",           value: "5.4%",        system: "Metabolic",       tooltip: "3-month blood sugar average. Well below prediabetes threshold of 5.7%. Mild upward trend." },
    { label: "Vitamin D",       value: "52 ng/mL",    system: "Metabolic",       tooltip: "Optimal range 30–100 ng/mL. Important for immune regulation and bone health." },
    { label: "Folate",          value: "19.8 ng/mL",  system: "Metabolic",       tooltip: "Rising trend (12.7→19.8). Possibly supplementing. Essential for cell division and B12 cycle." },
    { label: "ALT / ALP",       value: "15 / 33 U/L", system: "Metabolic",       tooltip: "Liver enzymes stable and normal. No drug-induced liver injury from hydroxychloroquine." },
    { label: "Omega-3 Index",   value: "6.8%",        system: "Metabolic",       tooltip: "EPA+DPA+DHA index above the optimal 5.4% threshold. Supports cardiovascular and anti-inflammatory health." },
    { label: "Homocysteine",    value: "7.5 umol/L",  system: "Metabolic",       tooltip: "Normal (<11 umol/L). Rules out B12/folate cycle dysfunction as a cardiovascular risk factor." },
    { label: "Creatinine",      value: "0.64 mg/dL",  system: "Metabolic",       tooltip: "Kidney waste product. Stable across all draws. No signs of kidney injury." },
  ],
  "Borderline": [
    { label: "Anti-CL IgM",    value: "17.7 U/mL",  system: "Autoimmune",      tooltip: "Was 31.3 (positive) in Oct 2025. Now just below the 20 U/mL detection threshold. Still needs monitoring at 12-week intervals per APS guidelines." },
    { label: "dRVVT",          value: "41 sec",      system: "Autoimmune",      tooltip: "Lupus anticoagulant screening test. Rising from 28→41 sec (cutoff 45). Not positive yet, but trending up." },
    { label: "ESR",            value: "25 mm/hr",    system: "Autoimmune",      tooltip: "Erythrocyte sedimentation rate — a non-specific inflammation marker. Rising (18→25) but still within normal range (<36)." },
    { label: "LDL Small",      value: "175 nmol/L",  system: "Cardiovascular",  tooltip: "Small dense LDL particles — more atherogenic than large LDL. Above optimal threshold of <142 nmol/L." },
    { label: "Hemoglobin",     value: "11.8 g/dL",   system: "Blood",           tooltip: "Declining 13.1→11.8 over 16 months. Now 0.1 above the lower reference limit. Iron stores normal." },
    { label: "Hematocrit",     value: "36.3%",       system: "Blood",           tooltip: "The percentage of blood volume that is red blood cells. Declining in parallel with hemoglobin." },
    { label: "SHBG",           value: "151 nmol/L",  system: "Hormones",        tooltip: "Sex hormone binding globulin. Persistently above reference (17–124). Limits free estrogen and testosterone availability. Declining slowly." },
    { label: "Pregnenolone",   value: "17 ng/dL",    system: "Hormones",        tooltip: "Master steroid hormone precursor for cortisol, DHEA, and sex hormones. Below ref (22–237). Single draw — worth retesting." },
    { label: "Leptin",         value: "1.4 ng/mL",   system: "Hormones",        tooltip: "Satiety hormone made by fat cells. Below female lean ref (4.7–23.7). Correlates with BMI 17.75. Low leptin can affect energy, immune regulation, and hormone production." },
    { label: "Vitamin B12",    value: "642 pg/mL",   system: "Metabolic",       tooltip: "Declining from 1,000→726→642 pg/mL over 15 months. Still within range (239–931) but trajectory is concerning. Important for nerve function and red blood cell production." },
  ],
  "Out of range": [
    { label: "ANA Titer",      value: "1:1280",      system: "Autoimmune",      tooltip: "32× above the negative cutoff of 1:40. Speckled pattern. Stable but persistently highly elevated across all draws." },
    { label: "Anti-SSB/La",    value: "Positive",    system: "Autoimmune",      tooltip: "1.1 AI (positive, Sep 2025). Associated with Sjögren's, SLE, and neonatal lupus heart block in offspring. Critical given IVF history." },
    { label: "C3 Complement",  value: "75 mg/dL",    system: "Autoimmune",      tooltip: "Below reference (83–193) at all three draws. Slowly declining. Indicates ongoing immune complex consumption." },
    { label: "C4 Complement",  value: "11 mg/dL",    system: "Autoimmune",      tooltip: "Below reference (15–57) at all three draws. Stuck at 11. More specific to lupus than C3." },
    { label: "β2-GPI IgG",     value: "32.6 U/mL",  system: "Autoimmune",      tooltip: "Stable elevated (32.7→32.6). Above 20 U/mL threshold. IgG isotype carries the highest thrombotic risk in APS." },
    { label: "β2-GPI IgM",     value: "32.1 U/mL",  system: "Autoimmune",      tooltip: "Declining from 51.6→32.1 but still above threshold. May reflect hydroxychloroquine effect on antibody production." },
    { label: "β2-GPI IgA",     value: "30.9 U/mL",  system: "Autoimmune",      tooltip: "Stable elevated (32.9→30.9). Above threshold. IgA isotype is least studied but contributes to overall APS risk profile." },
    { label: "LDL-P Total",    value: "1,262 nmol/L",system: "Cardiovascular",  tooltip: "802→1,262 nmol/L (+57%). Above the optimal threshold of 1,138. Discordant from normal standard LDL-C — particle count is the better predictor." },
    { label: "LDL Medium",     value: "329 nmol/L",  system: "Cardiovascular",  tooltip: "169→329 nmol/L (+95%). Above both the optimal threshold (<215) and reference range. Medium dense LDL is highly atherogenic." },
  ],
} as const;

type RangeKey = keyof typeof RANGE_DETAILS;

// ─── Chart descriptions ────────────────────────────────────────────────────────

const CHART_DESC = {
  hemoglobin: "Consistent 1.3 g/dL decline over 16 months with normal iron stores — likely autoimmune chronic disease anemia.",
  complement: "Below reference at every draw since Sep 2025 without rising CRP — classic silent lupus immune complex activity.",
  antibodies: "All 3 isotypes above threshold at two draws ≥12 weeks apart — meets preliminary APS classification criteria.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<MarkerStatus | "neutral", string> = {
  ok:      "var(--green)",
  warn:    "var(--amber)",
  bad:     "var(--red)",
  info:    "var(--blue)",
  neutral: "var(--faint)",
};

function StatusDot({ s, size = 7 }: { s: MarkerStatus; size?: number }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      borderRadius: "50%", background: STATUS_COLOR[s], flexShrink: 0,
    }} />
  );
}

function SegBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ background: "#e8ebe4", borderRadius: 99, height: 5, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width .4s ease" }} />
    </div>
  );
}

function ChartDesc({ text }: { text: string }) {
  return (
    <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--muted)", lineHeight: 1.65, fontStyle: "italic" }}>
      {text}
    </p>
  );
}

type TabId = "overview" | "recs" | "lifestyle" | "trends" | "markers";

// ─── System accordion ─────────────────────────────────────────────────────────

const SYS_COLOR: Record<string, { accent: string; bg: string; border: string }> = {
  red:   { accent: "var(--red)",   bg: "#fdf0f0", border: "#f5c0b8" },
  amber: { accent: "var(--amber)", bg: "#fdf8ee", border: "#f0d89a" },
  green: { accent: "var(--green)", bg: "#f2f8f2", border: "#bde0be" },
};

function SystemAccordion() {
  const [open, setOpen] = useState<Record<string, boolean>>({ autoimmune: true });
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {SYSTEMS.map((sys) => {
        const { accent, bg, border } = SYS_COLOR[sys.alertColor];
        const counts = { bad: 0, warn: 0, ok: 0 };
        for (const mk of sys.markers) counts[mk.status as "bad" | "warn" | "ok"]++;
        const isOpen = !!open[sys.id];
        return (
          <div key={sys.id} style={{
            background: isOpen ? bg : "var(--surface)",
            border: `1px solid ${isOpen ? border : "var(--border)"}`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: 8, overflow: "hidden",
            transition: "background .15s, border-color .15s",
          }}>
            <button onClick={() => toggle(sys.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ fontSize: 11, color: accent, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block", flexShrink: 0 }}>›</span>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: "var(--text)" }}>{sys.label}</span>
              {/* Dot counts */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {counts.bad  > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--red)"   }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)",   flexShrink: 0 }} />{counts.bad}</span>}
                {counts.warn > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--amber)" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)", flexShrink: 0 }} />{counts.warn}</span>}
                {counts.ok   > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--green)" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />{counts.ok}</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: accent, marginLeft: 6, flexShrink: 0 }}>{sys.alert}</span>
            </button>

            {isOpen && (
              <div style={{ padding: "4px 14px 12px 30px", borderTop: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 7 }}>
                {sys.markers.map(({ label, value, trend, status, note }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusDot s={status} />
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                    <InfoTooltip text={note} />
                    <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{value}</span>
                    <span style={{ fontSize: 11, color: STATUS_COLOR[status], flexShrink: 0, width: 22, textAlign: "right" }}>{trend}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const m = useIsMobile();

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--sage)", borderBottom: "1px solid var(--border)",
        padding: m ? "10px 14px 0" : "12px 24px 0",
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: m ? 14 : 15, color: "var(--text)" }}>Ekaterina Tyshchenko</div>
            <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: m ? "normal" : "nowrap" }}>
              {m ? "Apr 2024–Apr 2026 · Quest + Lahey BILH" : "Apr 2024 – Apr 2026 · Quest Diagnostics + Lahey BILH · DOB Apr 22 1989"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(m
              ? ["SLE/MCTD", "HCQ", "IVF '24"]
              : ["Dx: SLE / MCTD suspected", "Rx: Hydroxychloroquine", "Hx: IVF Apr 2024"]
            ).map((p) => (
              <span key={p} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 99,
                background: "#d8ddd4", color: "var(--muted)", fontWeight: 500,
              }}>{p}</span>
            ))}
          </div>
        </div>
        {/* Tab strip — horizontally scrollable on mobile */}
        <div className="tab-strip" style={{ display: "flex", gap: m ? 0 : 4 }}>
          {(["overview", "trends", "markers", "recs", "lifestyle"] as TabId[]).map((id) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: m ? "7px 12px" : "7px 16px",
              borderRadius: "8px 8px 0 0", fontSize: m ? 12 : 13, fontWeight: 500,
              border: "none", cursor: "pointer", transition: "all .15s", flexShrink: 0,
              background: tab === id ? "var(--surface)" : "transparent",
              color: tab === id ? "var(--text)" : "var(--muted)",
              borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
            }}>
              {m
                ? { overview: "Overview", recs: "Recs", lifestyle: "Lifestyle", trends: "Trends", markers: "Markers" }[id]
                : { overview: "Overview", recs: "Recommendations", lifestyle: "Lifestyle", trends: "Trends", markers: "Markers" }[id]
              }
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: m ? "14px 14px" : "20px 24px" }}>
        {tab === "overview"   && <OverviewTab />}
        {tab === "recs"       && <RecsTab />}
        {tab === "lifestyle"  && <LifestyleTab />}
        {tab === "trends"     && <TrendsTab />}
        {tab === "markers"    && <MarkersTab />}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Overview
// ═════════════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const [activeRange, setActiveRange] = useState<RangeKey | null>(null);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const selectRange = (k: RangeKey) => setActiveRange((v) => v === k ? null : k);
  const selectStat = (label: string) => setSelectedStat((s) => s === label ? null : label);
  const m = useIsMobile();

  const expandedStat = selectedStat ? STAT_DETAILS[selectedStat] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Hero strip */}
      <div style={{ display: "grid", gridTemplateColumns: m ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 8 }}>
        {HERO_STATS.map(({ label, value, sub, trend, status, spark }) => {
          const isSelected = selectedStat === label;
          return (
            <div
              key={label}
              onClick={() => selectStat(label)}
              style={{
                background: isSelected ? "#e8ede4" : "var(--surface)",
                border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 10, padding: "14px 14px 12px",
                cursor: "pointer", transition: "border-color .15s, background .15s",
                outline: "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {spark.length >= 2 && <Sparkline data={[...spark]} color={STATUS_COLOR[status]} width={52} height={22} />}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: isSelected ? 0.7 : 0.35 }}>
                    <path d="M1 4.5V1H4.5M7.5 1H11V4.5M11 7.5V11H7.5M4.5 11H1V7.5" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                {value}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[status] }}>{trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded stat panel */}
      {expandedStat && selectedStat && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--accent)",
          borderRadius: 10, padding: m ? "14px 14px" : "18px 20px",
        }}>
          <div style={{ display: "flex", flexDirection: m ? "column" : "row", gap: m ? 14 : 24, alignItems: "flex-start" }}>

            {/* Meaning + history */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{selectedStat}</span>
                <span style={{ fontSize: 11, color: "var(--muted)", background: "#eef0eb", padding: "2px 8px", borderRadius: 99 }}>
                  {expandedStat.reference}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 14px" }}>
                {expandedStat.meaning}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Draw history</div>
                {expandedStat.history.map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--faint)", width: 150, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart if available */}
            {expandedStat.chartData && (
              <div style={{ width: m ? "100%" : 280, flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Trend chart
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={expandedStat.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={40} />
                    <Tooltip />
                    {expandedStat.refLine && (
                      <ReferenceLine y={expandedStat.refLine.value} stroke={expandedStat.refLine.color} strokeDasharray="3 2"
                        label={{ value: expandedStat.refLine.label, fontSize: 9, fill: expandedStat.refLine.color }} />
                    )}
                    <Line type="monotone" dataKey="v" name={selectedStat} stroke="var(--accent)" strokeWidth={2} dot={{ r: 4, fill: "var(--accent)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <button
              onClick={() => setSelectedStat(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", fontSize: 16, padding: "0 0 0 4px", alignSelf: "flex-start", flexShrink: 0 }}
              title="Close"
            >✕</button>
          </div>
        </div>
      )}

      {/* Main 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 300px", gap: 14 }}>

        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Lab summary */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: m ? "14px" : "16px 18px" }}>
            <div style={{ display: "flex", flexDirection: m ? "column" : "row", gap: m ? 14 : 20, alignItems: "flex-start" }}>

              {/* System health grid */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Lab Results Summary
                  </div>
                  {/* Compact overall summary — clickable */}
                  <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
                    {([
                      { label: "In range"     as RangeKey, pct: 55, color: "var(--green)" },
                      { label: "Borderline"   as RangeKey, pct: 24, color: "var(--amber)" },
                      { label: "Out of range" as RangeKey, pct: 21, color: "var(--red)"   },
                    ]).map(({ label, pct, color }) => {
                      const active = activeRange === label;
                      return (
                        <button
                          key={label}
                          onClick={() => selectRange(label)}
                          style={{
                            background: "none", border: "none", cursor: "pointer", padding: 0,
                            display: "flex", alignItems: "center", gap: 5,
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: active ? "var(--text)" : "var(--muted)", fontWeight: active ? 700 : 400 }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
                          <span style={{ fontSize: 10, color: "var(--faint)", transform: active ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" }}>›</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5-card system grid */}
                <SystemHealthGrid />
              </div>

              {!m && <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />}

              {/* Treatment */}
              <div style={{ width: m ? "100%" : 190, flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Treatment Adherence
                </div>
                {([
                  { name: "Hydroxychloroquine", pct: 92, note: "Daily antimalarial and immunomodulator. Reduces autoantibody production, complement consumption, and cardiovascular risk in lupus. Also reduces antiphospholipid antibody levels over time." },
                  { name: "Escitalopram",        pct: 88, note: "Daily SSRI antidepressant. Relevant to monitoring: SSRIs can cause SIADH (low sodium). Borderline sodium of 135 mmol/L warrants ongoing monitoring." },
                ] as const).map(({ name, pct, note }) => (
                  <div key={name} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{name}</span>
                        <InfoTooltip text={note} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <SegBar pct={pct} color="var(--accent)" />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: "var(--faint)" }}>Current</span>
                      <span style={{ fontSize: 10, color: "var(--faint)" }}>Target</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Range detail panel — slides in below the gauge card */}
          {activeRange && (() => {
            const COLOR_MAP: Record<RangeKey, string> = {
              "In range": "var(--green)", "Borderline": "var(--amber)", "Out of range": "var(--red)",
            };
            const BG_MAP: Record<RangeKey, string> = {
              "In range": "#eef6ef", "Borderline": "#fdf5ec", "Out of range": "#fdf0f0",
            };
            const color = COLOR_MAP[activeRange];
            const bg = BG_MAP[activeRange];
            const items = RANGE_DETAILS[activeRange];
            return (
              <div style={{ background: bg, border: `1px solid ${color}44`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 8px", borderBottom: `1px solid ${color}22` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }}>{activeRange}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{items.length} markers</span>
                  <button onClick={() => setActiveRange(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", fontSize: 14, padding: "0 0 0 6px" }}>✕</button>
                </div>
                <div style={{ maxHeight: 220, overflowY: "auto", padding: "8px 14px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                  {items.map(({ label, value, system, tooltip }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "var(--faint)", width: 88, flexShrink: 0 }}>{system}</span>
                      <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>{label}</span>
                      <InfoTooltip text={tooltip} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Hemoglobin */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Hemoglobin (g/dL) — 2-Year Trend · Quest + Lahey BILH
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={[
                { t:"Jun '24",Hgb:12.6},{t:"Dec '24",Hgb:13.1},{t:"Jun '25",Hgb:12.4},
                { t:"Aug '25",Hgb:12.9},{t:"Mar '26",Hgb:12.0},{t:"Apr '26",Hgb:11.8},
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <YAxis domain={[11, 14]} tick={{ fontSize: 11, fill: "var(--muted)" }} width={32} />
                <Tooltip />
                <ReferenceLine y={11.7} stroke="var(--red)" strokeDasharray="4 2"
                  label={{ value: "lower ref 11.7", fontSize: 10, fill: "var(--red)", position: "insideTopLeft" }} />
                <Line type="monotone" dataKey="Hgb" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} />
              </LineChart>
            </ResponsiveContainer>
            <ChartDesc text={CHART_DESC.hemoglobin} />
          </div>

          {/* C3/C4 + β2-GPI */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Complement C3 & C4 (mg/dL)
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={[
                  { t:"Sep '25",C3:79,C4:12},{t:"Oct '25",C3:78,C4:11},{t:"Mar '26",C3:75,C4:11},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={28} />
                  <Tooltip />
                  <ReferenceLine y={83} stroke="var(--amber)" strokeDasharray="3 2" />
                  <ReferenceLine y={15} stroke="var(--red)"   strokeDasharray="3 2" />
                  <Line type="monotone" dataKey="C3" stroke="var(--blue)"  strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="C4" stroke="var(--amber)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <ChartDesc text={CHART_DESC.complement} />
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                β2-GPI Antibodies (U/mL)
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={[
                  { t:"Oct '25",IgG:32.7,IgM:51.6,IgA:32.9},
                  { t:"Mar '26",IgG:32.6,IgM:32.1,IgA:30.9},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={28} />
                  <Tooltip />
                  <ReferenceLine y={20} stroke="var(--red)" strokeDasharray="3 2"
                    label={{ value: "threshold 20", fontSize: 9, fill: "var(--red)" }} />
                  <Bar dataKey="IgG" fill="var(--blue)"  radius={2} />
                  <Bar dataKey="IgM" fill="var(--amber)" radius={2} />
                  <Bar dataKey="IgA" fill="var(--green)" radius={2} />
                </BarChart>
              </ResponsiveContainer>
              <ChartDesc text={CHART_DESC.antibodies} />
            </div>
          </div>
        </div>

        {/* Right — collapsible system groups */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 2px", marginBottom: 4 }}>
            Marker Status
          </div>

          {SYSTEMS.map(({ id, label, alert, alertColor, markers }) => (
            <div key={id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <button onClick={() => toggle(id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "10px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ fontSize: 12, color: "var(--muted)", transform: open[id] ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s", display: "inline-block", width: 14, flexShrink: 0 }}>›</span>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: `var(--${alertColor})` }}>{alert}</span>
              </button>
              {open[id] && (
                <div style={{ padding: "0 12px 10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {markers.map(({ label: ml, value, trend, status, note }) => (
                    <div key={ml} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <StatusDot s={status} />
                      <span style={{ flex: 1, fontSize: 12, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ml}</span>
                      <InfoTooltip text={note} />
                      <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{value}</span>
                      <span style={{ fontSize: 11, color: STATUS_COLOR[status], flexShrink: 0, width: 22, textAlign: "right" }}>{trend}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Alerts */}
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { title: "APS confirmation required", body: "β2-GPI elevated × 3 isotypes at two draws ≥12 weeks apart — meets preliminary APS criteria. IVF history adds urgency. Full confirmation requires rheumatology." },
              { title: "Anti-SSB/La + IVF history", body: "Neonatal lupus risk (congenital heart block) in future pregnancies. Obstetric rheumatology and fetal cardiac monitoring needed before next cycle." },
            ].map(({ title, body }) => (
              <div key={title} style={{
                background: "#fdf0f0", border: "1px solid #f5c0b8",
                borderRadius: 8, padding: "10px 12px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, color: "#8a4040", lineHeight: 1.55 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Recommendations
// ═════════════════════════════════════════════════════════════════════════════

type RecPriority = "urgent" | "soon" | "ongoing";

interface Rec {
  title: string;
  who: string;
  when: string;
  why: string;
  actions: string[];
  findings: string[];
  source?: string;
  tag?: string;
  icon?: "autoimmune" | "reproductive" | "blood" | "hormones" | "nutrition" | "cardiovascular" | "medication" | "monitoring";
}

function RecIcon({ type, color }: { type: Rec["icon"]; color: string }) {
  const s = { fill: "none", stroke: color, strokeWidth: "1.5", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const icons: Record<NonNullable<Rec["icon"]>, React.ReactElement> = {
    autoimmune: (
      <svg width="16" height="16" viewBox="0 0 16 16" {...{ fill: "none" }}>
        <circle cx="8" cy="8" r="3" {...s} />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M11.53 4.47l-1.42 1.42M4.97 11.03l-1.42 1.42" {...s} />
      </svg>
    ),
    reproductive: (
      <svg width="16" height="16" viewBox="0 0 16 16" {...{ fill: "none" }}>
        <path d="M8 14s-6-3.5-6-7.5a4 4 0 0 1 6-3.46A4 4 0 0 1 14 6.5c0 4-6 7.5-6 7.5z" {...s} />
      </svg>
    ),
    blood: (
      <svg width="16" height="16" viewBox="0 0 16 16" {...{ fill: "none" }}>
        <path d="M8 2C8 2 3 7.5 3 10.5a5 5 0 0 0 10 0C13 7.5 8 2 8 2z" {...s} />
      </svg>
    ),
    hormones: (
      <svg width="16" height="16" viewBox="0 0 16 16" {...{ fill: "none" }}>
        <circle cx="8" cy="8" r="5" {...s} />
        <path d="M8 3v2M8 11v2M3 8h2M11 8h2" {...s} />
      </svg>
    ),
    nutrition: (
      <svg width="16" height="16" viewBox="0 0 16 16" {...{ fill: "none" }}>
        <path d="M8 2C5 2 3 5 3 8s2 6 5 6 5-3 5-6-2-6-5-6z" {...s} />
        <path d="M8 5v6M5.5 7.5h5" {...s} />
      </svg>
    ),
    cardiovascular: (
      <svg width="16" height="16" viewBox="0 0 16 16" {...{ fill: "none" }}>
        <path d="M1 7h2.5l2-4 2 8 2-5 1.5 3H15" {...s} />
      </svg>
    ),
    medication: (
      <svg width="16" height="16" viewBox="0 0 16 16" {...{ fill: "none" }}>
        <rect x="4" y="2" width="8" height="12" rx="4" {...s} />
        <path d="M4 8h8" {...s} />
      </svg>
    ),
    monitoring: (
      <svg width="16" height="16" viewBox="0 0 16 16" {...{ fill: "none" }}>
        <rect x="2" y="3" width="12" height="9" rx="2" {...s} />
        <path d="M5 14h6M8 12v2" {...s} />
        <path d="M5 9l2-3 2 2 2-3" {...s} />
      </svg>
    ),
  };
  if (!type) return null;
  return icons[type];
}

const RECS: Record<RecPriority, { label: string; color: string; bg: string; border: string; items: Rec[] }> = {
  urgent: {
    label: "Address now",
    color: "var(--red)",
    bg: "#fdf0f0",
    border: "#f5c0b8",
    items: [
      {
        title: "Confirm Antiphospholipid Syndrome diagnosis",
        tag: "Autoimmune · APS",
        icon: "autoimmune",
        who: "Rheumatologist (Dr. Alexander Martin, Lahey BILH)",
        when: "Next appointment — do not defer",
        source: "2023 ACR/EULAR APS Criteria",
        why: "Two draws ≥12 weeks apart with β2-GPI elevated across all 3 isotypes (IgG, IgM, IgA) meets the 2023 ACR/EULAR APS classification criteria. Triple-positive antibody profiles carry the highest thrombotic risk tier. Formal diagnosis determines whether long-term anticoagulation (aspirin or heparin/warfarin) is indicated — especially before any future pregnancy or surgical procedure.",
        actions: [
          "Request formal APS risk stratification (triple-positive profile = highest risk tier per 2023 ACR/EULAR criteria)",
          "Discuss low-dose aspirin 81 mg/day as thromboprophylaxis pending formal classification",
          "Retest anticardiolipin IgM (was 31.3 Oct '25, fell to 17.7 Mar '26) to document trend",
          "Schedule lupus anticoagulant (dRVVT) retest — was rising toward cutoff (41 sec, cutoff ~45 sec)",
        ],
        findings: ["β2-GPI IgG 32.6 U/mL (stable elevated)", "β2-GPI IgM 32.1 U/mL (↓ from 51.6)", "β2-GPI IgA 30.9 U/mL", "dRVVT 41 sec (↑ from 28, approaching cutoff)"],
      },
      {
        title: "Pre-conception planning before next IVF cycle",
        tag: "Reproductive · IVF",
        icon: "reproductive",
        who: "Obstetric rheumatologist + reproductive endocrinologist",
        when: "Before starting any fertility treatment",
        source: "EULAR SLE Pregnancy Recommendations",
        why: "Positive Anti-SSB/La raises neonatal lupus risk (congenital heart block in offspring — monitoring from 16–18 weeks gestation). Triple-positive antiphospholipid antibodies elevate implantation failure and pregnancy loss risk; IVF stimulation itself raises thrombosis risk in APS. Note: Anti-SSA/Ro was negative at both draws — CHB risk is primarily anti-Ro driven; confirmation retest is still warranted given Anti-La positivity. Hydroxychloroquine continuation during pregnancy is guideline-recommended (reduces neonatal lupus and flare risk).",
        actions: [
          "Refer to maternal-fetal medicine (MFM) or obstetric rheumatology for pre-conception counseling",
          "Plan prophylactic LMWH (low molecular weight heparin) protocol for IVF stimulation cycle",
          "Discuss fetal cardiac monitoring protocol (echocardiography weeks 16–26) if pregnancy achieved",
          "Confirm hydroxychloroquine continuation during pregnancy (Tier A recommendation — safe in pregnancy)",
          "Retest Anti-SSA/Ro to confirm negative status before next IVF cycle",
        ],
        findings: ["Anti-SSB/La 1.1 AI (positive Sep 2025)", "Anti-SSA/Ro negative (Sep '25 + Mar '26)", "IVF cycle documented Apr 2024", "β2-GPI triple isotype elevation", "C3 75 / C4 11 mg/dL"],
      },
    ],
  },
  soon: {
    label: "Within 1–3 months",
    color: "var(--amber)",
    bg: "#fdf8ee",
    border: "#f0d89a",
    items: [
      {
        title: "Investigate declining hemoglobin",
        tag: "Blood · CBC",
        icon: "blood",
        who: "Primary care or rheumatologist",
        when: "Next lab draw",
        source: "ACR CBC Monitoring Guidelines",
        why: "Hemoglobin has fallen 1.3 g/dL over 16 months (13.1→11.8 g/dL) with normal iron stores and now sits 0.1 g/dL above the lower reference limit. The trajectory matters more than any single value. Three main mechanisms to rule out: autoimmune hemolytic anemia (direct Coombs), hydroxychloroquine bone marrow effect (dose check), and chronic disease anemia (anemia of inflammation, common in active SLE).",
        actions: [
          "Add reticulocyte count + direct Coombs test to next CBC (rule out autoimmune hemolytic anemia)",
          "Check haptoglobin and LDH to screen for ongoing red cell destruction",
          "Verify hydroxychloroquine dose ≤5 mg/kg/day relative to current body weight",
          "Add serum protein electrophoresis if Coombs positive (characterize extent of autoimmune activity)",
        ],
        findings: ["Hemoglobin 13.1→11.8 g/dL (↓1.3 over 16 mo)", "Iron 64 / Ferritin 40 (normal — rules out iron deficiency)", "Platelets also declining 304→246 K/uL", "BMI 17.75 (nutritional reserve limited)"],
      },
      {
        title: "Retest pregnenolone and review adrenal/hormone axis",
        tag: "Hormones · HPA",
        icon: "hormones",
        who: "Functional medicine or endocrinologist",
        when: "1–3 months (morning fasting draw)",
        source: "Single draw — low certainty, confirm before acting",
        why: "Single low pregnenolone at 17 ng/dL (ref 22–237) in Dec 2024 may reflect HPA axis insufficiency. Pregnenolone is the master precursor for cortisol, DHEA, and all sex hormones. SHBG is also persistently elevated (151 nmol/L), reducing free hormone bioavailability. Combined with low BMI (17.75), low leptin (1.4 ng/mL), and a single-draw result, this warrants confirmation before any supplementation.",
        actions: [
          "Retest pregnenolone (morning, fasting, before 10am) — confirm vs. one-off draw",
          "Add DHEA-S and morning cortisol (already drawn Jun 2025, repeat to establish trend)",
          "Work with dietitian toward BMI 19–21 to restore leptin signaling and steroidogenesis substrate",
          "Review SHBG drivers: protein intake, insulin, zinc, vitamin D (all modifiable)",
        ],
        findings: ["Pregnenolone 17 ng/dL (ref 22–237) — single draw Dec 2024", "SHBG 151 nmol/L (ref 17–124, slowly declining)", "Leptin 1.4 ng/mL (low — female ref 4.7–23.7)", "BMI 17.75"],
      },
      {
        title: "Address declining Vitamin B12",
        tag: "Nutrition · B12",
        icon: "nutrition",
        who: "Primary care or self-directed supplementation",
        when: "Start supplementation now; retest in 3 months",
        source: "NIH Dietary Reference Intakes + clinical practice",
        why: "B12 has declined 36% over 15 months (1,000→642 pg/mL) and is trending toward the lower reference limit of 239 pg/mL. B12 is essential for DNA synthesis, neurological function, and red blood cell production — and its decline may be contributing to the falling hemoglobin. Sublingual methylcobalamin bypasses gastric intrinsic factor and is absorbed through the oral mucosa, making it the preferred form for at-risk patients.",
        actions: [
          "Start sublingual methylcobalamin 1,000–2,000 mcg/day (superior absorption vs. cyanocobalamin tablets)",
          "Take separately from coffee and tea (tannic acid impairs B12 absorption)",
          "Retest B12 in 3 months to confirm adequate response",
          "If no improvement: check intrinsic factor antibodies and anti-parietal cell antibodies to rule out pernicious anemia",
        ],
        findings: ["B12 1,000→726→642 pg/mL (↓36% over 15 months)", "Folate 19.8 ng/mL (high — can mask B12-related neurological symptoms)", "Homocysteine 7.5 umol/L (currently normal — will rise if B12 falls further)"],
      },
      {
        title: "Evaluate rising LDL particle count",
        tag: "Cardiovascular",
        icon: "cardiovascular",
        who: "Cardiologist or functional medicine — Cardio IQ follow-up",
        when: "Discuss at next appointment; retest in 6 months",
        source: "AACE Dyslipidemia Guidelines 2022",
        why: "LDL-P rose 57% (802→1,262 nmol/L) and LDL Medium nearly doubled (169→329 nmol/L), despite normal standard LDL-C and excellent blood sugar. LDL particle count is a stronger independent predictor of cardiovascular events than LDL-C when the two are discordant (a pattern now guideline-recognized in AACE 2022). In SLE, chronic cytokine elevation drives hepatic lipid remodeling — rising LDL-P despite normal BMI and no metabolic syndrome is a recognized autoimmune phenotype.",
        actions: [
          "Consider prescription EPA (icosapentaenoic acid / Vascepa 4g/day) — reduces triglycerides and cardiovascular events independent of LDL-C (REDUCE-IT trial, 2018)",
          "Mediterranean diet: olive oil daily, fatty fish 2–3×/week, legumes, nuts, minimal refined carbohydrates",
          "Retest Cardio IQ NMR panel in 6 months to assess trajectory",
          "Discuss statin threshold with cardiologist if LDL-P crosses 1,339 nmol/L (High risk tier)",
        ],
        findings: ["LDL-P 802→1,262 nmol/L (↑57%)", "LDL Medium 169→329 nmol/L (↑95%)", "LDL Small 133→175 nmol/L (↑31%)", "HDL Large 4,682→8,935 nmol/L (protective, doubled)"],
      },
    ],
  },
  ongoing: {
    label: "Maintain & monitor",
    color: "var(--green)",
    bg: "#f2f8f2",
    border: "#bde0be",
    items: [
      {
        title: "Continue hydroxychloroquine — confirm dosing",
        tag: "Medication · SLE",
        icon: "medication",
        who: "Rheumatologist",
        when: "At each rheumatology visit",
        source: "ACR SLE Treatment Guidelines + AAO Retinal Screening",
        why: "Hydroxychloroquine (HCQ) is the only medication with proven mortality benefit in SLE (Urowitz 2022 cohort; OR 0.55). It reduces autoantibody levels (β2-GPI IgM is declining — a likely drug effect), flare risk, complement consumption, and cardiovascular events. The 2016 ACR/AAO guideline capped dosing at ≤5 mg/kg/day of actual body weight to minimize retinopathy risk — at a current weight of ~50 kg (BMI 17.75), maximum safe dose is 250 mg/day.",
        actions: [
          "Confirm current dose ≤5 mg/kg/day based on actual body weight (~50 kg → max 250 mg/day)",
          "Annual ophthalmology exam with Humphrey 10-2 visual field + SD-OCT (retinal screening)",
          "Annual CBC + metabolic panel (monitor for rare bone marrow effects)",
          "Do not discontinue without rheumatology guidance — discontinuation increases flare risk 3×",
        ],
        findings: ["β2-GPI IgM 51.6→32.1 U/mL (likely HCQ effect)", "hs-CRP stable at 0.2 mg/L", "Liver enzymes normal — no hepatotoxicity", "Body weight ~50 kg (BMI 17.75)"],
      },
      {
        title: "Monitor sodium and escitalopram interaction",
        tag: "Medication · Electrolytes",
        icon: "medication",
        who: "Primary care or psychiatrist",
        when: "Include sodium at every draw",
        source: "SSRI prescribing information + SIADH epidemiology",
        why: "All SSRIs including escitalopram can cause SIADH (syndrome of inappropriate antidiuretic hormone secretion) by potentiating ADH effects in the renal collecting duct. Incidence is ~0.5–1% but higher in low body weight patients. Sodium was borderline low at 135 mmol/L (ref 136–145 mmol/L). Symptoms of hyponatremia can mimic lupus flare (fatigue, headache, cognitive fog) — monitoring prevents misattribution.",
        actions: [
          "Include serum sodium at every routine lab draw",
          "Report any new-onset headache, nausea, fatigue, or confusion to provider promptly",
          "Maintain adequate dietary sodium (no low-sodium diet unless specifically indicated)",
          "If sodium falls below 132 mmol/L, discuss dose adjustment or switch with prescriber",
        ],
        findings: ["Sodium 135 mmol/L (low-normal, ref 136–145)", "Escitalopram (SSRI) — SIADH mechanism established", "Low body weight (~50 kg) — higher relative SIADH risk"],
      },
      {
        title: "Track complement C3/C4 as disease activity marker",
        tag: "Autoimmune · SLE",
        icon: "autoimmune",
        who: "Rheumatologist — include with every Lahey BILH draw",
        when: "Every 3–6 months",
        source: "EULAR SLE Monitoring Recommendations",
        why: "In SLE, serum complement (especially C4) is a more reliable disease activity marker than CRP or ESR because immune complex-mediated complement consumption is a direct disease mechanism rather than a secondary acute-phase response. C4 stuck at 11 mg/dL across three draws indicates ongoing immune complex activity. A decline below 10 mg/dL or rapid C3 drop could signal a flare 4–6 weeks before clinical symptoms.",
        actions: [
          "Always include C3/C4 in routine rheumatology labs (every draw at Lahey BILH)",
          "Track anti-dsDNA simultaneously — rising dsDNA + falling complement = lupus nephritis pattern",
          "If C4 falls below 10 or C3 below 70 mg/dL, contact rheumatologist before the next scheduled visit",
        ],
        findings: ["C3 79→78→75 mg/dL (slowly declining, ref 83–193)", "C4 stuck at 11 mg/dL (ref 15–57)", "Anti-dsDNA now negative (reduces nephritis concern)"],
      },
      {
        title: "Optimize nutrition and body composition",
        tag: "Nutrition · BMI",
        icon: "nutrition",
        who: "Registered dietitian with autoimmune or functional medicine focus",
        when: "Ongoing — referral within 1 month",
        source: "WHO BMI criteria + SLE nutritional evidence",
        why: "BMI 17.75 (below the 18.5 underweight threshold) limits nutritional reserves for immune function, steroidogenesis, and erythropoiesis. Low leptin (1.4 ng/mL — far below the female reference of 4.7 ng/mL) signals energy deficit to the hypothalamus, impairing immune surveillance and hormone production. A 3–5 kg weight gain toward BMI 19–21 would predictably improve leptin levels, free sex hormone availability, and likely slow the hemoglobin decline.",
        actions: [
          "Target caloric intake 2,000–2,200 kcal/day — emphasize calorie density, not restriction",
          "Protein ≥1.2 g/kg/day (~60 g/day) to support immune function and muscle maintenance",
          "Anti-inflammatory focus: fatty fish 2–3×/week, olive oil daily, leafy greens, legumes, berries",
          "Continue omega-3 supplementation (index 6.8% — maintain or increase toward 8%)",
        ],
        findings: ["BMI 17.75 (below 18.5)", "Leptin 1.4 ng/mL (female ref 4.7–23.7)", "B12 declining + hemoglobin declining", "Albumin 4.3 g/dL (normal — but limited reserve)"],
      },
      {
        title: "Annual screening panel",
        tag: "Lab Monitoring",
        icon: "monitoring",
        who: "Primary care + Quest Diagnostics",
        when: "Every 12 months",
        source: "Rheumatology follow-up consensus",
        why: "Multiple markers are on active trajectories requiring longitudinal documentation. Annual benchmarking catches deterioration before clinical thresholds are crossed and provides objective data for rheumatology decisions.",
        actions: [
          "Full CBC + iron studies (hemoglobin, platelets, RBC morphology, reticulocyte count)",
          "Cardio IQ NMR panel (LDL-P, subfractions, ApoB, Lp(a))",
          "Vitamin B12, folate, homocysteine",
          "Complement C3/C4 + ANA titer (every 6–12 months)",
          "β2-GPI IgG/IgM/IgA + anticardiolipin + dRVVT (at ≥12-week interval from prior draw)",
          "TSH + free T4, HbA1c, fasting glucose + insulin",
          "Vitamin D (25-OH), magnesium RBC, zinc",
        ],
        findings: ["Multiple markers on declining or rising trajectories requiring active monitoring"],
      },
    ],
  },
};

function RecCard({ item, color, bg, border }: { item: Rec; color: string; bg: string; border: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "14px 16px 12px", textAlign: "left" }}
      >
        {/* Top row: icon + tag + source */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
          {item.icon && (
            <span style={{ flexShrink: 0, opacity: 0.8 }}>
              <RecIcon type={item.icon} color={color} />
            </span>
          )}
          {item.tag && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 99,
              background: color + "18", color, fontWeight: 600, letterSpacing: "0.02em",
            }}>{item.tag}</span>
          )}
          <span style={{ flex: 1 }} />
          {item.source && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 99,
              background: "var(--surface)", border: `1px solid ${border}`,
              color: "var(--faint)", fontWeight: 500, whiteSpace: "nowrap",
            }}>{item.source}</span>
          )}
          <span style={{ fontSize: 11, color, transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block", flexShrink: 0 }}>›</span>
        </div>
        {/* Title */}
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)", lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
        {/* Who + when */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{item.who}</span>
          <span style={{ fontSize: 10, color: "var(--faint)" }}>·</span>
          <span style={{ fontSize: 11, color, fontWeight: 600 }}>{item.when}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px 26px", borderTop: `1px solid ${border}` }}>
          {/* Why */}
          <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.75, margin: "12px 0 16px" }}>{item.why}</p>

          {/* Actions */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Action items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {item.actions.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{
                    width: 19, height: 19, borderRadius: "50%",
                    background: color + "1a", color, fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.55 }}>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supporting findings */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Lab evidence</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {item.findings.map((f, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 99,
                  background: "var(--surface)", border: `1px solid ${border}`, color: "var(--muted)",
                }}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecsTab() {
  const m = useIsMobile();
  const priorityMeta = {
    urgent:  { color: "var(--red)",   bg: "#fdf0f0", border: "#f5c0b8" },
    soon:    { color: "var(--amber)", bg: "#fdf8ee", border: "#f0d89a" },
    ongoing: { color: "var(--green)", bg: "#f2f8f2", border: "#bde0be" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Visual summary header */}
      <div style={{ display: "grid", gridTemplateColumns: m ? "1fr 1fr 1fr" : "1fr 1fr 1fr 2fr", gap: 10 }}>
        {(["urgent", "soon", "ongoing"] as RecPriority[]).map((p) => {
          const { label, items } = RECS[p];
          const { color, bg, border } = priorityMeta[p];
          return (
            <div key={p} style={{
              background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${color}`,
              borderRadius: 10, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {items.length}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
                {label}
              </div>
            </div>
          );
        })}
        {/* Clinical summary — hidden on mobile, only 3 stat boxes show */}
        {!m && (
          <div style={{ background: "#f8f4ff", border: "1px solid #d4c8f0", borderLeft: "3px solid #7c5cbf", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#5a3ea0", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Clinical picture — Apr 2026</div>
            <p style={{ margin: 0, fontSize: 12, color: "#5a4a7a", lineHeight: 1.65 }}>
              Well-managed but active SLE with secondary APS. Hydroxychloroquine is working — but the disease is not in remission. Priority: formalize APS diagnosis and pre-conception rheumatology care.
            </p>
          </div>
        )}
      </div>

      {(["urgent", "soon", "ongoing"] as RecPriority[]).map((priority) => {
        const { label, color, bg, border, items } = RECS[priority];
        return (
          <div key={priority}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              <div style={{ flex: 1, height: 1, background: `${color}33` }} />
              <span style={{ fontSize: 11, color: "var(--faint)" }}>{items.length} item{items.length > 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 10 }}>
              {items.map((item) => (
                <RecCard key={item.title} item={item} color={color} bg={bg} border={border} />
              ))}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 11, color: "var(--faint)", lineHeight: 1.6, margin: 0 }}>
        These recommendations are generated from laboratory findings for informational purposes only. All clinical decisions should be made in consultation with your rheumatologist, primary care physician, and relevant specialists.
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Lifestyle
// ═════════════════════════════════════════════════════════════════════════════

interface LifestyleRec {
  title: string;
  category: string;
  priority: "high" | "medium";
  summary: string;
  details: string;
  actions: string[];
  evidence: string;
  relevance: string[];
}

type LifestyleCategoryId = "Nutrition" | "Movement" | "Photoprotection" | "Mind & Sleep" | "APS Safety";

const LIFESTYLE_CATEGORIES: { id: LifestyleCategoryId; color: string; bg: string; border: string; icon: React.ReactElement }[] = [
  {
    id: "Nutrition", color: "var(--green)", bg: "#f2f8f2", border: "#bde0be",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 0 0-4 4c0 3 2 6 4 8 2-2 4-5 4-8a4 4 0 0 0-4-4z" stroke="var(--green)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 7h4M8 5v4" stroke="var(--green)" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    id: "Movement", color: "var(--blue)", bg: "#eef3fb", border: "#b8d0f0",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="9" cy="3.5" r="1.5" stroke="var(--blue)" strokeWidth="1.4"/><path d="M7 6l-2 4h3l1 4M7 6l3 2 2-2" stroke="var(--blue)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    id: "Photoprotection", color: "var(--amber)", bg: "#fdf8ee", border: "#f0d89a",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="var(--amber)" strokeWidth="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M11.53 4.47l-1.42 1.42M4.97 11.03l-1.42 1.42" stroke="var(--amber)" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    id: "Mind & Sleep", color: "var(--accent)", bg: "#f4f7f4", border: "#c4d4c4",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 9A5 5 0 0 1 6 3a5 5 0 1 0 6 6z" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    id: "APS Safety", color: "var(--red)", bg: "#fdf0f0", border: "#f5c0b8",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L3 4.5v4C3 11.5 5.5 14 8 14s5-2.5 5-5.5v-4L8 2z" stroke="var(--red)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 8l1.5 1.5L10 6" stroke="var(--red)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
];

const LIFESTYLE_RECS: LifestyleRec[] = [
  {
    title: "Mediterranean-style anti-inflammatory diet",
    category: "Nutrition",
    priority: "high",
    summary: "Mediterranean diet adherence independently predicts lower SLE disease activity scores and reduces cardiovascular risk.",
    details: "A 2021 cross-sectional study (Pocovi-Gerardino et al., Nutrients) found Mediterranean diet adherence independently predicted lower SLEDAI-2K scores after adjusting for disease duration and treatment. A 2021 meta-analysis (Marcelino et al., Nutrients) confirmed anti-inflammatory dietary patterns reduce systemic inflammation in autoimmune conditions. The diet's benefit in SLE is mediated by omega-3 fatty acids, polyphenols from olive oil and vegetables, and reduced saturated fat lowering pro-inflammatory cytokine production (IL-6, TNF-α).",
    actions: [
      "Fatty fish 2–3×/week (sardines, salmon, mackerel, herring) — highest EPA+DHA sources",
      "Daily extra-virgin olive oil (2–3 tbsp) — oleocanthal has COX-inhibiting anti-inflammatory properties",
      "Leafy greens and cruciferous vegetables daily (kale, spinach, broccoli, Brussels sprouts)",
      "Legumes 3×/week (lentils, chickpeas, black beans) — protein + fiber + anti-inflammatory polyphenols",
      "Daily handful of walnuts (highest ALA omega-3 among nuts) and mixed nuts",
      "Limit red meat to once weekly; eliminate processed meats entirely",
      "Eliminate ultra-processed foods, refined sugar, and seed oils high in omega-6",
    ],
    evidence: "Pocovi-Gerardino et al., Nutrients 2021; Marcelino et al., Nutrients 2021 (meta-analysis); Oliviero et al., Autoimmun Rev 2015",
    relevance: ["Active autoimmune disease markers (ANA 1:1280, low complement)", "Rising LDL particle count", "BMI 17.75 (calorie-dense whole foods needed)"],
  },
  {
    title: "Caloric sufficiency and weight gain toward healthy BMI",
    category: "Nutrition",
    priority: "high",
    summary: "BMI 17.75 is below the healthy threshold — nutritional insufficiency is driving multiple downstream abnormalities including low leptin, declining hormones, and falling hemoglobin.",
    details: "At BMI 17.75 (~50 kg), the body shifts energy away from reproduction and immune surveillance toward basic survival functions. Low leptin (1.4 ng/mL, far below the female reference of 4.7–23.7 ng/mL) signals chronic energy deficit to the hypothalamus, suppressing GnRH pulsatility, estrogen production, and immune cytokine regulation. Research in SLE cohorts links underweight status to worse disease outcomes and increased infection risk. A weight gain of 3–5 kg toward BMI 19–21 would predictably raise leptin, restore steroid precursor availability, and slow the hemoglobin decline.",
    actions: [
      "Target 2,000–2,200 kcal/day using calorie-dense whole foods (not ultra-processed)",
      "Protein ≥1.2 g/kg/day (~60 g/day) from fish, eggs, legumes, full-fat Greek yogurt",
      "Eat 3 main meals + 2 nutrient-dense snacks daily — do not skip meals",
      "Calorie-dense whole foods: avocado (320 kcal each), nut butters (2 tbsp = 190 kcal), full-fat dairy",
      "Work with a registered dietitian experienced with autoimmune conditions — track intake for 2 weeks",
      "Weigh weekly (same time, same conditions) and target +0.25–0.5 kg/week gain",
    ],
    evidence: "WHO BMI classification; Lord et al., J Clin Endocrinol Metab (leptin and immunity); Mok et al., Rheumatology (nutritional status in SLE)",
    relevance: ["BMI 17.75 (underweight)", "Leptin 1.4 ng/mL (far below female ref)", "Pregnenolone low — master steroid synthesis requires nutritional substrate", "Declining hemoglobin"],
  },
  {
    title: "High-dose omega-3 (EPA+DHA) supplementation",
    category: "Nutrition",
    priority: "high",
    summary: "Omega-3 supplementation reduces SLE disease activity markers and inflammatory cytokines in RCTs, and prescription EPA specifically reduces cardiovascular events.",
    details: "A 2022 meta-analysis (Walton et al., Nutrients) found omega-3 supplementation significantly reduced SLEDAI disease activity scores and serum IL-6 in SLE patients vs. placebo. The omega-3 index is currently 6.8% (above the 5.4% optimal threshold). To address rising LDL particles and systemic inflammation, increasing toward 8–10% is beneficial. The REDUCE-IT trial (2018, NEJM) demonstrated icosapentaenoic acid (EPA-only, Vascepa 4g/day) reduced major adverse cardiovascular events by 25% in patients with elevated triglycerides, independent of LDL-C — directly relevant given the LDL particle discordance.",
    actions: [
      "Continue current omega-3 supplement — confirm it contains both EPA and DHA",
      "Consider adding prescription icosapentaenoic acid (Vascepa/Epanova 4g/day) if LDL-P continues to rise — discuss with cardiologist",
      "Fatty fish 2–3×/week provides an additional 1–2g EPA+DHA per meal",
      "Take omega-3 with a fat-containing meal for optimal absorption",
      "Recheck omega-3 index at next Cardio IQ panel to verify target range",
    ],
    evidence: "Walton et al., Nutrients 2022 (meta-analysis, omega-3 in SLE); REDUCE-IT trial, NEJM 2018 (EPA cardiovascular outcomes); Bhatt et al., NEJM 2019",
    relevance: ["LDL-P 1,262 nmol/L (rising +57%)", "Omega-3 index 6.8% (good, can improve)", "Active systemic inflammation"],
  },
  {
    title: "Sublingual methylcobalamin for declining B12",
    category: "Nutrition",
    priority: "medium",
    summary: "B12 has fallen 36% over 15 months. Sublingual methylcobalamin is absorbed directly through oral mucosa, bypassing potential intrinsic factor issues.",
    details: "B12 is essential for DNA synthesis, nerve function, and red blood cell maturation. The 36% decline (1,000→642 pg/mL over 15 months) may be contributing to the falling hemoglobin (macrocytic component). Methylcobalamin is the biologically active form of B12 and bypasses hepatic conversion. A 2019 study (Del Bo et al., EJCN) confirmed sublingual methylcobalamin raises serum B12 more effectively than oral cyanocobalamin tablets. Take away from coffee and tea (tannic acid inhibits B12 absorption). Note: high folate (19.8 ng/mL) can mask the neurological symptoms of B12 deficiency while allowing the deficiency to progress — monitor regardless of symptom status.",
    actions: [
      "Start sublingual methylcobalamin 1,000–2,000 mcg/day (hold under tongue for 30 seconds before swallowing)",
      "Take in the morning, away from coffee and tea (separate by ≥30 minutes)",
      "Retest serum B12 in 3 months to confirm adequate response (target >700 pg/mL)",
      "If B12 does not rise: check intrinsic factor antibodies and anti-parietal cell antibodies (pernicious anemia)",
      "Inform clinician of folate level — high folate can mask B12-deficiency neurological symptoms",
    ],
    evidence: "Del Bo et al., Eur J Clin Nutr 2019; NIH Office of Dietary Supplements B12 fact sheet; Carmel R., Ann Rev Med 2000",
    relevance: ["B12 1,000→726→642 pg/mL (↓36%)", "Folate 19.8 ng/mL (high — masks deficiency symptoms)", "Declining hemoglobin (B12 deficiency can cause macrocytic anemia)"],
  },
  {
    title: "Moderate aerobic exercise — 150 min/week",
    category: "Movement",
    priority: "high",
    summary: "Multiple RCTs confirm moderate exercise reduces fatigue, depression, and disease activity in SLE without triggering flares — the opposite of the historic advice to rest.",
    details: "A 2021 systematic review (Dönmez et al.) of 14 RCTs found aerobic and resistance exercise significantly reduced fatigue (SMD −0.52) and improved quality of life in SLE without increasing disease activity or flare rates. Water-based exercise is particularly well-tolerated — cooler temperatures reduce photosensitivity exposure, and low impact is easier on joints during disease activity. The ACSM guidelines for adults with chronic inflammatory conditions recommend 150 min/week of moderate-intensity aerobic exercise (50–70% max heart rate — able to hold a full conversation).",
    actions: [
      "Target 30 min/day, 5 days/week at moderate intensity (conversational pace)",
      "Swimming or water aerobics preferred: cool environment (photoprotection), zero joint impact",
      "Walking, cycling, or yoga are excellent alternatives; yoga also addresses stress reduction",
      "Schedule exercise outside peak UV hours (before 10am or after 4pm)",
      "Track energy after sessions — if post-exertional fatigue lasts >24 hours, reduce intensity by 20%",
      "Start at 20 min/day if deconditioned; increase by 5 min/week",
    ],
    evidence: "Dönmez et al., systematic review, Rheumatol Int 2021; Beckerman et al., Arthritis Care Res 2010; ACSM Physical Activity Guidelines 2018",
    relevance: ["SLE fatigue management", "BMI 17.75 (muscle-building supports weight gain)", "Cardiovascular risk from rising LDL-P"],
  },
  {
    title: "Avoid prolonged immobility — APS thrombosis prevention",
    category: "Movement",
    priority: "high",
    summary: "Triple-positive antiphospholipid antibodies create the highest-risk APS thrombosis profile. Immobility during travel or illness significantly increases risk — behavioral precautions are essential until anticoagulation is formalized.",
    details: "Triple-positive APS (all 3 isotypes of β2-GPI above threshold) is associated with the highest cumulative thrombotic event rate (Pengo et al., Blood 2010: 5.3%/year without anticoagulation vs. 0.7%/year with). Until formal thromboprophylaxis decisions are made with a rheumatologist, avoiding modifiable thrombosis triggers is critical. Venous stasis is one of the three components of Virchow's triad for clot formation; immobility during flights or car journeys synergizes with the prothrombotic antibody milieu.",
    actions: [
      "Break up sitting every 60 minutes — stand and walk for 5 minutes (set a timer if needed)",
      "Wear graduated compression stockings (15–20 mmHg, Class I) during any travel >2 hours",
      "Hydrate well during travel — minimum 250 mL water per flight hour",
      "On flights >4 hours: perform seated calf pumps (30 reps) every 30 minutes; request aisle seating",
      "Discuss LMWH prophylaxis (Lovenox) for flights >6 hours, surgeries, or hospitalization with rheumatologist",
      "Avoid estrogen-containing contraceptives (additional thrombosis risk synergizes with APS)",
    ],
    evidence: "Pengo et al., Blood 2010 (triple-positive APS outcomes); ISTH 2020 VTE prophylaxis guidelines; EULAR 2019 APS management recommendations",
    relevance: ["β2-GPI IgG/IgM/IgA all elevated (triple-positive)", "APS classification met but not yet formally diagnosed", "IVF history (estrogen-mediated thrombosis risk)"],
  },
  {
    title: "Daily UV protection protocol",
    category: "Photoprotection",
    priority: "high",
    summary: "UV radiation is one of the most consistent and well-documented SLE flare triggers — protection must be daily and year-round, including indoors near windows.",
    details: "UV-B and UV-A radiation directly activate keratinocytes and plasmacytoid dendritic cells to surface and present nuclear antigens, driving anti-dsDNA antibody production and complement consumption — the exact mechanism underpinning this patient's lab pattern. Cloudy days transmit 80% of UV radiation. Window glass blocks UV-B but transmits UV-A. Broad-spectrum SPF 50+ protection is now a Tier 1 recommendation in all major SLE management guidelines (ACR, EULAR, BSR). A 2015 systematic review (Kuhn et al., Nat Rev Rheumatol) confirmed UV is the single most consistent environmental trigger of SLE disease activity.",
    actions: [
      "Apply SPF 50+ broad-spectrum (UV-A + UV-B) sunscreen every morning to face, neck, and hands — even indoors",
      "Reapply every 2 hours when outdoors or after sweating",
      "Mineral-based sunscreens (zinc oxide, titanium dioxide) are preferred for sensitive skin",
      "Wear UPF 50+ clothing for extended outdoor exposure",
      "UV-protective wide-brim hat (3+ inch brim) for any outdoor activity",
      "Avoid direct sun between 10am–4pm for prolonged outdoor activities",
      "Window film with UV-A blocking for home office or car if prolonged window exposure",
    ],
    evidence: "ACR and EULAR SLE Management Guidelines; Kuhn et al., Nat Rev Rheumatol 2015; Stannard et al., J Am Acad Dermatol 2020",
    relevance: ["Active ANA 1:1280 (speckled pattern, UV-responsive)", "C3/C4 low (ongoing immune complex consumption)", "UV is ranked #1 modifiable flare trigger in SLE"],
  },
  {
    title: "Mindfulness-based stress reduction (MBSR)",
    category: "Mind & Sleep",
    priority: "medium",
    summary: "Psychological stress is a documented lupus flare trigger via HPA and sympathetic axis activation. The 8-week MBSR program is the best-studied intervention with RCT evidence in SLE.",
    details: "Stress activates the HPA axis and sympathetic nervous system, releasing cortisol and catecholamines that dysregulate immune cell signaling. In SLE cohort studies, psychological stress is one of the top three self-reported flare triggers (along with UV and infection). A pilot RCT (Greco et al., Ann Behav Med 2004) found MBSR reduced pain, fatigue, and psychological distress in SLE patients vs. waitlist control. Multiple meta-analyses of mind-body interventions in autoimmune conditions confirm consistent modest benefit for fatigue and quality of life (SMD ~0.40). Chronic stress also accelerates telomere shortening and epigenetic aging — relevant in SLE where accelerated biological aging is documented.",
    actions: [
      "Complete an 8-week MBSR program — available in-person or fully online (UCSD Mindfulness-Based Professional Training Institute, Palouse Mindfulness free online program)",
      "Daily 10–20 minute meditation practice; body scan before sleep is particularly effective for fatigue",
      "4-7-8 breathing technique for acute stress: inhale 4 sec, hold 7 sec, exhale 8 sec — activates parasympathetic response",
      "Progressive muscle relaxation at bedtime — reduces sleep onset time and improves sleep depth",
      "Identify and address top chronic stressors with a therapist experienced in chronic illness (chronic stress maintains HPA dysregulation)",
    ],
    evidence: "Greco et al., Ann Behav Med 2004 (MBSR in SLE, RCT); Creswell & Lindsay, Curr Dir Psychol Sci 2014 (MBSR meta-analysis); ACR patient education on flare prevention",
    relevance: ["SLE flare prevention (stress = #3 trigger)", "Low pregnenolone (HPA insufficiency possible)", "Active autoimmune process requires immune regulation"],
  },
  {
    title: "Sleep hygiene — 7–9 hours of quality sleep",
    category: "Mind & Sleep",
    priority: "medium",
    summary: "Poor sleep quality independently predicts next-day fatigue and higher disease activity in SLE. Sleep is when the immune system consolidates and clears inflammatory metabolites.",
    details: "A 2019 longitudinal daily-diary study in SLE patients (Nicassio et al.) found self-reported poor sleep quality predicted significantly higher next-day fatigue and bodily pain. During slow-wave (N3) sleep, the glymphatic system clears inflammatory metabolites; immune memory consolidation and cytokine regulatory signaling occur during REM. Hydroxychloroquine can cause mild insomnia in some patients (discuss with rheumatologist if this is relevant). Escitalopram can improve sleep but may reduce REM sleep — important to maintain adequate total sleep time.",
    actions: [
      "Consistent sleep-wake schedule (±30 minutes, 7 days/week — weekend sleep-ins disrupt circadian rhythm)",
      "Target 7–9 hours total sleep time in a cool (65–68°F / 18–20°C), completely dark room",
      "No screens 60 minutes before bed — blue light suppresses melatonin by 50% (use Night Shift/f.lux if unavoidable)",
      "No caffeine after 2pm (caffeine half-life is 5–6 hours)",
      "Melatonin 0.5–1 mg at consistent bedtime if sleep onset is a problem (minimal interaction with escitalopram)",
      "Limit naps to 20 minutes before 3pm — longer naps reduce sleep pressure and worsen nighttime sleep",
    ],
    evidence: "Nicassio et al., Arthritis Care Res 2019 (sleep and SLE activity); Lockley et al., Curr Biol 2003 (blue light and melatonin); National Sleep Foundation adult guidelines",
    relevance: ["SLE disease management (poor sleep → higher next-day activity)", "Escitalopram — monitor sleep architecture", "Fatigue management (impacts weight and nutrition goals)"],
  },
  {
    title: "Medical identification and provider communication",
    category: "APS Safety",
    priority: "high",
    summary: "Triple-positive antiphospholipid antibodies must be documented and communicated before any surgical procedure, new medication, hospitalization, or emergency event.",
    details: "Triple-positive APS carries a 5.3%/year thrombotic event rate without anticoagulation (Pengo et al., Blood 2010). Many common medications (estrogen-containing contraceptives, certain antipsychotics) and procedures (surgery, dental extractions under sedation) significantly increase thrombosis risk. In emergencies where the patient cannot communicate, documented medical identification prevents providers from missing critical thromboprophylaxis decisions. The 2019 EULAR APS guidelines specifically recommend medical alert documentation for all patients with confirmed or suspected APS.",
    actions: [
      "Wear a medical alert bracelet or carry a card stating: 'Antiphospholipid Antibody Syndrome (probable) + SLE suspected, on hydroxychloroquine 200–400 mg/day'",
      "Keep a printed one-page clinical summary (antibody values + dates + medications) for all specialist appointments",
      "Before any surgery, dental procedure, or hospitalization: confirm thromboprophylaxis plan with rheumatologist",
      "Avoid all estrogen-containing hormonal contraceptives — progestin-only or non-hormonal methods are preferred in APS",
      "Register at medicalert.org or equivalent emergency medical information service",
      "Share antiphospholipid antibody results with any new prescribing provider before starting new medications",
    ],
    evidence: "Pengo et al., Blood 2010 (triple-positive APS prognosis); EULAR 2019 APS Management Recommendations; ISTH 2020 VTE prophylaxis consensus",
    relevance: ["Triple-positive β2-GPI (IgG/IgM/IgA) — highest APS risk tier", "Formal APS diagnosis pending rheumatology", "IVF history (estrogen-mediated thrombosis risk)"],
  },
];

function LifestyleCard({ item }: { item: LifestyleRec }) {
  const [expanded, setExpanded] = useState(false);
  const cat = LIFESTYLE_CATEGORIES.find((c) => c.id === item.category)!;
  return (
    <div style={{
      background: cat.bg,
      border: `1px solid ${cat.border}`,
      borderLeft: `3px solid ${cat.color}`,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "14px 16px 12px", textAlign: "left" }}
      >
        {/* Top row: icon + category pill + priority badge + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
          <span style={{ flexShrink: 0, opacity: 0.85 }}>{cat.icon}</span>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 99,
            background: cat.color + "18", color: cat.color, fontWeight: 600, letterSpacing: "0.02em",
          }}>{item.category}</span>
          <span style={{ flex: 1 }} />
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 99,
            background: "var(--surface)", border: `1px solid ${cat.border}`,
            color: item.priority === "high" ? cat.color : "var(--faint)", fontWeight: 600,
          }}>{item.priority === "high" ? "Priority" : "Supportive"}</span>
          <span style={{ fontSize: 11, color: cat.color, transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block", flexShrink: 0 }}>›</span>
        </div>
        {/* Title */}
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)", lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
        {/* Summary */}
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>{item.summary}</p>
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px 26px", borderTop: `1px solid ${cat.border}` }}>
          <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.75, margin: "12px 0 16px" }}>{item.details}</p>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: cat.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>What to do</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {item.actions.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{
                    width: 19, height: 19, borderRadius: "50%",
                    background: cat.color + "1a", color: cat.color, fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.55 }}>{a}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Research basis</div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.55, fontStyle: "italic" }}>{item.evidence}</p>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Relevant to this patient</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {item.relevance.map((r, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: "2px 9px", borderRadius: 99,
                    background: "var(--surface)", border: `1px solid ${cat.border}`, color: "var(--muted)",
                  }}>{r}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LifestyleTab() {
  const m = useIsMobile();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Visual summary header */}
      <div style={{ display: "grid", gridTemplateColumns: m ? "repeat(3, 1fr)" : "repeat(5, 1fr) 2fr", gap: 10 }}>
        {LIFESTYLE_CATEGORIES.map(({ id, color, bg, border, icon }) => {
          const count = LIFESTYLE_RECS.filter((r) => r.category === id).length;
          return (
            <div key={id} style={{
              background: bg, border: `1px solid ${border}`, borderLeft: `3px solid ${color}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ marginBottom: 6, opacity: 0.8 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{count}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4, lineHeight: 1.3 }}>{id}</div>
            </div>
          );
        })}
        {/* Callout — hidden on mobile */}
        {!m && (
          <div style={{ background: "#f4f7f4", border: "1px solid #c4d4c4", borderLeft: "3px solid var(--accent)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Evidence-based lifestyle medicine</div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.65 }}>
              Research-backed interventions for SLE and APS — each citing its primary study or guideline. They complement drug therapy; several directly amplify it.
            </p>
          </div>
        )}
      </div>

      {LIFESTYLE_CATEGORIES.map(({ id, color }) => {
        const items = LIFESTYLE_RECS.filter((r) => r.category === id);
        if (items.length === 0) return null;
        return (
          <div key={id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{id}</span>
              <div style={{ flex: 1, height: 1, background: color + "33" }} />
              <span style={{ fontSize: 11, color: "var(--faint)" }}>{items.length} rec{items.length > 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 10 }}>
              {items.map((item) => <LifestyleCard key={item.title} item={item} />)}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 11, color: "var(--faint)", lineHeight: 1.6, margin: 0 }}>
        These lifestyle recommendations are derived from published research and clinical guidelines for SLE and antiphospholipid syndrome. They are not a substitute for individualized advice from your rheumatologist, primary care physician, or registered dietitian.
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Trends
// ═════════════════════════════════════════════════════════════════════════════

function TrendsTab() {
  const m = useIsMobile();
  const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" };
  const lbl = { fontSize: 10, fontWeight: 600 as const, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 10, display: "block" as const };

  return (
    <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 14 }}>
      <div style={card}>
        <span style={lbl}>Platelets (K/uL)</span>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={[
            {t:"May '24",P:303},{t:"Jun '24",P:304},{t:"Dec '24",P:281},
            {t:"Aug '25",P:268},{t:"Mar '26",P:261},{t:"Apr '26",P:246},
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
            <YAxis domain={[200,350]} tick={{ fontSize: 10, fill: "var(--muted)" }} width={32} />
            <Tooltip /><ReferenceLine y={150} stroke="var(--amber)" strokeDasharray="3 2" />
            <Line type="monotone" dataKey="P" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <ChartDesc text="Down 19% over 2 years — still well above the 150 K/uL lower limit, no bleeding risk." />
      </div>

      <div style={card}>
        <span style={lbl}>LDL Particle Subfractions (nmol/L)</span>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={[
            {t:"Jul 2025",Total:802, Med:169,Sm:133},
            {t:"Apr 2026",Total:1262,Med:329,Sm:175},
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={36} />
            <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
            <ReferenceLine y={1138} stroke="var(--amber)" strokeDasharray="3 2" />
            <Bar dataKey="Total" name="LDL-P" fill="var(--red)"   radius={2} />
            <Bar dataKey="Med"   name="Medium" fill="var(--amber)" radius={2} />
            <Bar dataKey="Sm"    name="Small"  fill="var(--blue)"  radius={2} />
          </BarChart>
        </ResponsiveContainer>
        <ChartDesc text="LDL-P crossed above optimal despite normal standard LDL-C — particle counts reveal hidden cardiovascular risk." />
      </div>

      <div style={card}>
        <span style={lbl}>Vitamin B12 (pg/mL) — declining trend</span>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={[{t:"May '24",B12:1000},{t:"Dec '24",B12:726},{t:"Aug '25",B12:642}]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
            <YAxis domain={[200,1100]} tick={{ fontSize: 10, fill: "var(--muted)" }} width={36} />
            <Tooltip /><ReferenceLine y={239} stroke="var(--red)" strokeDasharray="3 2" />
            <Line type="monotone" dataKey="B12" stroke="var(--amber)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <ChartDesc text="Down 36% over 15 months — still in range, but at this rate approaches lower limit within ~12 months." />
      </div>

      <div style={card}>
        <span style={lbl}>Estradiol (pg/mL) — IVF cycle Apr 2024</span>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={[
            {t:"Apr 1",E:203},{t:"Apr 11",E:28},{t:"Apr 17",E:1174},
            {t:"Apr 19",E:1524},{t:"Apr 22",E:2832},{t:"Jun '25",E:624},{t:"Aug '25",E:277},
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={36} />
            <Tooltip /><ReferenceLine y={357} stroke="var(--amber)" strokeDasharray="3 2"
              label={{ value: "non-IVF peak", fontSize: 9, fill: "var(--amber)" }} />
            <Line type="monotone" dataKey="E" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <ChartDesc text="Classic IVF stimulation curve in Apr 2024 — peak 2,832 pg/mL at trigger. Elevated thrombosis risk in context of APS." />
      </div>

      <div style={card}>
        <span style={lbl}>SHBG (nmol/L) — above reference range</span>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={[{t:"Jun '25",S:179},{t:"Aug '25",S:146},{t:"Apr '26",S:151}]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
            <YAxis domain={[100,200]} tick={{ fontSize: 10, fill: "var(--muted)" }} width={32} />
            <Tooltip /><ReferenceLine y={124} stroke="var(--red)" strokeDasharray="3 2"
              label={{ value: "upper ref", fontSize: 9, fill: "var(--red)" }} />
            <Line type="monotone" dataKey="S" stroke="var(--amber)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <ChartDesc text="Persistently above ref (124 nmol/L) — limits free estrogen and testosterone availability." />
      </div>

      <div style={card}>
        <span style={lbl}>HDL Large Particles (nmol/L) — major improvement</span>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={[{t:"Jul 2025",HDL:4682},{t:"Apr 2026",HDL:8935}]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={40} />
            <Tooltip /><ReferenceLine y={6729} stroke="var(--green)" strokeDasharray="3 2"
              label={{ value: "optimal", fontSize: 9, fill: "var(--green)" }} />
            <Bar dataKey="HDL" fill="var(--green)" radius={2} />
          </BarChart>
        </ResponsiveContainer>
        <ChartDesc text="Nearly doubled — now above the optimal threshold of 6,729 nmol/L. Offsets rising LDL particle risk." />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Markers
// ═════════════════════════════════════════════════════════════════════════════

function MarkersTab() {
  type Row = { cells: string[]; status: MarkerStatus; tooltip: string };
  const sections: { title: string; headers: string[]; rows: Row[] }[] = [
    {
      title: "Autoimmune & Inflammation",
      headers: ["Marker","Latest","Prior","Reference","Trend"],
      rows: [
        { cells:["ANA Screen","Positive","Positive","Negative","↔ Persistent"], status:"bad", tooltip:"Antinuclear antibody screen — positive at every draw since Jun 2025. The direct trigger for the full autoimmune workup." },
        { cells:["ANA Titer","1:1280","1:1280","<1:40","↔ Stable high"], status:"bad", tooltip:"32× above the negative cutoff. Speckled pattern AC-2,4,5,29 is associated with SLE, MCTD, and Sjögren's." },
        { cells:["Anti-SSB/La","1.1 POS","—","<1.0 AI","— Single draw (Sep '25)"], status:"bad", tooltip:"Positive in Sep 2025. La/SSB antibodies are associated with Sjögren's, SLE, and neonatal lupus. Critical in context of IVF history — offspring can develop congenital heart block." },
        { cells:["β2-GPI IgG","32.6 H","32.7 H","<20 U/mL","↔ Stable elevated"], status:"bad", tooltip:"Most clinically significant antiphospholipid antibody isotype. IgG carries the highest thrombotic risk. Stable at 32.6 U/mL — no improvement." },
        { cells:["β2-GPI IgM","32.1 H","51.6 H","<20 U/mL","↓ Declining but high"], status:"bad", tooltip:"Declining from 51.6 to 32.1 — may reflect hydroxychloroquine's antibody-suppressing effect. Still elevated." },
        { cells:["β2-GPI IgA","30.9 H","32.9 H","<20 U/mL","↓ Stable elevated"], status:"bad", tooltip:"IgA isotype. Least studied but contributes to overall APS risk assessment." },
        { cells:["Anti-CL IgM","17.7","31.3 H","<20","↓ Was positive Oct '25"], status:"warn", tooltip:"Anti-cardiolipin IgM — was positive (31.3) in Oct 2025, now just below threshold. Per APS guidelines, needs 12-week confirmation." },
        { cells:["Lupus AC dRVVT","41 sec","28 sec","≤45 sec","↑ Rising — watch"], status:"warn", tooltip:"Lupus anticoagulant screening test (dilute Russell Viper Venom Time). Rising toward the 45-sec cutoff. Not positive yet but trend is concerning given other antiphospholipid findings." },
        { cells:["C3 Complement","75 L","78 L","83–193 mg/dL","↓ Declining below range"], status:"bad", tooltip:"Below reference at all three Lahey BILH draws. Slowly declining. Indicates ongoing immune complex formation." },
        { cells:["C4 Complement","11 L","11 L","15–57 mg/dL","↔ Stuck low"], status:"bad", tooltip:"Stuck at 11 mg/dL for multiple draws. C4 is more specific to lupus activity. Very low relative to range floor of 15." },
        { cells:["Anti-dsDNA","<1 IU/mL","2 IU/mL","<4 neg","↓ Now negative"], status:"ok", tooltip:"Double-stranded DNA antibody — indeterminate in Sep 2025, now negative. This is reassuring: falling dsDNA reduces concern for active lupus nephritis." },
        { cells:["hs-CRP","0.2 mg/L","0.2 mg/L","<1.0 mg/L","↔ Optimal"], status:"ok", tooltip:"Ultra-low. Stable. The normal CRP despite high ANA and low complement is a known SLE paradox — CRP is not a reliable disease activity marker in lupus." },
        { cells:["ESR","25 mm/hr","18 mm/hr","0–36 mm/hr","↑ Rising, normal"], status:"ok", tooltip:"Sedimentation rate — a non-specific inflammation marker. Rising (18→25) but still within normal range. Less specific than hs-CRP." },
      ],
    },
    {
      title: "Blood (CBC)",
      headers: ["Marker","Apr 2026","Dec 2024","Aug 2025","Reference"],
      rows: [
        { cells:["Hemoglobin","11.8 g/dL","13.1 g/dL","12.9 g/dL","11.7–15.5"], status:"warn", tooltip:"Declining 1.3 g/dL over 16 months. Now 0.1 above the lower reference limit. Iron stores are normal, suggesting chronic disease anemia rather than iron deficiency." },
        { cells:["Hematocrit","36.3%","40.1%","40.1%","35.9–46%"], status:"warn", tooltip:"The percentage of blood volume made up of red blood cells. Declining in parallel with hemoglobin. Still technically in range." },
        { cells:["RBC","3.87 M/uL","4.32 M/uL","4.10 M/uL","3.80–5.10"], status:"ok", tooltip:"Red blood cell count — declining proportionally with hemoglobin. Still within normal range." },
        { cells:["WBC","4.0 K/uL","4.60 K/uL","4.22 K/uL","3.8–10.8"], status:"ok", tooltip:"White blood cell count stable throughout. No bone marrow suppression from hydroxychloroquine." },
        { cells:["Platelets","246 K/uL","281 K/uL","268 K/uL","140–400"], status:"ok", tooltip:"Slowly declining over 2 years (304→246). Still well above the lower reference limit of 150 K/uL. Worth monitoring the trend." },
      ],
    },
    {
      title: "Metabolic, Kidney & Liver",
      headers: ["Marker","Latest","Prior","Reference","Status"],
      rows: [
        { cells:["eGFR","117 mL/min","119 mL/min","≥60","Excellent"], status:"ok", tooltip:"Estimated glomerular filtration rate. Measures kidney function. Excellent (>90 = normal; >60 = adequate). No autoimmune kidney injury despite high-titer ANA." },
        { cells:["Creatinine","0.64 mg/dL","0.60 mg/dL","0.55–0.97","Stable"], status:"ok", tooltip:"Kidney waste product. Low and stable. Normal female range. No signs of kidney dysfunction." },
        { cells:["HbA1c","5.4%","5.3%","<5.7%","Optimal — mild rise"], status:"ok", tooltip:"3-month blood sugar average. Well below prediabetes threshold of 5.7%. Mild upward trend worth monitoring long-term." },
        { cells:["Fasting Glucose","82 mg/dL","99 mg/dL","65–99","Stable"], status:"ok", tooltip:"Normal. Peak was 99 mg/dL (upper normal) in Dec 2024. Latest 82 mg/dL. No insulin resistance (insulin 3.3 uIU/mL)." },
        { cells:["Urine Protein","Negative","Negative","Negative","No proteinuria"], status:"ok", tooltip:"No protein in urine across all draws. Critical reassurance: lupus can cause nephritis (kidney inflammation). Protein/Cr ratio 0.10 (optimal ≤0.29)." },
        { cells:["ALT","15 U/L","18 U/L","7–35","Normal"], status:"ok", tooltip:"Liver enzyme (alanine aminotransferase). Stable and normal. No drug-induced liver toxicity from hydroxychloroquine." },
        { cells:["ALP","33 U/L","41 U/L","29–100","Normalized"], status:"ok", tooltip:"Alkaline phosphatase — a liver/bone enzyme. Briefly dipped below range in Jun 2025 (Quest lab: 29 U/L). Now normalized at 33." },
      ],
    },
    {
      title: "Nutrients & Hormones",
      headers: ["Marker","Latest","Prior","Reference","Status"],
      rows: [
        { cells:["Vitamin D","52 ng/mL","—","30–100","Optimal"], status:"ok", tooltip:"Optimal range 30–100 ng/mL. Vitamin D is important for immune regulation, bone density, and mood. Level is solid." },
        { cells:["Vitamin B12","642 pg/mL","1,000 pg/mL","239–931","Declining — watch"], status:"warn", tooltip:"Declining 36% over 15 months (1,000→642). Still in range but trending toward lower limit. B12 deficiency can cause nerve damage, fatigue, and worsen anemia." },
        { cells:["Folate","19.8 ng/mL","12.7 ng/mL",">2.76","Rising"], status:"ok", tooltip:"Rising (likely supplementing). Essential for DNA synthesis and the B12 methylation cycle. High folate can mask B12 deficiency symptoms — the B12 decline is worth watching regardless." },
        { cells:["Omega-3 Index","6.8%","—",">5.4% optimal","Optimal"], status:"ok", tooltip:"Combined EPA+DPA+DHA index. Above the 5.4% optimal cutoff associated with reduced cardiovascular mortality. Supports anti-inflammatory pathways." },
        { cells:["SHBG","151 nmol/L","179 nmol/L","17–124","Elevated — declining"], status:"warn", tooltip:"Persistently above reference (17–124) at all draws. Limits free estrogen and testosterone availability. Contributing to low free sex hormone levels despite normal total values." },
        { cells:["Pregnenolone","17 ng/dL","—","22–237","Low — retest"], status:"warn", tooltip:"Master steroid precursor for cortisol, DHEA, and all sex hormones. Below reference (22–237). Single draw from Dec 2024 — should be retested to confirm." },
        { cells:["AMH","1.53 ng/mL","—","0.18–5.68","Normal ovarian reserve"], status:"ok", tooltip:"Anti-Müllerian hormone indicates ovarian egg reserve. Normal at 1.53 ng/mL despite IVF history and ongoing autoimmune disease." },
        { cells:["TSH","1.23 uIU/mL","1.84 uIU/mL","0.35–4.94","Normal — was borderline May '24"], status:"ok", tooltip:"Thyroid stimulating hormone. Was borderline low (0.48) in May 2024 — possibly due to IVF estrogen surge. Now stably normal across three draws. Free T3 and T4 both normal. Thyroid antibodies (TPO, TgAb) negative." },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {sections.map(({ title, headers, rows }) => (
        <div key={title}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", color: "var(--text)" }}>{title}</h3>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f4f6f1" }}>
                  {headers.map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ cells, status, tooltip }, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? "#fafbf8" : "var(--surface)" }}>
                    {cells.map((cell, j) => (
                      <td key={j} style={{ padding: "8px 12px", color: "var(--text)", borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                        {j === 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <StatusDot s={status} size={6} />
                            {cell}
                            <InfoTooltip text={tooltip} />
                          </div>
                        ) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
