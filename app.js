// KORUAL OPS - Google Sheet WebApp 연동 전체 app.js
// WebApp URL
const API_BASE =
  "https://script.google.com/macros/s/AKfycbx3s5j7YgqcWLGGGuzdtQy0Ayl3QHtHP7xwhEAv3N-BClUVFNZy2krd4WNyOy-kiQE/exec";

// 내부 캐시
let PRODUCTS = [];
let ORDERS = [];
let SHIPPINGS = [];

// 공통: 시트 로드
async function loadSheet(sheetName) {
  const res = await fetch(`${API_BASE}?sheet=${encodeURIComponent(sheetName)}`);
  const json = await res.json();
  return json.data || [];
}

// 공통: 문자열/숫자 안전 처리
const S = (v) => (v ?? "").toString().trim();
const N = (v) => {
  const num = parseFloat(S(v).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
};

// 공통: 날짜 파싱(시트 헤더가 달라도 최대한 잡아줌)
function parseDateFromRow(row) {
  const candidates = [
    "주문일시",
    "날짜",
    "주문일",
    "주문일자",
    "결제일",
    "발송일",
  ];
  for (const key of candidates) {
    if (row[key]) {
      const d = new Date(row[key]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}
function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 공통: 카드 렌더러
function renderCards(list, elId, mapper, emptyId) {
  const el = document.getElementById(elId);
  if (!el) return;

  el.innerHTML = "";
  if (!list.length) {
    if (emptyId) document.getElementById(emptyId)?.classList.remove("hidden");
    return;
  }
  if (emptyId) document.getElementById(emptyId)?.classList.add("hidden");

  el.innerHTML = list.map(mapper).join("");
}

// Products 렌더 (네 시트 헤더 기준)
function renderProducts() {
  const sortValue = document.getElementById("product-sort")?.value || "name";
  let list = [...PRODUCTS];

  if (sortValue === "price_desc")
    list.sort((a, b) => N(b["판매가(KRW)"]) - N(a["판매가(KRW)"]));
  if (sortValue === "name")
    list.sort((a, b) =>
      S(a.상품명).localeCompare(S(b.상품명), "ko")
    );

  renderCards(
    list,
    "product-list",
    (p) => {
      const price = N(p["판매가(KRW)"]);
      const margin = S(p["마진율"]);
      const img = S(p["이미지URL"]);
      return `
        <div class="card">
          <div class="title">${S(p.상품명)}</div>
          <div class="muted">상품ID: ${S(p.상품ID)}</div>
          <div class="muted">소싱처: ${S(p.소싱처)}</div>
          <div class="muted">판매가: ${
            price ? price.toLocaleString() + "원" : "-"
          }</div>
          <div class="muted">마진율: ${margin || "-"}</div>
          <div class="muted">상태: ${S(p.상태) || "-"}</div>
          ${img ? `<img src="${img}" alt="">` : ""}
        </div>
      `;
    },
    "product-empty"
  );
}

// Orders 렌더 (테이블 UI용, 네 시트 헤더 기준)
function renderOrders() {
  const filterValue = document.getElementById("order-filter")?.value || "all";
  const q = S(document.getElementById("global-search")?.value).toLowerCase();
  let list = [...ORDERS];

  // 상태 필터
  if (filterValue !== "all") {
    list = list.filter((o) => {
      const st = S(o["배송상태(API)"] || o["배송상태"] || o["상태"]);
      if (filterValue === "paid")
        return st.includes("결제") || st.includes("완료") || st.includes("주문");
      if (filterValue === "shipping") return st.includes("배송중");
      if (filterValue === "done") return st.includes("배송완료");
      if (filterValue === "delayed") return st.includes("배송지연");
      return true;
    });
  }

  // 검색
  if (q) {
    list = list.filter((o) => {
      return (
        S(o.주문번호).toLowerCase().includes(q) ||
        S(o.고객명).toLowerCase().includes(q) ||
        S(o.트래킹번호).toLowerCase().includes(q) ||
        S(o.상품명).toLowerCase().includes(q)
      );
    });
  }

  const tbody = document.getElementById("order-tbody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = "";
    document.getElementById("order-empty")?.classList.remove("hidden");
    return;
  }
  document.getElementById("order-empty")?.classList.add("hidden");

  const badgeClass = (status) => {
    const st = S(status);
    if (st.includes("배송지연")) return "badge badge-delayed";
    if (st.includes("배송완료")) return "badge badge-done";
    if (st.includes("배송중")) return "badge badge-shipping";
    return "badge badge-paid";
  };

  tbody.innerHTML = list
    .map((o) => {
      const amount = N(o["결제금액(KRW)"] || o["금액"]);
      const status = S(o["배송상태(API)"] || o["배송상태"] || o["상태"]);
      return `
        <tr>
          <td><strong>${S(o.주문번호)}</strong></td>
          <td>${S(o.고객명) || "-"}</td>
          <td>${S(o.상품명) || "-"}<br><span class="muted">x ${
        S(o.수량) || 1
      }</span></td>
          <td class="right">${
            amount ? amount.toLocaleString() + "원" : "-"
          }</td>
          <td>${S(o.채널) || "-"}</td>
          <td>${S(o.주문일시) || S(o.날짜) || "-"}</td>
          <td><span class="${badgeClass(status)}">${
        status || "-"
      }</span></td>
          <td>${S(o.트래킹번호) || "-"}</td>
        </tr>
      `;
    })
    .join("");
}

// Shipping 렌더 (네 시트 헤더 기준)
function renderShipping() {
  const filterValue =
    document.getElementById("shipping-filter")?.value || "all";
  const q = S(document.getElementById("global-search")?.value).toLowerCase();

  let list = [...SHIPPINGS];

  if (filterValue !== "all") {
    list = list.filter((s) => {
      const st = S(s["현재상태(파싱)"] || s["배송상태"]);
      if (filterValue === "shipping") return st.includes("배송중");
      if (filterValue === "done") return st.includes("배송완료");
      if (filterValue === "delayed") return st.includes("배송지연");
      return true;
    });
  }

  if (q) {
    list = list.filter((s) => {
      return (
        S(s.주문번호).toLowerCase().includes(q) ||
        S(s.트래킹번호).toLowerCase().includes(q)
      );
    });
  }

  renderCards(
    list,
    "shipping-list",
    (s) => {
      const st = S(s["현재상태(파싱)"]);
      return `
        <div class="card">
          <div>주문번호: ${S(s.주문번호)}</div>
          <div>고객명: ${S(s.고객명)}</div>
          <div>택배사: ${S(s.택배사) || "-"}</div>
          <div>트래킹번호: ${S(s.트래킹번호) || "-"}</div>
          <div class="${
            st.includes("배송지연") || S(s.배송지연).includes("Y")
              ? "danger-text"
              : ""
          }">현재상태: ${st || "-"}</div>
          <div>마지막업데이트: ${S(s.마지막업데이트) || "-"}</div>
          ${
            S(s.상세링크)
              ? `<a href="${S(s.상세링크)}" target="_blank">상세보기</a>`
              : ""
          }
        </div>
      `;
    },
    "shipping-empty"
  );
}

// 대시보드 통계
function renderStats() {
  const today = new Date();

  const todayOrders = ORDERS.filter((o) => {
    const d = parseDateFromRow(o);
    return d ? isSameDay(d, today) : false;
  });

  const todaySales = todayOrders.reduce(
    (sum, o) => sum + N(o["결제금액(KRW)"] || o["금액"]),
    0
  );

  const shippingCount = SHIPPINGS.filter((s) =>
    S(s["현재상태(파싱)"]).includes("배송중")
  ).length;
  const delayedCount = SHIPPINGS.filter(
    (s) =>
      S(s["현재상태(파싱)"]).includes("배송지연") ||
      S(s.배송지연).includes("Y")
  ).length;

  document.getElementById("stat-today-orders").textContent =
    todayOrders.length.toLocaleString();
  document.getElementById("stat-today-sales").textContent =
    todaySales.toLocaleString();
  document.getElementById("stat-shipping").textContent =
    shippingCount.toLocaleString();
  document.getElementById("stat-delayed").textContent =
    delayedCount.toLocaleString();

  const lu = document.getElementById("last-updated");
  if (lu) lu.textContent = `Last updated: ${today.toLocaleString()}`;
}

// 전체 새로고침(3개 시트 동시 로드)
async function refreshAll() {
  try {
    const [p, o, s] = await Promise.all([
      loadSheet("Product_DB"),
      loadSheet("Order_DB"),
      loadSheet("Shipping_DB"),
    ]);

    PRODUCTS = p;
    ORDERS = o;
    SHIPPINGS = s;

    renderProducts();
    renderOrders();
    renderShipping();
    renderStats();
  } catch (err) {
    console.error(err);
    alert("시트 데이터를 불러오지 못했어. WebApp 공개/시트명/권한 확인 필요.");
  }
}

// 이벤트 연결
function wireEvents() {
  document.getElementById("refresh-btn")?.addEventListener("click", refreshAll);

  document
    .getElementById("product-sort")
    ?.addEventListener("change", renderProducts);

  document
    .getElementById("order-filter")
    ?.addEventListener("change", renderOrders);

  document
    .getElementById("shipping-filter")
    ?.addEventListener("change", renderShipping);

  document.getElementById("global-search")?.addEventListener("input", () => {
    renderOrders();
    renderShipping();
  });
}

// 시작
(async function init() {
  wireEvents();
  await refreshAll();

  // 60초마다 자동 갱신
  setInterval(refreshAll, 60000);
})();
