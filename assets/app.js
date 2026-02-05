/* ============================================================================
  WorkValue 계산기 모음 (전체)
  - 자영업 BEP 계산기: calcBEP
  - 실수령 시급 계산기(단순): calcHourly
  - 월급 실수령액 계산기(추정): calcSalaryNet
  - 알바/근로자 인건비(킬러): calcLaborCost
  + 공통 초기화: initWorkValue (헤더 active + 각 페이지 자동 바인딩)
============================================================================ */

function $(id) {
  return document.getElementById(id);
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
  const usp = new URLSearchParams(location.search);
  for (const [k, v] of usp.entries()) q[k] = v;
  return q;
}

/* ============================================================================
  공통: 네비 active 표시 (모든 페이지 헤더 동일 UX)
============================================================================ */
function normalizePath(p) {
  // /business/bep , /business/bep.html 둘 다 대응
  if (!p) return "/";
  if (p.endsWith("/")) p = p.slice(0, -1);
  return p;
}
function setActiveNav() {
  const header = document.querySelector("header");
  if (!header) return;

  const nav = header.querySelector("nav");
  if (!nav) return;

  const current = normalizePath(location.pathname);

  const links = Array.from(nav.querySelectorAll("a"));
  links.forEach((a) => a.classList.remove("active"));

  // 링크도 normalize해서 매칭
  const match = links.find((a) => {
    try {
      const u = new URL(a.getAttribute("href") || "", location.origin);
      const hp = normalizePath(u.pathname);
      // /business/bep 와 /business/bep.html을 동일 취급
      const hp2 = hp.endsWith(".html") ? hp.slice(0, -5) : hp;
      const cur2 = current.endsWith(".html") ? current.slice(0, -5) : current;
      return hp === current || hp2 === cur2;
    } catch {
      return false;
    }
  });

  if (match) match.classList.add("active");
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

// 산재 업종 프리셋(입력 편의용 예시)
const INDUSTRIAL_PRESETS = {
  direct: { label: "직접 입력하기", rate: null },
  cafe: { label: "카페/음료(예시)", rate: 1.0 },
  restaurant: { label: "일반 음식점(예시)", rate: 1.2 },
  office: { label: "사무/일반(예시)", rate: 0.7 },
  delivery: { label: "배달/라이더(예시)", rate: 2.0 },
};

export function calcLaborCost() {
  if (!$("lcHourly") || !$("lcHours")) return;

  // ✅ 프리셋 로직: 사용자가 산재요율 직접 수정하면 이후 자동 덮어쓰기 방지
  const presetEl = $("lcIndustrialPreset");
  const rateEl = $("lcIndustrialRate");

  const presetKey = readSelect("lcIndustrialPreset") || "direct";
  const presetRate = INDUSTRIAL_PRESETS[presetKey]?.rate ?? null;

  // preset 변경 이벤트에서만 userEdited를 리셋하고 덮어쓰기 허용
  const presetChanged = presetEl && presetEl.dataset.lastPreset !== presetKey;
  if (presetEl) presetEl.dataset.lastPreset = presetKey;

  if (presetChanged && rateEl) rateEl.dataset.userEdited = "0";

  if (presetRate != null && rateEl) {
    const userEdited = rateEl.dataset.userEdited === "1";
    if (!userEdited) rateEl.value = String(presetRate);
  }

  // 1) 입력값
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

  // BEP 연동 입력
  const varRatePct = clamp(num($("lcVarRate")?.value, 35), 0, 100);
  const varRate = varRatePct / 100;
  const openDays = Math.max(1, Math.floor(num($("lcOpenDays")?.value, 26)));
  const hoursPerDay = Math.max(1, num($("lcHoursPerDay")?.value, 10));
  const targetSales = Math.max(0, num($("lcTargetSales")?.value, 15000000));

  // 2) 요율(단순 추정치)
  const RATE = {
    worker: { nps: 0.0475, hi: 0.03595, ei: 0.009 },
    owner: { nps: 0.0475, hi: 0.03595, ei: 0.009 },
  };

  // 3) 1인 기준 계산
  const basePay = hourly * monthlyHours;

  // 주휴(월 환산): 주근로시간 = 월근로시간 / 4.345
  const weeklyHours = monthlyHours / 4.345;
  const holidayPayMonthly =
    holidayOn && weeklyHours >= 15
      ? (weeklyHours / weeklyDays) * hourly * 4.345
      : 0;

  // 가산수당(단순): 입력한 “연장·야간·휴일근로 시간(월)”에 대해 50% 가산분만 반영
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

  // 4) N명 합계
  const workerGross = workerGross1 * count;
  const workerIns = workerIns1 * count;
  const workerNet = workerGross - workerIns;

  const ownerTotal = workerGross + (ownerIns1 + industrial1 + dev1 + severance1) * count;
  const ownerHourly = monthlyHours > 0 ? ownerTotal / (monthlyHours * count) : 0;

  // 5) KPI 출력
  setText("kpiWorkerGross", won(workerGross));
  setText("kpiWorkerNet", won(workerNet));
  setText("kpiOwnerTotal", won(ownerTotal));
  setText("kpiOwnerHourly", won(ownerHourly));

  // 6) 상세 내역
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

  // 7) BEP 링크 자동 채우기
  const bepUrl = new URL("/business/bep.html", location.origin);
  bepUrl.searchParams.set("fixedCost", String(Math.round(ownerTotal)));
  bepUrl.searchParams.set("variableRate", String(varRatePct));
  bepUrl.searchParams.set("openDays", String(openDays));
  bepUrl.searchParams.set("hoursPerDay", String(hoursPerDay));
  bepUrl.searchParams.set("targetSales", String(targetSales));

  const toBep = $("lcToBEP");
  if (toBep) toBep.setAttribute("href", bepUrl.toString());

  // 8) 직원 1명 추가 시 필요한 추가 매출(월/일)
  const perWorkerOwnerTotal = workerGross1 + ownerIns1 + industrial1 + dev1 + severance1;
  const margin = 1 - varRate;

  const needSalesMonthly = margin > 0 ? perWorkerOwnerTotal / margin : Infinity;
  const needSalesDaily = Number.isFinite(needSalesMonthly) ? needSalesMonthly / openDays : Infinity;

  setText("kpiPlusOneSales", Number.isFinite(needSalesMonthly) ? won(needSalesMonthly) : "계산이 불가능합니다");
  setText("kpiPlusOneSalesDaily", Number.isFinite(needSalesDaily) ? won(needSalesDaily) : "계산이 불가능합니다");

  // 9) 근무시간 시뮬레이션 표
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
  공통 바인딩: 요소가 있으면 자동 계산 + input/change 연결
============================================================================ */
function bindRun(ids, run) {
  ids.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", run);
    el.addEventListener("change", run);
  });
}

