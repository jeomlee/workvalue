/* ============================================================================
  /assets/app.js (ESM, 최종)
  - 헤더/푸터 주입
  - nav active 표시
  - 모바일 메뉴 토글(정렬/깨짐 방지)
  - 페이지별 계산기는 각 페이지에서만 처리 (충돌 방지)
============================================================================ */

const HEADER_HTML = `
<header class="wvHeader" id="wvHeader">
  <div class="wvHeaderInner">
    <a class="wvBrand" href="/" aria-label="WorkValue 홈">
      <span class="wvLogoDot" aria-hidden="true"></span>
      <span class="wvBrandText">
        <strong class="wvBrandTitle">WorkValue</strong>
        <span class="wvBrandSub">급여·근로·자영업 계산기</span>
      </span>
    </a>

    <button class="wvMenuBtn" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="wvNav">
      <span class="wvMenuIcon" aria-hidden="true"></span>
    </button>

    <nav class="wvNav" id="wvNav" aria-label="이동">
      <a class="wvNavLink" href="/">홈</a>
      <a class="wvNavLink" href="/employee/hourly.html">단순 급여</a>
      <a class="wvNavLink" href="/employee/salary-net.html">월급 실수령</a>
      <a class="wvNavLink" href="/business/bep.html">자영업 BEP</a>
      <a class="wvNavLink" href="/business/labor-cost.html">인건비</a>
      <a class="wvNavLink" href="/business/price-decision.html">가격 결정</a>
      <a class="wvNavCta" href="/contact">문의</a>
    </nav>
  </div>
</header>
`;

const FOOTER_HTML = `
<footer class="wvFooter" id="wvFooter">
  <div class="wvFooterInner">
    <div class="wvFooterLeft">
      <div class="wvFooterTitle">WorkValue</div>
      <div class="wvFooterSub">계산 결과는 참고용 추정치입니다.</div>
    </div>

    <div class="wvFooterRight">
      <a class="wvFooterLink" href="/contact">문의</a>
      <span class="wvDot">·</span>
      <a class="wvFooterLink" href="/terms">이용약관</a>
      <span class="wvDot">·</span>
      <a class="wvFooterLink" href="/privacy">개인정보처리방침</a>
      <span class="wvDot">·</span>
      <span class="wvFooterCopy">© <span id="y"></span></span>
    </div>
  </div>
</footer>
`;

/* =========================
  CSS (헤더 정렬/모바일 메뉴)
  - styles.css를 건드리지 않고 app.js에서 최소 보정
  - 이미 styles.css에 유사 스타일이 있다면 큰 충돌 없이 덮어쓰기만 됨
========================= */
const COMMON_CSS = `
/* WorkValue common header/footer */
.wvHeader{ width:100%; position:sticky; top:0; z-index:50; backdrop-filter:saturate(1.2) blur(10px);
  background: rgba(11,15,20,.82); border-bottom:1px solid rgba(255,255,255,.08);
}
.wvHeaderInner{ display:flex; align-items:center; justify-content:space-between; gap:14px;
  padding: 14px 0;
}
.wvBrand{ display:flex; align-items:center; gap:10px; text-decoration:none; min-width:0; }
.wvLogoDot{ width:10px; height:10px; border-radius:999px;
  background: linear-gradient(135deg, rgba(76,201,255,.95), rgba(59,231,176,.95));
  flex: 0 0 auto;
}
.wvBrandText{ display:flex; flex-direction:column; gap:2px; min-width:0; }
.wvBrandTitle{ color: rgba(255,255,255,.92); letter-spacing:-.3px; line-height:1.1; }
.wvBrandSub{ color: rgba(255,255,255,.62); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.wvNav{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
.wvNavLink, .wvNavCta{
  display:inline-flex; align-items:center; justify-content:center;
  height: 36px; padding: 0 12px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.86);
  font-weight: 900; letter-spacing:-.2px; font-size: 13px;
  text-decoration:none; white-space:nowrap;
}
.wvNavLink:hover, .wvNavCta:hover{ opacity:.92; border-color: rgba(255,255,255,.16); }
.wvNavLink.is-active{
  border-color: rgba(76,201,255,.28);
  background: rgba(76,201,255,.10);
}
.wvNavCta{
  background: linear-gradient(135deg, rgba(76,201,255,.95), rgba(59,231,176,.95));
  color: rgba(0,0,0,.75);
  border-color: rgba(255,255,255,.10);
}

.wvMenuBtn{
  display:none;
  height:36px; width:44px; border-radius:12px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  cursor:pointer;
}
.wvMenuIcon{
  display:block;
  width:18px; height:2px; border-radius:99px;
  background: rgba(255,255,255,.84);
  position: relative;
  margin: 0 auto;
}
.wvMenuIcon::before, .wvMenuIcon::after{
  content:"";
  position:absolute;
  left:0; width:18px; height:2px; border-radius:99px;
  background: rgba(255,255,255,.84);
}
.wvMenuIcon::before{ top:-6px; }
.wvMenuIcon::after{ top:6px; }

@media (max-width: 980px){
  .wvMenuBtn{ display:inline-flex; align-items:center; justify-content:center; }
  .wvNav{ display:none; width:100%; padding-top: 10px; justify-content:flex-start; }
  .wvHeaderInner{ flex-wrap:wrap; }
  .wvNav.is-open{ display:flex; }
}
.wvFooter{ margin-top: 24px; border-top:1px solid rgba(255,255,255,.08); padding: 18px 0; }
.wvFooterInner{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.wvFooterTitle{ font-weight: 900; color: rgba(255,255,255,.90); letter-spacing:-.2px; }
.wvFooterSub{ color: rgba(255,255,255,.60); font-size:12.5px; margin-top:2px; }
.wvFooterRight{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.wvFooterLink{ color: rgba(255,255,255,.72); text-decoration:none; font-weight:900; font-size:12.5px; }
.wvFooterLink:hover{ opacity:.92; }
.wvDot{ color: rgba(255,255,255,.45); }
.wvFooterCopy{ color: rgba(255,255,255,.55); font-size:12.5px; font-weight:900; }
`;

