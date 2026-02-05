/* ============================================================================
  WorkValue app.js (FINAL)
  - 공통 레이아웃 주입: 헤더/푸터
  - nav active 처리
  - 각 페이지 계산기 자동 바인딩 (legacy 충돌 방지 포함)
  - ES Module export 지원 (import()에서 mod.initWorkValue() 가능)
============================================================================ */

/* =========================
   Utils
========================= */
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
  Active Nav
============================================================================ */
function normalizePath(p) {
  if (!p) return "/";
  if (p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}
function setActiveNav() {
  const header = document.getElementById("wvHeader");
  if (!header) return;

  const nav = header.querySelector("nav[aria-label='이동']");
  if (!nav) return;

  const current = normalizePath(location.pathname);
  const links = Array.from(nav.querySelectorAll("a"));

  links.forEach((a) => a.classList.remove("active"));

  const match = links.find((a) => {
    try {
      const href = a.getAttribute("href") || "";
      const u = new URL(href, location.origin);
      const hp = normalizePath(u.pathname);

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
  Layout Injection (Header/Footer)
  - mount id가 있으면 그걸 교체
  - mount id가 없으면 기존 header/footer를 찾아 교체
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
    return `<a class="wvNavLink ${active}" href="${href}">${text}</a>`;
  }

  const HEADER_HTML = `
<header class="wvHeader" id="wvHeader">
  <div class="wvHeaderInner">
    <a class="wvBrand" href="/" aria-label="WorkValue 홈">
      <span class="wvLogo" aria-hidden="true">
        <span class="wvLogoDot"></span>
        <span class="wvLogoRing"></span>
      </span>

      <span class="wvBrandText">
        <strong class="wvBrandTitle">WorkValue</strong>
        <span class="wvBrandSub">급여·근로·자영업 계산기</span>
      </span>
    </a>

    <button class="wvMenuBtn" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="wvNav">
      <span class="wvMenuIcon" aria-hidden="true"></span>
    </button>

    <nav class="wvNav" id="wvNav" aria-label="이동">
      ${navLink("/", "홈")}
      ${navLink("/employee/hourly.html", "단순 급여")}
      ${navLink("/employee/salary-net.html", "월급 실수령")}
      ${navLink("/business/bep.html", "자영업 BEP")}
      ${navLink("/business/labor-cost.html", "인건비")}
      ${navLink("/business/price-decision.html", "가격 결정")}
      <a class="wvNavCta" href="/contact.html">문의</a>
    </nav>
  </div>
</header>
`;

  const FOOTER_HTML = `
<footer class="site-footer" id="wvFooter">
  <div class="footer-inner links">
    <a href="/contact.html">문의</a>
    <a href="/terms.html">이용약관</a>
    <a href="/privacy.html">개인정보처리방침</a>
    <a href="/about.html">소개</a>
    <span style="opacity:.55">© <span id="y"></span> WorkValue</span>
  </div>
</footer>
`;

  function replaceById(targetId, html) {
    const el = document.getElementById(targetId);
    if (!el) return false;
    el.outerHTML = html;
    return true;
  }

  function replaceFallbackHeader() {
    const legacyH =
      document.getElementById("wvHeader") ||
      document.querySelector("header.wvHeader") ||
      document.querySelector("header.site-header") ||
      document.querySelector("header");

    if (legacyH) legacyH.outerHTML = HEADER_HTML;
  }
  function replaceFallbackFooter() {
    const legacyF =
      document.getElementById("wvFooter") ||
      document.querySelector("footer.site-footer") ||
      document.querySelector("footer");

    if (legacyF) legacyF.outerHTML = FOOTER_HTML;
  }

  // ✅ 모바일 메뉴 토글 (CSS 없어도 동작하도록 display로 제어)
  function bindMobileMenu() {
    const btn = document.querySelector("#wvHeader .wvMenuBtn");
    const nav = document.getElementById("wvNav");
    if (!btn || !nav) return;

    const BP = 900;

    function applyByWidth() {
      const isMobile = window.innerWidth <= BP;
      if (!isMobile) {
        nav.style.display = "flex";
        btn.setAttribute("aria-expanded", "false");
        return;
      }
      // 모바일 기본: 닫힘
      nav.style.display = "none";
      btn.setAttribute("aria-expanded", "false");
    }

    function toggle() {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      const next = !expanded;
      btn.setAttribute("aria-expanded", String(next));
      nav.style.display = next ? "flex" : "none";
    }

    btn.addEventListener("click", toggle);
    window.addEventListener("resize", applyByWidth);
    applyByWidth();
  }

  window.wvMountLayout = function () {
    const okHeader = replaceById("wvHeaderMount", HEADER_HTML);
    const okFooter = replaceById("wvFooterMount", FOOTER_HTML);

    if (!okHeader) replaceFallbackHeader();
    if (!okFooter) replaceFallbackFooter();

    try { setActiveNav(); } catch {}
    try { bindMobileMenu(); } catch {}
  };
})();

/* ============================================================================
  1) 자영업 손익분기점(BEP)
============================================================================ */
function applyBEPQueryIfAny() {
  if (!$("fixedCost") || !$("variableRate")) return;

  const q = parseQuery();
  if (q.fixedCost) setValue("fixedCost", q.fixedCost);
  if (q.variableRate) setValue("variableRate", q.variableRate);
  if (q.openDays) setValue("openDays", q.openDays);
  if (q.hoursPerDay) setValue("hoursPerDay", q.hoursPerDay);
  if (q.targetSales) setValue("targetSales", q.targetSales);
}
function calcBEP() {
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
  2) 실수령 시급 계산기(legacy) - 신버전 hourly.html과 충돌 방지
============================================================================ */
function calcHourly() {
  if (!$("hourlyWage") || !$("hoursPerDayH") || !$("kpiHoursH")) return;

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
  3) 월급 실수령액(legacy)
============================================================================ */
function calcSalaryNet() {
  if (!$("grossS") || !$("depS") || !$("kpiNetS")) return;

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
  direct: { label: "직접 입력하기", rate: null },
  cafe: { label: "카페/음료(예시)", rate: 1.0 },
  restaurant: { label: "일반 음식점(예시)", rate: 1.2 },
  office: { label: "사무/일반(예시)", rate: 0.7 },
  delivery: { label: "배달/라이더(예시)", rate: 2.0 },
};

function calcLaborCost() {
  if (!$("lcHourly") || !$("lcHours")) return;

  const presetEl = $("lcIndustrialPreset");
  const rateEl = $("lcIndustrialRate");

  const presetKey = readSelect("lcIndustrialPreset") || "direct";
  const presetRate = INDUSTRIAL_PRESETS[presetKey]?.rate ?? null;

  const presetChanged = presetEl && presetEl.dataset.lastPreset !== presetKey;
  if (presetEl) presetEl.dataset.lastPreset = presetKey;
  if (presetChanged && rateEl) rateEl.dataset.userEdited = "0";

  if (presetRate != null && rateEl) {
    const userEdited = rateEl.dataset.userEdited === "1";
    if (!userEdited) rateEl.value = String(presetRate);
  }

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
  공통 바인딩 헬퍼
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
  가격 결정 계산기 (pd_*)
  - window.initPriceDecision 제공되어 있으면 실행
============================================================================ */
if (!window.initPriceDecision) {
  // 기존에 별도 스크립트로 이미 등록되어 있을 수 있으니 여기서는 강제 구현하지 않음
}

/* ============================================================================
  initWorkValue (export + window)
============================================================================ */
export function initWorkValue() {
  // ✅ 중복 실행 방지
  if (window.__wv_inited) return;
  window.__wv_inited = true;

  // ✅ 공통 레이아웃 먼저
  if (window.wvMountLayout) window.wvMountLayout();

  // footer year
  const y = $("y");
  if (y) y.textContent = String(new Date().getFullYear());

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
    bindRun(["fixedCost", "variableRate", "openDays", "hoursPerDay", "targetSales"], calcBEP);
    calcBEP();
  }

  // Hourly (legacy 전용: kpiHoursH가 있는 페이지에서만)
  if ($("hourlyWage") && $("hoursPerDayH") && $("kpiHoursH")) {
    bindButtons("btnCalcH", calcHourly);
    bindRun(["hourlyWage", "hoursPerDayH", "daysPerWeekH", "breakMinH", "overtimeWeekH", "includeHolidayH"], calcHourly);
    calcHourly();
  }

  // SalaryNet (legacy 전용)
  if ($("grossS") && $("depS") && $("kpiNetS")) {
    bindButtons("btnCalcS", calcSalaryNet);
    bindRun(["grossS", "depS", "presetS", "includeTaxS"], calcSalaryNet);
    calcSalaryNet();
  }

  // LaborCost
  if ($("lcHourly") && $("lcHours")) {
    const run = () => calcLaborCost();

    const rateEl = $("lcIndustrialRate");
    if (rateEl) {
      rateEl.addEventListener("input", () => (rateEl.dataset.userEdited = "1"));
      rateEl.addEventListener("change", () => (rateEl.dataset.userEdited = "1"));
    }

    bindButtons("btnCalcLC", run);
    bindRun(
      [
        "lcHourly", "lcHours", "lcDays", "lcCount", "lcHoliday", "lcExtraHours", "lcInsurance",
        "lcIndustrialRate", "lcIndustrialPreset", "lcOwnerDevRate", "lcSeverance",
        "lcVarRate", "lcOpenDays", "lcHoursPerDay", "lcTargetSales",
      ],
      run
    );
    run();
  }

  // Price Decision
  if (document.getElementById("pd_calc_btn")) {
    if (window.initPriceDecision) window.initPriceDecision();
  }

  // 마지막으로 active 보정
  try { setActiveNav(); } catch {}
}

// 전역 공개(페이지에서 window.initWorkValue()로도 호출 가능)
window.initWorkValue = initWorkValue;

// ✅ DOM 준비되면 자동 실행
document.addEventListener("DOMContentLoaded", () => {
  initWorkValue();
});