function bindButtons(btnId, run) {
  const b = $(btnId);
  if (b) b.addEventListener("click", run);
}

/* ============================================================================
  initWorkValue: 모든 페이지에서 이것만 호출하면 됨
============================================================================ */
export function initWorkValue() {
  // footer year
  const y = $("y");
  if (y) y.textContent = new Date().getFullYear();

  // nav active
  setActiveNav();

  // ---- 페이지별 자동 연결 ----

  // BEP
  if ($("fixedCost") && $("variableRate")) {
    applyBEPQueryIfAny();
    bindButtons("btnCalc", calcBEP);
    bindButtons("btnExample", () => {
      setValue("fixedCost", 5200000);
      setValue("variableRate", 38);
      setValue("openDays", 25);
      setValue("hoursPerDay", 10);
      setValue("targetSales", 18000000);
      calcBEP();
    });
    bindRun(["fixedCost","variableRate","openDays","hoursPerDay","targetSales"], calcBEP);
    calcBEP();
  }

  // Hourly
  if ($("hourlyWage") && $("hoursPerDayH")) {
    bindButtons("btnCalcH", calcHourly);
    bindRun(["hourlyWage","hoursPerDayH","daysPerWeekH","breakMinH","overtimeWeekH","includeHolidayH"], calcHourly);
    calcHourly();
  }

  // SalaryNet
  if ($("grossS") && $("depS")) {
    bindButtons("btnCalcS", calcSalaryNet);
    bindRun(["grossS","depS","presetS","includeTaxS"], calcSalaryNet);
    calcSalaryNet();
  }

  // LaborCost
  if ($("lcHourly") && $("lcHours")) {
    const run = () => calcLaborCost();

    // 산업요율 직접 수정 감지 → 이후 preset이 자동 덮어쓰기 안 하도록
    const rateEl = $("lcIndustrialRate");
    if (rateEl) {
      rateEl.addEventListener("input", () => (rateEl.dataset.userEdited = "1"));
      rateEl.addEventListener("change", () => (rateEl.dataset.userEdited = "1"));
    }

    bindButtons("btnCalcLC", run);
    bindRun(
      [
        "lcHourly","lcHours","lcDays","lcCount","lcHoliday","lcExtraHours","lcInsurance",
        "lcIndustrialRate","lcIndustrialPreset","lcOwnerDevRate","lcSeverance",
        "lcVarRate","lcOpenDays","lcHoursPerDay","lcTargetSales"
      ],
      run
    );

    run();
  }
}


/* ============================================================================
  가격 변경(인상/할인) 손익 영향 계산기: calcPriceDecision
  - 현재/변경후 공헌이익, 영업이익, 손익 변화, 변경 후 BEP 판매량
============================================================================ */