function injectCommonCssOnce() {
  if (document.getElementById("wvCommonCss")) return;
  const style = document.createElement("style");
  style.id = "wvCommonCss";
  style.textContent = COMMON_CSS;
  document.head.appendChild(style);
}

function normPath(p) {
  const x = (p || "/").split("?")[0].split("#")[0];
  return x.replace(/\/+$/, "") || "/";
}

function hrefToPath(href) {
  try {
    const u = new URL(href, location.origin);
    return normPath(u.pathname);
  } catch {
    return "";
  }
}

// /terms 와 /terms.html 같이 섞여도 매칭 되도록
function stripHtmlExt(p) {
  return p.endsWith(".html") ? p.slice(0, -5) : p;
}

function setActiveNav() {
  const cur = stripHtmlExt(normPath(location.pathname));
  document.querySelectorAll("#wvHeader .wvNav a").forEach((a) => {
    const target = stripHtmlExt(hrefToPath(a.getAttribute("href") || ""));
    const active = target === "/" ? cur === "/" : cur === target;
    a.classList.toggle("is-active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function setFooterYear() {
  const y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());
}

function bindMenuToggle() {
  const btn = document.querySelector("#wvHeader .wvMenuBtn");
  const nav = document.getElementById("wvNav");
  if (!btn || !nav) return;

  const close = () => {
    nav.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  // 메뉴 열린 상태에서 화면이 커지면 자동 닫기
  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) close();
  });

  // 다른 영역 클릭 시 닫기(모바일에서 유용)
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("is-open")) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("#wvHeader")) return;
    close();
  });
}

function mountCommon() {
  injectCommonCssOnce();

  const headerMount = document.getElementById("wvHeaderMount");
  if (headerMount && !headerMount.dataset.mounted) {
    headerMount.innerHTML = HEADER_HTML;
    headerMount.dataset.mounted = "1";
  } else if (!headerMount) {
    // mount가 없더라도 header가 없으면 최상단에 삽입(안전장치)
    if (!document.getElementById("wvHeader")) {
      document.body.insertAdjacentHTML("afterbegin", HEADER_HTML);
    }
  }

  const footerMount = document.getElementById("wvFooterMount");
  if (footerMount && !footerMount.dataset.mounted) {
    footerMount.innerHTML = FOOTER_HTML;
    footerMount.dataset.mounted = "1";
  } else if (!footerMount) {
    // mount가 없더라도 footer가 없으면 마지막에 삽입(안전장치)
    if (!document.getElementById("wvFooter")) {
      document.body.insertAdjacentHTML("beforeend", FOOTER_HTML);
    }
  }

  setFooterYear();
  setActiveNav();
  bindMenuToggle();
}

/* =========================
  ✅ 외부에서 import()로 호출하는 엔트리
========================= */
export function initWorkValue() {
  // 중복 실행 방지
  if (window.__wvCommonInited) return;
  window.__wvCommonInited = true;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountCommon, { once: true });
  } else {
    mountCommon();
  }
}

// 레거시 호환(혹시 window.initWorkValue를 쓰는 페이지가 남아있을 때)
window.initWorkValue = initWorkValue;
