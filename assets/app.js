// /assets/app.js (ESM module)
export function formatKRW(n) {
  const x = Math.round(Number(n) || 0);
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
}
export function formatPct(n) {
  const x = Number(n) || 0;
  return (Math.round(x * 10) / 10).toFixed(1) + "%";
}
function num(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = Number(el.value);
  return Number.isFinite(v) ? v : fallback;
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* =========================
   BEP 계산기
========================= */
export function calcBEP() {
  const fixedCost = Math.max(0, num("fixedCost", 0));
  const variableRatePct = Math.min(100, Math.max(0, num("variableRate", 0)));
  const openDays = Math.max(1, num("openDays", 26));
  const hoursPerDay = Math.max(1, num("hoursPerDay", 10));
  const targetSales = Math.max(0, num("targetSales", 0));

  const vr = variableRatePct / 100;
  const contribution = 1 - vr;

  const bep = contribution <= 0 ? Infinity : (fixedCost / contribution);
  const bepDaily = (Number.isFinite(bep) ? (bep / openDays) : Infinity);

  function profit(sales) {
    return sales - (sales * vr) - fixedCost;
  }
  function ownerHourly(sales) {
    const p = profit(sales);
    const totalHours = openDays * hoursPerDay;
    return totalHours > 0 ? (p / totalHours) : 0;
  }

  setText("kpiBEP", Number.isFinite(bep) ? formatKRW(bep) : "계산이 불가합니다");
  setText("kpiBEPDaily", Number.isFinite(bepDaily) ? formatKRW(bepDaily) : "계산이 불가합니다");
  setText("kpiProfit", formatKRW(profit(targetSales)));
  setText("kpiOwnerHourly", formatKRW(ownerHourly(targetSales)));

  // 표 자동 생성: BEP 전후 구간
  const tbody = document.getElementById("bepTableBody");
  if (tbody) {
    tbody.innerHTML = "";
    let base = Number.isFinite(bep) ? bep : targetSales;
    if (!Number.isFinite(base) || base <= 0) base = Math.max(1000000, targetSales);

    const points = [
      base * 0.6,
      base * 0.8,
      base,
      base * 1.2,
      base * 1.5,
    ].map(v => Math.round(v / 10000) * 10000);

    for (const sales of points) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      const td2 = document.createElement("td");
      const td3 = document.createElement("td");
      td1.textContent = formatKRW(sales);
      td2.textContent = formatKRW(profit(sales));
      td3.textContent = formatKRW(ownerHourly(sales));
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
      tbody.appendChild(tr);
    }
  }
}

/* =========================
   시급 계산기
========================= */
export function calcHourly() {
  const hourly = Math.max(0, num("hourlyWage", 10000));
  const hoursPerDay = Math.max(0, num("hoursPerDayH", 8));
  const daysPerWeek = Math.min(7, Math.max(0, num("daysPerWeekH", 5)));
  const breakMin = Math.max(0, num("breakMinH", 60));
  const overtimeWeek = Math.max(0, num("overtimeWeekH", 0));
  const includeHoliday = !!document.getElementById("includeHolidayH")?.checked;

  const paidHoursPerDay = Math.max(0, hoursPerDay - (breakMin / 60));
  const baseWeeklyHours = paidHoursPerDay * daysPerWeek;
  const holidayHours = (includeHoliday && baseWeeklyHours > 0) ? (baseWeeklyHours / Math.max(1, daysPerWeek)) : 0;

  // 초과근로: 기본 + 50% 가산(단순)
  const weeklyPay = (baseWeeklyHours + holidayHours) * hourly
    + overtimeWeek * hourly
    + overtimeWeek * hourly * 0.5;

  const monthlyPay = weeklyPay * 4.345;
  const weeklyHoursShown = baseWeeklyHours + holidayHours + overtimeWeek;

  setText("kpiWeeklyH", formatKRW(weeklyPay));
  setText("kpiMonthlyH", formatKRW(monthlyPay));
  setText("kpiHoursH", (Math.round(weeklyHoursShown * 10) / 10) + "시간");
}

/* =========================
   월급 실수령액(추정) 계산기
========================= */
export function calcSalaryNet() {
  const gross = Math.max(0, num("grossS", 3000000));
  const dependents = Math.max(1, num("depS", 1));
  const preset = document.getElementById("presetS")?.value || "standard";
  const includeTax = !!document.getElementById("includeTaxS")?.checked;

  let adj = 1.0;
  if (preset === "light") adj = 0.85;
  if (preset === "heavy") adj = 1.15;

  const pension = gross * 0.045 * adj;
  const health = gross * 0.035 * adj;
  const care = health * 0.12 * adj;
  const employ = gross * 0.009 * adj;

  let incomeTax = 0;
  if (includeTax) {
    const baseRate = 0.03 + Math.min(0.04, gross / 10000000);
    const depDiscount = Math.min(0.012, (dependents - 1) * 0.004);
    const effRate = Math.max(0.01, baseRate - depDiscount);
    incomeTax = gross * effRate * adj;
  }
  const localTax = incomeTax * 0.1;

  const totalDeduct = pension + health + care + employ + incomeTax + localTax;
  const net = Math.max(0, gross - totalDeduct);
  const rate = gross > 0 ? (totalDeduct / gross) * 100 : 0;

  setText("kpiNetS", formatKRW(net));
  setText("kpiDeductS", formatKRW(totalDeduct));
  setText("kpiRateS", formatPct(rate));

  const list = document.getElementById("deductListS");
  if (list) {
    list.innerHTML = "";
    const items = [
      ["국민연금(추정)", pension],
      ["건강보험(추정)", health],
      ["장기요양보험(추정)", care],
      ["고용보험(추정)", employ],
      ["소득세(추정)", includeTax ? incomeTax : 0],
      ["지방소득세(추정)", includeTax ? localTax : 0],
    ];
    for (const [k, v] of items) {
      const li = document.createElement("li");
      li.innerHTML = `<b>${k}</b>: ${formatKRW(v)}`;
      list.appendChild(li);
    }
  }
}
