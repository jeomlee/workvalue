(function () {
  function formatKRW(n) {
    const x = Math.round(Number(n) || 0);
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';
  }

  function clamp(v, min, max) {
    v = Number(v);
    if (Number.isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  // FAQ 토글
  function initFaq() {
    const rootList = document.querySelectorAll('[data-faq]');
    rootList.forEach((root) => {
      const qs = root.querySelectorAll('.faq-q');
      qs.forEach((btn) => {
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', () => {
          const now = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', now ? 'false' : 'true');
        });
      });
    });
  }

  // 시급 계산기
  function initHourlyCalc() {
    const form = document.querySelector('[data-hourly-form]');
    if (!form) return;

    const wageEl = form.querySelector('[name="hourly_wage"]');
    const hoursEl = form.querySelector('[name="hours_per_day"]');
    const daysEl = form.querySelector('[name="days_per_week"]');
    const breakEl = form.querySelector('[name="break_minutes"]');
    const otEl = form.querySelector('[name="overtime_hours_week"]');
    const holidayEl = form.querySelector('[name="include_holiday"]');

    const outWeekly = document.querySelector('[data-out="weekly"]');
    const outMonthly = document.querySelector('[data-out="monthly"]');
    const outHours = document.querySelector('[data-out="hours"]');
    const outAssum = document.querySelector('[data-out="assumptions"]');

    function compute() {
      const hourly = clamp(wageEl.value, 0, 100000000);
      const hoursPerDay = clamp(hoursEl.value, 0, 24);
      const daysPerWeek = clamp(daysEl.value, 0, 7);
      const breakMin = clamp(breakEl.value, 0, 600);
      const overtimeWeek = clamp(otEl.value, 0, 80);
      const includeHoliday = holidayEl.checked;

      // 1) 일 유급시간(단순): 근무시간 - 휴게시간
      const paidHoursPerDay = Math.max(0, hoursPerDay - (breakMin / 60));

      // 2) 주 유급시간(기본)
      const baseWeeklyHours = paidHoursPerDay * daysPerWeek;

      // 3) 주휴수당(단순 추정):
      //    일반적으로 '주 15시간 이상' 등 조건이 있으나, 여기서는 체크 시
      //    "1일 평균 유급시간"을 주휴로 추가하는 방식으로 추정합니다.
      const holidayHours = (includeHoliday && baseWeeklyHours > 0) ? (baseWeeklyHours / Math.max(1, daysPerWeek)) : 0;

      // 4) 초과근로(수당): 여기서는 "가산 50%"를 단순 적용(기본 + 0.5배)
      const overtimePremium = overtimeWeek * hourly * 0.5;
      const overtimeBasePay = overtimeWeek * hourly;

      const weeklyPay = (baseWeeklyHours + holidayHours) * hourly + overtimeBasePay + overtimePremium;

      // 월 환산: 평균 4.345주(365/12/7)
      const monthlyPay = weeklyPay * 4.345;

      const weeklyHoursShown = baseWeeklyHours + holidayHours + overtimeWeek;

      if (outWeekly) outWeekly.textContent = formatKRW(weeklyPay);
      if (outMonthly) outMonthly.textContent = formatKRW(monthlyPay);
      if (outHours) outHours.textContent = (Math.round(weeklyHoursShown * 10) / 10).toString() + '시간';

      if (outAssum) {
        outAssum.textContent =
          '본 계산기는 일반적인 이해를 돕기 위한 단순 추정치입니다. 휴게시간 처리, 주휴 요건, 초과근로 산정 기준, 수당 포함 여부, 계약 형태 등에 따라 실제 지급액과 달라질 수 있습니다.';
      }
    }

    form.addEventListener('input', compute);
    form.addEventListener('submit', (e) => e.preventDefault());
    compute();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFaq();
    initHourlyCalc();
  });
})();