(function () {
  function safeText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function fmtQty(n) {
    const x = Math.round(Number.isFinite(n) ? n : 0);
    return x.toLocaleString("ko-KR") + "개";
  }

  function signWon(n) {
    const v = Math.round(num(n, 0));
    const s = (v >= 0 ? "+" : "-") + Math.abs(v).toLocaleString("ko-KR") + "원";
    return s;
  }

  function calcPriceDecision(input) {
    const priceNow = num(input.priceNow, 0);
    const priceNew = num(input.priceNew, 0);
    const varCost = num(input.varCost, 0);
    const qtyNow = num(input.qtyNow, 0);
    const qtyChangePct = num(input.qtyChangePct, 0); // 예: -8
    const fixedCost = num(input.fixedCost, 0);

    // 방어
    const qtyNew = Math.max(0, qtyNow * (1 + qtyChangePct / 100));
    const cmPerNow = priceNow - varCost; // 공헌이익/개
    const cmPerNew = priceNew - varCost;

    const cmNow = cmPerNow * qtyNow;
    const cmNew = cmPerNew * qtyNew;

    const opNow = cmNow - fixedCost;
    const opNew = cmNew - fixedCost;

    const delta = opNew - opNow;

    const bepQtyNew = cmPerNew > 0 ? fixedCost / cmPerNew : Infinity;

    return {
      qtyNew,
      cmPerNow,
      cmPerNew,
      cmNow,
      cmNew,
      opNow,
      opNew,
      delta,
      bepQtyNew,
    };
  }

function buildComment(res, input) {
  const priceDiff = num(input.priceNew, 0) - num(input.priceNow, 0);
  const qtyChange = res.qtyNew - num(input.qtyNow, 0);

  if (!Number.isFinite(res.delta)) {
    return "입력하신 값을 다시 한 번 확인해 주시기 바랍니다.";
  }

  if (res.cmPerNew <= 0) {
    return "변경 후 판매가가 변동비보다 낮습니다. 이 구조에서는 판매량이 늘어날수록 손실이 커질 수 있습니다.";
  }

  if (res.delta > 0) {
    return `가정하신 조건 기준으로는 가격 ${
      priceDiff >= 0 ? "인상" : "인하"
    }이 유리한 선택으로 보입니다.
월 손익이 약 ${signWon(res.delta)} 개선됩니다.
(판매량 변화: ${Math.round(qtyChange).toLocaleString("ko-KR")}개)`;
  }

  if (res.delta < 0) {
    return `가정하신 조건 기준으로는 가격 ${
      priceDiff >= 0 ? "인상" : "인하"
    }이 불리한 선택으로 보입니다.
월 손익이 약 ${signWon(res.delta)} 감소합니다.
(판매량 변화: ${Math.round(qtyChange).toLocaleString("ko-KR")}개)`;
  }

  return "가정하신 조건 기준으로는 손익 변화가 거의 없습니다. 판매량 변화율(%)을 조정하여 다시 계산해 보시기 바랍니다.";
}


  // 차트 1개: 현재 vs 변경후(공헌이익/영업이익)
  let _pdChart = null;
  function renderChart(cmNow, cmNew, opNow, opNew) {
    const ctx = document.getElementById("pd_chart");
    if (!ctx || typeof Chart === "undefined") return;

    const data = {
      labels: ["현재", "변경 후"],
      datasets: [
        { label: "월 공헌이익", data: [cmNow, cmNew] },
        { label: "월 영업이익", data: [opNow, opNew] },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: function (c) {
              const v = c.parsed.y;
              return `${c.dataset.label}: ${won(v)}`;
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: function (v) {
              // 너무 길어지면 보기 안 좋아서 “원”만
              return Number(v).toLocaleString("ko-KR");
            },
          },
        },
      },
    };

    if (_pdChart) _pdChart.destroy();
    _pdChart = new Chart(ctx, { type: "bar", data, options });
  }

  function bind() {
    const btn = document.getElementById("pd_calc_btn");
    const reset = document.getElementById("pd_reset_btn");

    function read() {
      return {
        priceNow: document.getElementById("pd_price_now")?.value,
        priceNew: document.getElementById("pd_price_new")?.value,
        varCost: document.getElementById("pd_var_cost")?.value,
        qtyNow: document.getElementById("pd_qty_now")?.value,
        qtyChangePct: document.getElementById("pd_qty_change_pct")?.value,
        fixedCost: document.getElementById("pd_fixed_cost")?.value,
      };
    }

    function render() {
      const input = read();
      const res = calcPriceDecision(input);

      safeText("pd_kpi_cm_now", won(res.cmNow));
      safeText("pd_kpi_cm_new", won(res.cmNew));
      safeText("pd_kpi_delta", signWon(res.delta));
      safeText("pd_kpi_op_now", won(res.opNow));
      safeText("pd_kpi_op_new", won(res.opNew));

      const bepText = Number.isFinite(res.bepQtyNew)
        ? fmtQty(res.bepQtyNew)
        : "불가(공헌이익≤0)";
      safeText("pd_kpi_bep_qty", bepText);

      safeText("pd_comment", buildComment(res, input));

      renderChart(res.cmNow, res.cmNew, res.opNow, res.opNew);
    }

    function doReset() {
      const ids = [
        "pd_price_now",
        "pd_price_new",
        "pd_var_cost",
        "pd_qty_now",
        "pd_qty_change_pct",
        "pd_fixed_cost",
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

      safeText("pd_kpi_cm_now", "-");
      safeText("pd_kpi_cm_new", "-");
      safeText("pd_kpi_delta", "-");
      safeText("pd_kpi_op_now", "-");
      safeText("pd_kpi_op_new", "-");
      safeText("pd_kpi_bep_qty", "-");
      safeText("pd_comment", "값을 넣고 계산해줘.");

      if (_pdChart) {
        _pdChart.destroy();
        _pdChart = null;
      }
    }

    if (btn) btn.addEventListener("click", render);
    if (reset) reset.addEventListener("click", doReset);

    // 입력할 때 바로 반영(원하면 주석 해제)
    // ["pd_price_now","pd_price_new","pd_var_cost","pd_qty_now","pd_qty_change_pct","pd_fixed_cost"].forEach((id)=>{
    //   const el = document.getElementById(id);
    //   if (el) el.addEventListener("input", render);
    // });
  }

  // 외부에서 호출
  window.initPriceDecision = function () {
    // 페이지에 요소가 없으면 스킵
    if (!document.getElementById("pd_calc_btn")) return;
    bind();
  };
})();


