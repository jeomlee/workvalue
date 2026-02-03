/* ============================================================================
  WorkValue 계산기 모음 (전체)
  - 자영업 BEP 계산기: calcBEP
  - 실수령 시급 계산기(단순): calcHourly
  - 월급 실수령액(추정): calcSalaryNet
  - 알바/근로자 인건비(킬러): calcLaborCost
  - 공통: initWorkValue() -> 페이지별 자동 바인딩 + 공통 헤더 렌더
============================================================================ */

function $(id) {
  return typeof document !== "undefined" ? document.getElementById(id) : null;
}
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}
function won(n) {
  const x = Math.round(num(n, 0));
  return x.toLocaleString("ko-KR") + "원";
}
function pctRatioToString(ratio) {
  const x = num(ratio, 0) * 100;
  return (Math.round(x * 100) / 100).toLocaleString("ko-KR") + "%";
}
function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}
function setHTML(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}
function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}
function isChecked(id) {
  const el = $(id);
  return !!(el && el.checked);
}
function readSelect(id) {
  const el = $(id);
  return el ? el.value : "";
}
function parseQuery() {
  const q = {};
  try {
    const usp = new URLSearchParams(location.search);
    for (const [k, v] of usp.entries()) q[k] = v;
  } catch (_) {}
  return q;
}

/* ============================================================================
  ✅ 공통 헤더 (모든 페이지 동일)
  - HTML에 <header id="wvHeader"></header> 만 두면 동일한 헤더 렌더
============================================================================ */
const NAV_ITEMS = [
  { key: "home", label: "홈", href: "/" },
  { key: "bep", label: "자영업 BEP", href: "/business/bep.html" },
  { key: "labor", label: "인건비 계산", href: "/business/labor-cost.html" },
  { key: "hourly", label: "실수령 시급", href: "/employee/hourly.html" },
  { key: "salary", label: "월급 실수령(추정)", href: "/employee/salary-net.html" },
];

function detectActiveKey() {
  const p = (location.pathname || "").toLowerCase();
  if (p === "/" || p.endsWith("/index.html")) return "home";
  if (p.includes("/business/bep")) return "bep";
  if (p.includes("/business/labor-cost")) return "labor";
  if (p.includes("/employee/hourly")) return "hourly";
  if (p.includes("/employee/salary-net")) return "salary";
  return "home";
}

function renderCommonHeader() {
  const host = $("wvHeader");
  if (!host) return;

  const active = detectActiveKey();
  const title =
    active === "bep"
      ? "자영업 손익분기점(BEP) 계산기"
      : active === "labor"
      ? "알바·근로자 인건비 계산기"
      : active === "hourly"
      ? "실수령 시급 계산기"
      : active === "salary"
      ? "월급 실수령액 계산기(추정)"
      : "WorkValue";

  const subtitle =
    active === "home"
      ? "급여·근로·자영업 계산을 빠르게 확인하실 수 있습니다"
      : "입력값을 바꾸면 즉시 계산됩니다";

  const navHtml = NAV_ITEMS.map((it) => {
    const cls = it.key === active ? 'class="active"' : "";
    return `<a ${cls} href="${it.href}">${it.label}</a>`;
  }).join("");

  host.innerHTML = `
    <div class="brand">
      <div class="dot"></div>
      <div class="t">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
    </div>
    <nav aria-label="이동">
      ${navHtml}
    </nav>
  `;
}

/* ============================================================================
  1) 자영업 손익분기점(BEP)
============================================================================ */
export function applyBEPQueryIfAny() {
  if (!$("fixedCost") || !$("variableRate")) return;

  const q = parseQuery();
  if (q.fixedCost) setValue("fixedCost", q.fixedCost);
  if (q.variableRate) setValue("variableRate", q.variableRate);
  if (q.openDays) setValue("openDays", q.openDays);
  if (q.hoursPerDay) setValue("hoursPerDay", q.hoursPerDay);
  if (q.targetSales) setValue("targetSales", q.targetSales);
}

