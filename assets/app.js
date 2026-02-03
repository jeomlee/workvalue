// ===== 공통 유틸 =====
export const fmt = (n) => {
  if (!isFinite(n)) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
};
export const num = (id) => Math.max(0, +(document.getElementById(id)?.value || 0));
export const intval = (id, min=0) => Math.max(min, Math.floor(num(id)));
export const setText = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };

// ===== “정책/가정 값”을 사용자에게 노출 + 수정 가능 =====
// (연도만 바꿔도 운영이 가능하도록 설계)
export const POLICY = {
  year: 2026,

  // 직장인(근로자 부담) — 초기값은 운영자가 최신 공식값으로 업데이트
  pensionEmployeeRate: 0.0475,
  healthEmployeeRate: 0.03595,
  longtermCareOfHealth: 0.1314,
  employmentEmployeeRate: 0.009,
  localIncomeTaxRate: 0.10,

  // 간편 모델 기본공제(연)
  personalDeductionPerPerson: 1500000,

  earnedIncomeDeduction: (grossPay) => {
    const x = grossPay;
    if (x <= 5000000) return x * 0.70;
    if (x <= 15000000) return 3500000 + (x - 5000000) * 0.40;
    if (x <= 45000000) return 7500000 + (x - 15000000) * 0.15;
    if (x <= 100000000) return 12000000 + (x - 45000000) * 0.05;
    return 14750000 + (x - 100000000) * 0.02;
  },

  incomeTaxByBracket: (taxBase) => {
    const x = Math.max(0, taxBase);
    if (x <= 14000000) return x * 0.06;
    if (x <= 50000000) return 840000 + (x - 14000000) * 0.15;
    if (x <= 88000000) return 6240000 + (x - 50000000) * 0.24;
    if (x <= 150000000) return 15360000 + (x - 88000000) * 0.35;
    if (x <= 300000000) return 37060000 + (x - 150000000) * 0.38;
    if (x <= 500000000) return 94060000 + (x - 300000000) * 0.40;
    if (x <= 1000000000) return 174060000 + (x - 500000000) * 0.42;
    return 384060000 + (x - 1000000000) * 0.45;
  },

  earnedIncomeTaxCredit: (computedTax, grossPay) => {
    const tax = Math.max(0, computedTax);
    let credit = 0;
    if (tax <= 1300000) credit = tax * 0.55;
    else credit = 715000 + (tax - 1300000) * 0.30;

    // 간편 한도 모델
    let cap = 0;
    const g = grossPay;
    if (g <= 33000000) cap = 740000;
    else if (g <= 70000000) cap = Math.max(660000, 740000 - (g - 33000000) * 0.008);
    else if (g <= 120000000) cap = Math.max(500000, 660000 - (g - 70000000) * 0.5);
    else cap = Math.max(200000, 500000 - (g - 120000000) * 0.5);

    return Math.min(credit, cap);
  }
};

// ===== 1) 연봉 실수령(추정) =====
export function calcSalaryNet() {
  const annual = num("salaryAnnual");
  const nontaxMonthly = num("nontaxMonthly");
  const dep = Math.max(1, intval("dependents", 1));

  // 사용자 수정 가능한 정책값
  const pensionRate = +document.getElementById("pensionRate").value;
  const healthRate = +document.getElementById("healthRate").value;
  const ltcRate = +document.getElementById("ltcRate").value;
  const employRate = +document.getElementById("employRate").value;

  const nontaxAnnual = nontaxMonthly * 12;
  const grossTaxable = Math.max(0, annual - nontaxAnnual);

  const monthlyBase = grossTaxable / 12;
  const pension = monthlyBase * pensionRate;
  const health = monthlyBase * healthRate;
  const longterm = health * ltcRate;
  const employ = monthlyBase * employRate;

  const insMonthly = pension + health + longterm + employ;

  // 세액(연말정산 근사)
  const eDed = POLICY.earnedIncomeDeduction(grossTaxable);
  const earnedIncome = Math.max(0, grossTaxable - eDed);

  const personalDed = dep * POLICY.personalDeductionPerPerson;
  const pensionDed = pension * 12;

  const taxBase = Math.max(0, earnedIncome - personalDed - pensionDed);
  const computedTax = POLICY.incomeTaxByBracket(taxBase);
  const taxCredit = POLICY.earnedIncomeTaxCredit(computedTax, grossTaxable);

  const incomeTax = Math.max(0, computedTax - taxCredit);
  const localTax = incomeTax * POLICY.localIncomeTaxRate;
  const taxMonthly = (incomeTax + localTax) / 12;

  const netMonthly = (grossTaxable / 12) + nontaxMonthly - insMonthly - taxMonthly;
  const netAnnual = netMonthly * 12;

  setText("kpiNetMonthly", fmt(netMonthly));
  setText("kpiNetAnnual", fmt(netAnnual));
  setText("kpiDedMonthly", fmt(insMonthly + taxMonthly));
  setText("kpiIncomeTax", fmt(incomeTax));
}

// ===== 2) 실수령 시급 =====
export function calcHourly() {
  const netMonthly = num("netMonthlyPay");
  const workHours = num("workHoursPerDay");
  const workDays = num("workDaysPerMonth");
  const overtimeHours = num("overtimeHoursPerMonth");

  const totalHours = Math.max(1, (workHours * workDays) + overtimeHours);
  const hourly = netMonthly / totalHours;

  setText("kpiHourly", Math.round(hourly).toLocaleString("ko-KR") + "원/시간");
  setText("kpiHours", `${totalHours.toLocaleString("ko-KR")}시간`);
}

// ===== 3) 자영업 BEP + 사장 시급 =====
export function calcBEP() {
  const fixed = num("fixedCost");        // 월 고정비(임대료+인건비+기타)
  const variableRate = Math.min(0.99, Math.max(0, +document.getElementById("variableRate").value / 100)); // 매출 대비 변동비율
  const days = Math.max(1, intval("openDays", 1));
  const hoursPerDay = Math.max(1, num("hoursPerDay"));
  const targetSales = num("targetSales");

  // 손익분기점: 고정비 / (1-변동비율)
  const bep = fixed / (1 - variableRate);
  const bepDaily = bep / days;

  // 목표 매출 기준 순이익
  const profit = targetSales - (targetSales * variableRate) - fixed;
  const totalHours = days * hoursPerDay;
  const ownerHourly = profit / Math.max(1, totalHours);

  setText("kpiBEP", fmt(bep));
  setText("kpiBEPDaily", fmt(bepDaily));
  setText("kpiProfit", fmt(profit));
  setText("kpiOwnerHourly", (isFinite(ownerHourly) ? Math.round(ownerHourly).toLocaleString("ko-KR") : "-") + "원/시간");

  // 매출 구간 표 (BEP 전후 3구간)
  const rows = [];
  const points = [
    Math.max(0, bep * 0.7),
    Math.max(0, bep * 0.9),
    bep,
    bep * 1.1,
    bep * 1.3
  ];
  for (const s of points) {
    const p = s - (s * variableRate) - fixed;
    const h = p / Math.max(1, totalHours);
    rows.push({ sales:s, profit:p, hourly:h });
  }

  const tbody = document.getElementById("bepTableBody");
  if (tbody) {
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${Math.round(r.sales).toLocaleString("ko-KR")}원</td>
        <td>${Math.round(r.profit).toLocaleString("ko-KR")}원</td>
        <td>${isFinite(r.hourly) ? Math.round(r.hourly).toLocaleString("ko-KR") + "원/시간" : "-"}</td>
      </tr>
    `).join("");
  }
}