/* ============================================================================
  WorkValue 공통 레이아웃(헤더/푸터) 주입
  - 모든 페이지에서 <header id="wvHeaderMount"></header> 만 두면 공통 네비 생성
  - 현재 경로 기준 active 자동 처리
============================================================================ */
(function () {
  function wvPath() {
    try {
      return (location.pathname || "/").replace(/\/+$/, "") || "/";
    } catch {
      return "/";
    }
  }

  function isActive(href) {
    const p = wvPath();
    const target = (href || "/").replace(/\/+$/, "") || "/";
    if (target === "/") return p === "/";
    return p === target;
  }

  function navLink(href, text) {
    const active = isActive(href) ? "active" : "";
    return `<a class="${active}" href="${href}">${text}</a>`;
  }

  function headerHTML() {
    return `
<header class="site-header" id="wvHeader">
  <div class="container">
    <a class="brand" href="/" aria-label="WorkValue 홈으로 이동">
      <div class="dot"></div>
      <div class="t">
        <strong>WorkValue</strong>
        <span>급여·근로·자영업 계산을 빠르게 확인하실 수 있습니다</span>
      </div>
    </a>

    <nav class="nav" aria-label="이동">
      ${navLink("/", "홈")}
      ${navLink("/business/bep.html", "자영업 BEP")}
      ${navLink("/business/labor-cost.html", "인건비 계산")}
      ${navLink("/business/price-decision.html", "가격 결정")}
      ${navLink("/employee/hourly.html", "단순 급여 추정")}
      ${navLink("/employee/salary-net.html", "월급 실수령(추정)")}
    </nav>
  </div>
</header>`;
  }

  function footerHTML() {
    return `
<footer class="site-footer" id="wvFooter">
  <div class="container">
    <a href="/contact">문의</a>
    <span class="dot">·</span>
    <a href="/terms">이용약관</a>
    <span class="dot">·</span>
    <a href="/privacy">개인정보처리방침</a>
  </div>
</footer>`;
  }

  function mount(targetId, html, position = "replace") {
    const el = document.getElementById(targetId);
    if (!el) return false;

    if (position === "replace") el.outerHTML = html;
    else el.innerHTML = html;

    return true;
  }

  // 외부에서 호출할 엔트리
  window.wvMountLayout = function () {
    // 헤더 주입 (권장: wvHeaderMount 사용)
    // 1) 최신 방식: <header id="wvHeaderMount"></header>
    const okHeader = mount("wvHeaderMount", headerHTML(), "replace");

    // 2) 예전 fallback: 혹시 <header id="wvHeader">...</header> 가 남아있으면 메뉴만 동기화
    if (!okHeader) {
      const legacy = document.getElementById("wvHeader");
      if (legacy) legacy.outerHTML = headerHTML();
    }

    // 푸터 주입 (권장: wvFooterMount 사용)
    const okFooter = mount("wvFooterMount", footerHTML(), "replace");
    if (!okFooter) {
      const legacyF = document.getElementById("wvFooter");
      if (legacyF) legacyF.outerHTML = footerHTML();
    }
  };
})();