export function calcBEP() {
  if (!$("fixedCost") || !$("variableRate")) return;

  const fixedCost = Math.max(0, num($("fixedCost")?.value, 0));
  const variableRatePct = clamp(num($("variableRate")?.value, 0), 0, 100);
  const variableRate = variableRatePct / 100;

  const openDays = Math.max(1, Math.floor(num($("openDays")?.value, 26)));
  const hoursPerDay = Math.max(1, num($("hoursPerDay")?.value, 10));
  const targetSales = Math.max(0, num($("targetSales")?.value, 0));

  const denom = 1 - variableRate;
  const bep = denom > 0 ? fixedCost / denom : Infinity;
  const bepDaily = Number.isFinite(bep) ? bep / openDays : Infinity;

  const profit = targetSales - targetSales * variableRate - fixedCost;
  const totalHours = openDays * hoursPerDay;
  const ownerHourly = totalHours > 0 ? profit / totalHours : 0;

  setText("kpiBEP", Number.isFinite(bep) ? won(bep) : "계산이 불가능합니다");
  setText("kpiBEPDaily", Number.isFinite(bepDaily) ? won(bepDaily) : "계산이 불가능합니다");
  setText("kpiProfit", won(profit));
  setText("kpiOwnerHourly", won(ownerHourly));

  const body = $("bepTableBody");
  if (!body) return;

  const rows = [];
  const base = Number.isFinite(bep) ? bep : targetSales || fixedCost * 2;
  const points = [0.6, 0.8, 1.0, 1.2, 1.6].map((m) => Math.max(0, base * m));

  for (const s of points) {
    const p = s - s * variableRate - fixedCost;
    const h = totalHours > 0 ? p / totalHours : 0;
    rows.push(
      `<tr>
        <td>${won(s)}</td>
        <td>${won(p)}</td>
        <td>${won(h)}</td>
      </tr>`
    );
  }
  body.innerHTML = rows.join("");
}

/* ============================================================================
  2) 실수령 시급/주급/월급(단순)
============================================================================ */
export function calcHourly() {
  if (!$("hourlyWage") || !$("hoursPerDayH")) return;

  const hourlyWage = Math.max(0, num($("hourlyWage")?.value, 0));
  const hoursPerDay = Math.max(0, num($("hoursPerDayH")?.value, 0));
  const daysPerWeek = clamp(Math.floor(num($("daysPerWeekH")?.value, 0)), 0, 7);
  const breakMin = Math.max(0, num($("breakMinH")?.value, 0));
  const overtimeWeek = Math.max(0, num($("overtimeWeekH")?.value, 0));
  const includeHoliday = isChecked("includeHolidayH");

  const paidHoursPerDay = Math.max(0, hoursPerDay - breakMin / 60);
  const weeklyPaidHours = paidHoursPerDay * daysPerWeek;

  const holidayHours =
    includeHoliday && weeklyPaidHours >= 15 && daysPerWeek > 0 ? weeklyPaidHours / daysPerWeek : 0;

  const baseWeekly = (weeklyPaidHours + holidayHours) * hourlyWage;
  const overtimePremium = overtimeWeek * hourlyWage * 0.5;
  const weekly = baseWeekly + overtimePremium;

  const monthly = weekly * 4.345;
  const totalWeekHours = weeklyPaidHours + holidayHours + overtimeWeek;

  setText("kpiWeeklyH", won(weekly));
  setText("kpiMonthlyH", won(monthly));
  setText("kpiHoursH", (Math.round(totalWeekHours * 10) / 10).toLocaleString("ko-KR") + "시간");
}

/* ============================================================================
  3) 월급 실수령액(추정)
============================================================================ */
export function calcSalaryNet() {
  if (!$("grossS") || !$("depS")) return;

  const gross = Math.max(0, num($("grossS")?.value, 0));
  const dep = Math.max(1, Math.floor(num($("depS")?.value, 1)));
  const preset = readSelect("presetS") || "standard";
  const includeTax = isChecked("includeTaxS");

  let rateNPS = 0.0475;
  let rateHI = 0.03595;
  let rateEI = 0.009;

  let taxBaseRate = 0.02;
  if (preset === "light") taxBaseRate = 0.012;
  if (preset === "heavy") taxBaseRate = 0.035;

  const depAdj = clamp(1 - (dep - 1) * 0.05, 0.75, 1);

  const nps = gross * rateNPS;
  const hi = gross * rateHI;
  const ei = gross * rateEI;

  const incomeTax = includeTax ? gross * taxBaseRate * depAdj : 0;
  const localTax = includeTax ? incomeTax * 0.1 : 0;

  const totalDeduct = nps + hi + ei + incomeTax + localTax;
  const net = gross - totalDeduct;

  setText("kpiNetS", won(net));
  setText("kpiDeductS", won(totalDeduct));
  setText("kpiRateS", pctRatioToString(gross > 0 ? totalDeduct / gross : 0));

  const list = $("deductListS");
  if (list) {
    const items = [
      ["국민연금(추정)", nps],
      ["건강보험(추정)", hi],
      ["고용보험(추정)", ei],
    ];
    if (includeTax) {
      items.push(["소득세(추정)", incomeTax]);
      items.push(["지방소득세(추정)", localTax]);
    }
    list.innerHTML = items.map(([k, v]) => `<li>${k}: <b>${won(v)}</b></li>`).join("");
  }
}

/* ============================================================================
  4) 알바/근로자 인건비 계산기 (킬러)
============================================================================ */
const INDUSTRIAL_PRESETS = {
  direct: { label: "직접 입력하시기", rate: null },
  cafe: { label: "카페/음료(예시)", rate: 1.0 },
  restaurant: { label: "일반 음식점(예시)", rate: 1.2 },
  office: { label: "사무/일반(예시)", rate: 0.7 },
  delivery: { label: "배달/라이더(예시)", rate: 2.0 },
};

