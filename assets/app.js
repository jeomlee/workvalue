/* ============================================================================
  WorkValue 계산기 모음 (전체)
  - 자영업 BEP 계산기: calcBEP
  - 실수령 시급 계산기(단순): calcHourly
  - 월급 실수령액 계산기(추정): calcSalaryNet
  - 알바/근로자 인건비(킬러): calcLaborCost
============================================================================ */

function $(id) {
  return document.getElementById(id);
}
function exists(el) {
  return !!el;
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
function pct(n) {
  const x = num(n, 0) * 100;
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
function checked(id) {
  const el = $(id);
  return !!(el && el.checked);
}
function readSelect(id) {
  const el = $(id);
  return el ? el.value : "";
}

function parseQuery() {
  const q = {};
  const usp = new URLSearchParams(location.search);
  for (const [k, v] of usp.entries()) q[k] = v;
  return q;
}

/* ============================================================================
  1) 자영업 손익분기점(BEP)
============================================================================ */
export function calcBEP() {
  // 입력
  const fixedCost = Math.max(0, num($("fixedCost")?.value, 0));
  const variableRatePct = clamp(num($("variableRate")?.value, 0), 0, 100);
  const variableRate = variableRatePct / 100;

  const openDays = Math.max(1, Math.floor(num($("openDays")?.value, 26)));
  const hoursPerDay = Math.max(1, num($("hoursPerDay")?.value, 10));
  const targetSales = Math.max(0, num($("targetSales")?.value, 0));

  // 계산
  // BEP = fixed / (1 - variableRate)  (variableRate < 1)
  const denom = 1 - variableRate;
  const bep = denom > 0 ? fixedCost / denom : Infinity;
  const bepDaily = Number.isFinite(bep) ? bep / openDays : Infinity;

  const profit = targetSales - targetSales * variableRate - fixedCost;
  const totalHours = openDays * hoursPerDay;
  const ownerHourly = totalHours > 0 ? profit / totalHours : 0;

  // 출력 KPI
  setText("kpiBEP", Number.isFinite(bep) ? won(bep) : "계산이 불가능합니다");
  setText("kpiBEPDaily", Number.isFinite(bepDaily) ? won(bepDaily) : "계산이 불가능합니다");
  setText("kpiProfit", won(profit));
  setText("kpiOwnerHourly", won(ownerHourly));

  // 표 생성(손익분기점 전후 구간)
  const body = $("bepTableBody");
  if (!body) return;

  const rows = [];
  // 기준 구간: BEP 기준 -40% ~ +60% (최소 5개)
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
  const hourlyWage = Math.max(0, num($("hourlyWage")?.value, 0));
  const hoursPerDay = Math.max(0, num($("hoursPerDayH")?.value, 0));
  const daysPerWeek = clamp(Math.floor(num($("daysPerWeekH")?.value, 0)), 0, 7);
  const breakMin = Math.max(0, num($("breakMinH")?.value, 0));
  const overtimeWeek = Math.max(0, num($("overtimeWeekH")?.value, 0));
  const includeHoliday = checked("includeHolidayH");

  const paidHoursPerDay = Math.max(0, hoursPerDay - breakMin / 60);
  const weeklyPaidHours = paidHoursPerDay * daysPerWeek;

  // 주휴시간(단순): 주 15시간 이상 & 포함 체크 시, 1일 소정근로시간 만큼(= 주근로시간/근무일수)
  const holidayHours =
    includeHoliday && weeklyPaidHours >= 15 && daysPerWeek > 0 ? weeklyPaidHours / daysPerWeek : 0;

  const baseWeekly = (weeklyPaidHours + holidayHours) * hourlyWage;

  // 초과근로 가산(단순 50%): overtimeWeek * hourlyWage * 0.5
  const overtimePremium = overtimeWeek * hourlyWage * 0.5;
  const weekly = baseWeekly + overtimePremium;

  // 월 환산(월 평균 주수 4.345)
  const monthly = weekly * 4.345;

  const totalWeekHours = weeklyPaidHours + holidayHours + overtimeWeek;

  setText("kpiWeeklyH", won(weekly));
  setText("kpiMonthlyH", won(monthly));
  setText("kpiHoursH", (Math.round(totalWeekHours * 10) / 10).toLocaleString("ko-KR") + "시간");
}

/* ============================================================================
  3) 월급 실수령액(추정)
    - 법정/공식 계산기를 완전히 대체하지 않고 “추정 구조”로 설계
============================================================================ */
export function calcSalaryNet() {
  const gross = Math.max(0, num($("grossS")?.value, 0));
  const dep = Math.max(1, Math.floor(num($("depS")?.value, 1)));
  const preset = readSelect("presetS") || "standard";
  const includeTax = checked("includeTaxS");

  // 프리셋 기반 단순 추정 비율(과장 금지 목적: 보수적으로)
  // ※ 실제와 다를 수 있으므로 “추정” KPI로만 출력
  let rateNPS = 0.0475;   // 국민연금(근로자)
  let rateHI = 0.03595;   // 건강보험(근로자)
  let rateEI = 0.009;     // 고용보험(근로자, 실업급여분 단순)

  // 프리셋 보정
  let taxBaseRate = 0.02; // 소득세(아주 단순 추정)
  if (preset === "light") taxBaseRate = 0.012;
  if (preset === "heavy") taxBaseRate = 0.035;

  // 부양가족이 늘면 세금 추정치를 약간 낮추는 정도만 반영(과도한 정확성 주장 금지)
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
  setText("kpiRateS", pct(gross > 0 ? totalDeduct / gross : 0));

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
    - 근로자: 세전/공제후
    - 사장님: 총부담(급여 + 사업주 부담 4대보험 + 산재 + 고용안정/직능(옵션) + 퇴직금(옵션))
    - N명 확장
    - 산재 업종 프리셋 지원(선택)
    - BEP로 보내기 링크 생성 지원
============================================================================ */

// 산재 업종 프리셋(예시용): 실제 요율은 매년 고시/업종에 따라 달라질 수 있어 “선택 편의”로만 제공
// 페이지에 select를 만들어 이 값을 쓰시면 됩니다.
const INDUSTRIAL_PRESETS = {
  "direct": { label: "직접 입력", rate: null },
  "cafe": { label: "카페/음료(예시)", rate: 1.0 },
  "restaurant": { label: "일반 음식점(예시)", rate: 1.2 },
  "delivery": { label: "배달/라이더(예시)", rate: 2.0 },
  "office": { label: "사무/일반(예시)", rate: 0.7 },
};

function safeRatePercentToDecimal(percent) {
  const p = num(percent, 0);
  return clamp(p, 0, 99) / 100;
}

function calcHolidayPayMonthly({ hourly, monthlyHours, weeklyWorkDays, includeHoliday }) {
  // 월근무시간 -> 주근무시간(월 평균 주수 4.345)
  const weeklyHours = monthlyHours / 4.345;

  // 주휴 적용(단순): 주 15시간 이상
  if (!includeHoliday || weeklyHours < 15) return 0;

  // 주휴시간(단순): 1일 소정근로시간 = 주근로시간 / 주근무일수
  const holidayHoursWeekly = weeklyWorkDays > 0 ? weeklyHours / weeklyWorkDays : 0;
  const holidayPayMonthly = holidayHoursWeekly * hourly * 4.345;
  return holidayPayMonthly;
}

function calcPremiumPay({ hourly, extraHoursMonthly, premiumRate }) {
  // 가산수당(단순): extraHours * hourly * premiumRate
  return Math.max(0, extraHoursMonthly) * hourly * premiumRate;
}

function buildBreakdownLine(label, value) {
  return `<li>${label}: <b>${won(value)}</b></li>`;
}

function setMaybeList(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function setMaybeLink(id, href) {
  const el = $(id);
  if (!el) return;
  el.setAttribute("href", href);
}

/**
 * BEP 링크 생성(인건비를 월 고정비로 편의 반영하는 방식)
 * - 인건비가 “고정 근무 스케줄” 기반이면 사실상 고정비 성격이 강하므로 연동 가치가 큽니다.
 */
function makeBEPLinkFromLabor({ monthlyLaborTotal, variableRatePct = 35, openDays = 26, hoursPerDay = 10, targetSales = 15000000 }) {
  const url = new URL("/business/bep.html", location.origin);
  url.searchParams.set("fixedCost", String(Math.round(monthlyLaborTotal)));
  url.searchParams.set("variableRate", String(variableRatePct));
  url.searchParams.set("openDays", String(openDays));
  url.searchParams.set("hoursPerDay", String(hoursPerDay));
  url.searchParams.set("targetSales", String(targetSales));
  return url.toString();
}

/**
 * labor-cost 페이지에서 query param을 받으면 자동 채우기(선택)
 */
function applyLaborQueryIfAny() {
  const q = parseQuery();
  // 예: ?hourly=10320&hours=160&days=5&count=2
  if (q.hourly) setValue("lcHourly", q.hourly);
  if (q.hours) setValue("lcHours", q.hours);
  if (q.days) setValue("lcDays", q.days);
  if (q.count) setValue("lcCount", q.count);
  if (q.extra) setValue("lcExtraHours", q.extra);
  if (q.industrialRate) setValue("lcIndustrialRate", q.industrialRate);
  if (q.insurance) {
    const el = $("lcInsurance");
    if (el) el.checked = q.insurance === "1" || q.insurance === "true";
  }
  if (q.holiday) {
    const el = $("lcHoliday");
    if (el) el.checked = q.holiday === "1" || q.holiday === "true";
  }
  if (q.severance) {
    const el = $("lcSeverance");
    if (el) el.checked = q.severance === "1" || q.severance === "true";
  }
}

export function calcLaborCost(opts = {}) {
  // labor-cost 페이지가 아니라면 조용히 종료
  if (!document.getElementById("lcHourly") || !document.getElementById("lcHours")) return;

  const $ = (id) => document.getElementById(id);
  const n = (v, f = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : f;
  };
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  const won = (x) => Math.round(n(x, 0)).toLocaleString("ko-KR") + "원";

  // ====== 업종 프리셋(예시) ======
  const PRESET_RATE = {
    direct: null,
    cafe: 1.0,
    restaurant: 1.2,
    office: 0.7,
    delivery: 2.0
  };

  // 프리셋 선택 시 산재 요율 자동 입력
  const presetEl = $("lcIndustrialPreset");
  const rateEl = $("lcIndustrialRate");
  if (presetEl && rateEl) {
    const key = presetEl.value || "direct";
    const r = PRESET_RATE[key];
    if (r != null) rateEl.value = String(r);
  }

  // ====== 입력 ======
  const hourly = Math.max(0, n($("lcHourly")?.value, 0));
  const monthlyHours = Math.max(0, n($("lcHours")?.value, 0));
  const weeklyDays = clamp(Math.floor(n($("lcDays")?.value, 5)), 1, 7);
  const count = Math.max(1, Math.floor(n($("lcCount")?.value, 1)));

  const holidayOn = !!$("lcHoliday")?.checked;
  const extraHoursMonthly = Math.max(0, n($("lcExtraHours")?.value, 0));

  const insuranceOn = !!$("lcInsurance")?.checked;
  const severanceOn = !!$("lcSeverance")?.checked;

  const industrialRate = clamp(n($("lcIndustrialRate")?.value, 0), 0, 99) / 100;
  const ownerDevRate = clamp(n($("lcOwnerDevRate")?.value, 0), 0, 99) / 100;

  // BEP 연동 입력
  const varRatePct = clamp(n($("lcVarRate")?.value, 35), 0, 100);
  const varRate = varRatePct / 100;
  const openDays = Math.max(1, Math.floor(n($("lcOpenDays")?.value, 26)));
  const hoursPerDay = Math.max(1, n($("lcHoursPerDay")?.value, 10));
  const targetSales = Math.max(0, n($("lcTargetSales")?.value, 15000000));

  // ====== 보험료율(단순 추정치) ======
  const RATE = {
    worker: { nps: 0.0475, hi: 0.03595, ei: 0.009 },
    owner:  { nps: 0.0475, hi: 0.03595, ei: 0.009 }
  };

  // ====== 계산(1인 기준) ======
  const basePay = hourly * monthlyHours;

  // 주휴(월 환산): 주근로시간 = 월근로시간 / 4.345
  const weeklyHours = monthlyHours / 4.345;
  const holidayPayMonthly = (holidayOn && weeklyHours >= 15)
    ? (weeklyHours / weeklyDays) * hourly * 4.345
    : 0;

  // 가산수당(50% 가산분만)
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

  // ====== 합계(N명) ======
  const workerGross = workerGross1 * count;
  const workerIns = workerIns1 * count;
  const workerNet = workerGross - workerIns;

  const ownerTotal = workerGross + (ownerIns1 + industrial1 + dev1 + severance1) * count;
  const ownerHourly = (monthlyHours > 0) ? ownerTotal / (monthlyHours * count) : 0;

  // ====== KPI 출력 ======
  const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
  setText("kpiWorkerGross", won(workerGross));
  setText("kpiWorkerNet", won(workerNet));
  setText("kpiOwnerTotal", won(ownerTotal));
  setText("kpiOwnerHourly", won(ownerHourly));

  // 상세 내역
  const li = (k, v) => `<li>${k}: <b>${won(v)}</b></li>`;
  const workerUl = $("lcWorkerBreakdown");
  if (workerUl) {
    workerUl.innerHTML = [
      li("기본급(합계)", basePay * count),
      li("주휴수당(합계)", holidayPayMonthly * count),
      li("가산수당(합계, 50% 가산분)", premiumPay * count),
      li("세전 합계", workerGross),
      insuranceOn ? li("근로자 부담(추정, 4대보험)", workerIns) : "",
      li("공제 후(추정)", workerNet),
    ].filter(Boolean).join("");
  }

  const ownerUl = $("lcOwnerBreakdown");
  if (ownerUl) {
    ownerUl.innerHTML = [
      li("급여 지급(세전 합계)", workerGross),
      insuranceOn ? li("사업주 부담(추정, 4대보험)", ownerIns1 * count) : "",
      li("산재보험(사업주)", industrial1 * count),
      ownerDevRate > 0 ? li("고용안정·직능(사업주, 선택)", dev1 * count) : "",
      severanceOn ? li("퇴직금 월 환산(선택)", severance1 * count) : "",
      li("사장님 총부담", ownerTotal),
    ].filter(Boolean).join("");
  }

  // ====== ① BEP 링크 자동 채우기(강화) ======
  // 인건비를 월 고정비로 가정해 보수적으로 연동
  const bepUrl = new URL("/business/bep.html", location.origin);
  bepUrl.searchParams.set("fixedCost", String(Math.round(ownerTotal)));
  bepUrl.searchParams.set("variableRate", String(varRatePct));
  bepUrl.searchParams.set("openDays", String(openDays));
  bepUrl.searchParams.set("hoursPerDay", String(hoursPerDay));
  bepUrl.searchParams.set("targetSales", String(targetSales));

  const toBep = $("lcToBEP");
  if (toBep) toBep.setAttribute("href", bepUrl.toString());

  // ====== ③ 직원 1명 추가 시 필요한 추가 매출(월/일) ======
  // 직원 1명 총부담(1인 기준)을 “마진(1-변동비율)”로 나누어 필요한 추가 매출로 환산
  const perWorkerOwnerTotal = workerGross1 + ownerIns1 + industrial1 + dev1 + severance1;
  const margin = 1 - varRate;

  const needSalesMonthly = (margin > 0) ? (perWorkerOwnerTotal / margin) : Infinity;
  const needSalesDaily = Number.isFinite(needSalesMonthly) ? (needSalesMonthly / openDays) : Infinity;

  // plusOneMode일 때도 동일 계산(버튼은 “강조 UX”용)
  setText("kpiPlusOneSales", Number.isFinite(needSalesMonthly) ? won(needSalesMonthly) : "계산이 불가능합니다");
  setText("kpiPlusOneSalesDaily", Number.isFinite(needSalesDaily) ? won(needSalesDaily) : "계산이 불가능합니다");

  // ====== 근무시간 시뮬레이션 표 ======
  const tb = $("lcTableBody");
  if (tb) {
    const mults = [0.8, 1.0, 1.2, 1.5];
    tb.innerHTML = mults.map((m) => {
      const h = Math.round(monthlyHours * m);
      const weeklyH = h / 4.345;
      const holM = (holidayOn && weeklyH >= 15) ? (weeklyH / weeklyDays) * hourly * 4.345 : 0;
      const premM = premiumPay; // 비교를 위해 동일(가산시간이 별도 입력이므로)
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
    }).join("");
  }
}


/* ============================================================================
  5) BEP 페이지 query param 자동 채우기(있으면 적용)
     - /business/bep.html?fixedCost=... 형태 지원
============================================================================ */
export function applyBEPQueryIfAny() {
  if (!exists($("fixedCost")) || !exists($("variableRate"))) return;
  const q = parseQuery();
  if (q.fixedCost) setValue("fixedCost", q.fixedCost);
  if (q.variableRate) setValue("variableRate", q.variableRate);
  if (q.openDays) setValue("openDays", q.openDays);
  if (q.hoursPerDay) setValue("hoursPerDay", q.hoursPerDay);
  if (q.targetSales) setValue("targetSales", q.targetSales);
}

/* ============================================================================
  6) 페이지별 자동 실행(있으면 실행)
============================================================================ */
(function autoBoot() {
  try {
    // BEP query 자동 채우기
    applyBEPQueryIfAny();

    // 페이지에 버튼이 없는 경우에도 최초 1회 계산이 되도록
    if (exists($("fixedCost")) && exists($("variableRate"))) calcBEP();
    if (exists($("hourlyWage")) && exists($("hoursPerDayH"))) calcHourly();
    if (exists($("grossS")) && exists($("presetS"))) calcSalaryNet();
    if (exists($("lcHourly")) && exists($("lcHours"))) calcLaborCost();
  } catch (e) {
    // 조용히 실패 (프로덕션에서 콘솔 노이즈 최소화)
  }
})();