export function calcLaborCost() {
  if (!$("lcHourly") || !$("lcHours")) return;

  const presetKey = readSelect("lcIndustrialPreset") || "direct";
  const presetRate = INDUSTRIAL_PRESETS[presetKey]?.rate ?? null;
  if (presetRate != null) setValue("lcIndustrialRate", String(presetRate));

  const hourly = Math.max(0, num($("lcHourly")?.value, 0));
  const monthlyHours = Math.max(0, num($("lcHours")?.value, 0));
  const weeklyDays = clamp(Math.floor(num($("lcDays")?.value, 5)), 1, 7);
  const count = Math.max(1, Math.floor(num($("lcCount")?.value, 1)));

  const holidayOn = isChecked("lcHoliday");
  const extraHoursMonthly = Math.max(0, num($("lcExtraHours")?.value, 0));

  const insuranceOn = isChecked("lcInsurance");
  const severanceOn = isChecked("lcSeverance");

  const industrialRate = clamp(num($("lcIndustrialRate")?.value, 0), 0, 99) / 100;
  const ownerDevRate = clamp(num($("lcOwnerDevRate")?.value, 0), 0, 99) / 100;

  const varRatePct = clamp(num($("lcVarRate")?.value, 35), 0, 100);
  const varRate = varRatePct / 100;
  const openDays = Math.max(1, Math.floor(num($("lcOpenDays")?.value, 26)));
  const hoursPerDay = Math.max(1, num($("lcHoursPerDay")?.value, 10));
  const targetSales = Math.max(0, num($("lcTargetSales")?.value, 15000000));

  const RATE = {
    worker: { nps: 0.0475, hi: 0.03595, ei: 0.009 },
    owner: { nps: 0.0475, hi: 0.03595, ei: 0.009 },
  };

  const basePay = hourly * monthlyHours;

  const weeklyHours = monthlyHours / 4.345;
  const holidayPayMonthly =
    holidayOn && weeklyHours >= 15
      ? (weeklyHours / weeklyDays) * hourly * 4.345
      : 0;

  const premiumPay = extraHoursMonthly * hourly * 0.5;

  const workerGross1 = basePay + holidayPayMonthly + premiumPay;

  const workerIns1 = insuranceOn
    ? workerGross1 * (RATE.worker.nps + RATE.worker.hi + RATE.worker.ei)
    : 0;

  const ownerIns1 = insuranceOn
    ? workerGross1 * (RATE.owner.nps + RATE.owner.hi + RATE.owner.ei)
    : 0;

  const industrial1 = workerGross1 * industrialRate;
  const dev1 = workerGross1 * ownerDevRate;
  const severance1 = severanceOn ? workerGross1 / 12 : 0;

  const workerGross = workerGross1 * count;
  const workerIns = workerIns1 * count;
  const workerNet = workerGross - workerIns;

  const ownerTotal = workerGross + (ownerIns1 + industrial1 + dev1 + severance1) * count;
  const ownerHourly = monthlyHours > 0 ? ownerTotal / (monthlyHours * count) : 0;

  setText("kpiWorkerGross", won(workerGross));
  setText("kpiWorkerNet", won(workerNet));
  setText("kpiOwnerTotal", won(ownerTotal));
  setText("kpiOwnerHourly", won(ownerHourly));

  const li = (k, v) => `<li>${k}: <b>${won(v)}</b></li>`;

  setHTML(
    "lcWorkerBreakdown",
    [
      li("기본급(합계)", basePay * count),
      li("주휴수당(합계)", holidayPayMonthly * count),
      li("가산수당(합계, 50% 가산분)", premiumPay * count),
      li("세전 합계", workerGross),
      insuranceOn ? li("근로자 부담(추정, 4대보험)", workerIns) : "",
      li("공제 후(추정)", workerNet),
    ]
      .filter(Boolean)
      .join("")
  );

  setHTML(
    "lcOwnerBreakdown",
    [
      li("급여 지급(세전 합계)", workerGross),
      insuranceOn ? li("사업주 부담(추정, 4대보험)", ownerIns1 * count) : "",
      li("산재보험(사업주)", industrial1 * count),
      ownerDevRate > 0 ? li("고용안정·직능(사업주, 선택)", dev1 * count) : "",
      severanceOn ? li("퇴직금 월 환산(선택)", severance1 * count) : "",
      li("사장님 총부담", ownerTotal),
    ]
      .filter(Boolean)
      .join("")
  );

  const bepUrl = new URL("/business/bep.html", location.origin);
  bepUrl.searchParams.set("fixedCost", String(Math.round(ownerTotal)));
  bepUrl.searchParams.set("variableRate", String(varRatePct));
  bepUrl.searchParams.set("openDays", String(openDays));
  bepUrl.searchParams.set("hoursPerDay", String(hoursPerDay));
  bepUrl.searchParams.set("targetSales", String(targetSales));

  const toBep = $("lcToBEP");
  if (toBep) toBep.setAttribute("href", bepUrl.toString());

  const perWorkerOwnerTotal = workerGross1 + ownerIns1 + industrial1 + dev1 + severance1;
  const margin = 1 - varRate;

  const needSalesMonthly = margin > 0 ? perWorkerOwnerTotal / margin : Infinity;
  const needSalesDaily = Number.isFinite(needSalesMonthly) ? needSalesMonthly / openDays : Infinity;

  setText("kpiPlusOneSales", Number.isFinite(needSalesMonthly) ? won(needSalesMonthly) : "계산이 불가능합니다");
  setText("kpiPlusOneSalesDaily", Number.isFinite(needSalesDaily) ? won(needSalesDaily) : "계산이 불가능합니다");

  const tb = $("lcTableBody");
  if (tb) {
    const mults = [0.8, 1.0, 1.2, 1.5];
    tb.innerHTML = mults
      .map((m) => {
        const h = Math.round(monthlyHours * m);
        const weeklyH = h / 4.345;

        const holM = holidayOn && weeklyH >= 15 ? (weeklyH / weeklyDays) * hourly * 4.345 : 0;
        const premM = premiumPay;

        const gross1 = hourly * h + holM + premM;

        const wIns1 = insuranceOn ? gross1 * (RATE.worker.nps + RATE.worker.hi + RATE.worker.ei) : 0;
        const oIns1 = insuranceOn ? gross1 * (RATE.owner.nps + RATE.owner.hi + RATE.owner.ei) : 0;

        const ind1 = gross1 * industrialRate;
        const dev1m = gross1 * ownerDevRate;
        const sev1m = severanceOn ? gross1 / 12 : 0;

        const wNet = (gross1 - wIns1) * count;
        const oTotal = (gross1 + oIns1 + ind1 + dev1m + sev1m) * count;

        return `<tr>
          <td>${h.toLocaleString("ko-KR")}시간</td>
          <td>${won(wNet)}</td>
          <td>${won(oTotal)}</td>
        </tr>`;
      })
      .join("");
  }
}

/* ============================================================================
  ✅ 페이지별 자동 바인딩
============================================================================ */
function bind(ids, fn) {
  ids.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", fn);
    el.addEventListener("change", fn);
  });
}
function safeRun(fn) {
  try {
    fn();
  } catch (e) {
    console.error("[WorkValue] calc error:", e);
  }
}

export function initWorkValue() {
  renderCommonHeader();

  const y = $("y");
  if (y) y.textContent = new Date().getFullYear();

  // BEP
  if ($("fixedCost") && $("variableRate")) {
    const run = () => safeRun(calcBEP);

    const btnCalc = $("btnCalc");
    if (btnCalc) btnCalc.addEventListener("click", run);

    const btnExample = $("btnExample");
    if (btnExample) {
      btnExample.addEventListener("click", () => {
        setValue("fixedCost", 5200000);
        setValue("variableRate", 38);
        setValue("openDays", 25);
        setValue("hoursPerDay", 10);
        setValue("targetSales", 18000000);
        run();
      });
    }

    bind(["fixedCost","variableRate","openDays","hoursPerDay","targetSales"], run);
    safeRun(applyBEPQueryIfAny);
    run();
  }

  // Labor cost
  if ($("lcHourly") && $("lcHours")) {
    const run = () => safeRun(calcLaborCost);

    const btn = $("btnCalcLC");
    if (btn) btn.addEventListener("click", run);

    bind(
      [
        "lcHourly","lcHours","lcDays","lcCount","lcHoliday","lcExtraHours","lcInsurance",
        "lcIndustrialRate","lcIndustrialPreset","lcOwnerDevRate","lcSeverance",
        "lcVarRate","lcOpenDays","lcHoursPerDay","lcTargetSales",
      ],
      run
    );
    run();
  }

  // Hourly
  if ($("hourlyWage") && $("hoursPerDayH")) {
    const run = () => safeRun(calcHourly);

    const btn = $("btnCalcH");
    if (btn) btn.addEventListener("click", run);

    bind(["hourlyWage","hoursPerDayH","daysPerWeekH","breakMinH","overtimeWeekH","includeHolidayH"], run);
    run();
  }

  // Salary net
  if ($("grossS") && $("depS")) {
    const run = () => safeRun(calcSalaryNet);

    const btn = $("btnCalcS");
    if (btn) btn.addEventListener("click", run);

    bind(["grossS","depS","presetS","includeTaxS"], run);
    run();
  }
}
